"""
Capture the Flag Environment für Multi-Agent RL.
2v2 Teams konkurrieren um Flaggen zu erobern.
"""

import numpy as np
from gymnasium import spaces
from pettingzoo import ParallelEnv
from typing import Dict, Optional
import functools


class CaptureTheFlagEnv(ParallelEnv):
    """
    Capture the Flag - 2v2 Multi-Agent Environment

    Spielfeld: 24x24 Grid
    - Blue Base: Links (x: 0-4)
    - Red Base: Rechts (x: 20-24)
    - Flaggen starten in der jeweiligen Base-Mitte
    """

    metadata = {
        "name": "capture_the_flag_v1",
        "render_modes": ["human", "rgb_array"],
    }

    def __init__(
        self,
        grid_size: int = 24,
        max_steps: int = 500,
        win_score: int = 3,
        stun_duration: int = 40,      # 1.5 Sek bei 20 FPS
        tackle_cooldown: int = 50,    # 5 Sek
        tackle_range: float = 2.0,
        carrier_speed_penalty: float = 0.3,
        render_mode: Optional[str] = None,
    ):
        super().__init__()

        self.grid_size = grid_size
        self.max_steps = max_steps
        self.win_score = win_score
        self.stun_duration = stun_duration
        self.tackle_cooldown = tackle_cooldown
        self.tackle_range = tackle_range
        self.carrier_speed_penalty = carrier_speed_penalty
        self.render_mode = render_mode

        # Statische Wände (Rechtecke) blockieren direkte Wege
        # Layout: "Die Arena" - Taktische Map mit Deckung und Flanken-Möglichkeiten
        self.walls = [
            # --- ZENTRUM (Sichtschutz) ---
            # Vier Säulen, die einen "Platz" in der Mitte bilden
            {"x_min": 10, "x_max": 11, "y_min": 10, "y_max": 11},
            {"x_min": 13, "x_max": 14, "y_min": 10, "y_max": 11},
            {"x_min": 10, "x_max": 11, "y_min": 13, "y_max": 14},
            {"x_min": 13, "x_max": 14, "y_min": 13, "y_max": 14},

            # --- BLUE DEFENSE (Links) ---
            # Ein "Bunker" oben und unten zum Verstecken
            {"x_min": 5, "x_max": 7, "y_min": 4, "y_max": 5},   # Unten
            {"x_min": 5, "x_max": 7, "y_min": 19, "y_max": 20}, # Oben

            # --- RED DEFENSE (Rechts - Gespiegelt) ---
            {"x_min": 17, "x_max": 19, "y_min": 4, "y_max": 5},   # Unten
            {"x_min": 17, "x_max": 19, "y_min": 19, "y_max": 20}, # Oben
        ]

        # Teams
        self.blue_agents = ["blue_0", "blue_1"]
        self.red_agents = ["red_0", "red_1"]
        self.possible_agents = self.blue_agents + self.red_agents

        # Basen (Rechtecke)
        self.bases = {
            "blue": {"x_min": 0, "x_max": 4, "y_min": 8, "y_max": 16},
            "red": {"x_min": 20, "x_max": 24, "y_min": 8, "y_max": 16},
        }

        # Flaggen-Startpositionen
        self.flag_spawns = {
            "blue": np.array([2.0, 12.0]),
            "red": np.array([22.0, 12.0]),
        }

        # Für Replay & Analytics
        self.episode_history = []
        self.episode_stats = {}

    @functools.lru_cache(maxsize=None)
    def observation_space(self, agent: str) -> spaces.Space:
        """
        Erweiterte Observation (31 Werte):
        - Eigene Info (5): x, y, has_flag, is_stunned, cooldown
        - Vektor zur eigenen Base (2): dx, dy
        - Vektor zur gegnerischen Flagge (2): dx, dy
        - Vektor zur eigenen Flagge (2): dx, dy
        - Teammate Info (4): dx, dy, has_flag, is_stunned
        - Gegner 1 (nächster) (4): dx, dy, has_flag, is_stunned
        - Gegner 2 (entfernter) (4): dx, dy, has_flag, is_stunned
        - Flaggen Status (2): enemy_flag_at_base, own_flag_at_base
        - Map Grenzen (4): Distanz zu Wänden (oben, unten, links, rechts)
        - Scores (2): own, enemy
        """
        return spaces.Box(low=-1.0, high=2.0, shape=(31,), dtype=np.float32)

    @functools.lru_cache(maxsize=None)
    def action_space(self, agent: str) -> spaces.Space:
        """
        Aktionen:
        0: hoch, 1: runter, 2: links, 3: rechts
        4: nichts tun
        5: tackle (stun in Reichweite)
        """
        return spaces.Discrete(6)

    def reset(self, seed: Optional[int] = None, options: Optional[dict] = None):
        """Environment zurücksetzen."""
        # --- NEU: Das letzte Spiel sichern bevor wir löschen ---
        if hasattr(self, "episode_history") and len(self.episode_history) > 0:
            # Wir speichern direkt das fertige JSON-Objekt
            self.last_replay = self.get_replay_data()
        # -------------------------------------------------------

        if seed is not None:
            np.random.seed(seed)

        self.agents = self.possible_agents.copy()
        self.current_step = 0

        # Episode Tracking
        self.episode_history = []
        self.episode_stats = {
            "blue_captures": 0,
            "red_captures": 0,
            "blue_stuns": 0,
            "red_stuns": 0,
            "blue_flag_pickups": 0,
            "red_flag_pickups": 0,
            "total_steps": 0,
        }

        # Scores
        self.scores = {"blue": 0, "red": 0}

        # Agent States
        self.agent_states = {}

        # --- Startpositionen zufällig in eigener Hälfte ---
        def get_random_start_pos(team: str) -> np.ndarray:
            """Findet eine zufällige, freie Position in der Team-Hälfte."""
            # Grid ist 24x24.
            # Blue Zone: X = 1 bis 9 (Links)
            # Red Zone:  X = 15 bis 23 (Rechts)
            # Y = 1 bis 23 (Höhe)

            x_min, x_max = (1.0, 9.0) if team == "blue" else (15.0, 23.0)

            for _ in range(100): # Sicherheitsschleife
                x = np.random.uniform(x_min, x_max)
                y = np.random.uniform(1.0, self.grid_size - 1.0)
                pos = np.array([x, y])

                # WICHTIG: Prüfen, ob wir versehentlich in einer Wand spawnen
                if not self._is_in_wall(pos):
                    return pos

            # Fallback (sollte eigentlich nie passieren)
            return np.array([3.0, 12.0]) if team == "blue" else np.array([21.0, 12.0])

        # Blue Team - linke Seite (Random)
        self.agent_states["blue_0"] = {
            "position": get_random_start_pos("blue"),
            "has_flag": False,
            "is_stunned": False,
            "stun_timer": 0,
            "tackle_cooldown": 0,
            "team": "blue",
        }
        self.agent_states["blue_1"] = {
            "position": get_random_start_pos("blue"),
            "has_flag": False,
            "is_stunned": False,
            "stun_timer": 0,
            "tackle_cooldown": 0,
            "team": "blue",
        }

        # Red Team - rechte Seite (Random)
        self.agent_states["red_0"] = {
            "position": get_random_start_pos("red"),
            "has_flag": False,
            "is_stunned": False,
            "stun_timer": 0,
            "tackle_cooldown": 0,
            "team": "red",
        }
        self.agent_states["red_1"] = {
            "position": get_random_start_pos("red"),
            "has_flag": False,
            "is_stunned": False,
            "stun_timer": 0,
            "tackle_cooldown": 0,
            "team": "red",
        }

        # Flaggen
        self.flags = {
            "blue": {
                "position": self.flag_spawns["blue"].copy(),
                "carried_by": None,
                "at_base": True,
            },
            "red": {
                "position": self.flag_spawns["red"].copy(),
                "carried_by": None,
                "at_base": True,
            },
        }

        # Ersten Frame speichern
        self._save_frame()

        observations = {agent: self._get_observation(agent) for agent in self.agents}
        infos = {agent: {} for agent in self.agents}

        return observations, infos

    def step(self, actions: Dict[str, int]):
        """Einen Schritt ausführen."""
        self.current_step += 1
        rewards = {agent: 0.0 for agent in self.agents}

        # --- NEU: Distanzen VOR der Bewegung merken ---
        prev_dists = {}
        for agent in self.agents:
            state = self.agent_states[agent]
            team = state["team"]
            enemy_team = "red" if team == "blue" else "blue"

            # Ziel bestimmen
            if state["has_flag"]:
                # Ziel: Eigene Base
                target = np.array([2.0, 12.0]) if team == "blue" else np.array([22.0, 12.0])
            else:
                # Ziel: Gegnerische Flagge
                target = self.flags[enemy_team]["position"]

            prev_dists[agent] = np.linalg.norm(state["position"] - target)
        # ---------------------------------------------

        # 1. Timer updaten (Stun, Cooldowns)
        self._update_timers()

        # 2. Aktionen ausführen
        for agent, action in actions.items():
            agent_reward = self._execute_action(agent, action)
            rewards[agent] += agent_reward

        # 3. Flaggen-Logik
        flag_rewards = self._process_flags()
        for agent, reward in flag_rewards.items():
            rewards[agent] += reward

        # --- NEU: Distance Reward (Heiß/Kalt) ---
        for agent in self.agents:
            state = self.agent_states[agent]
            team = state["team"]
            enemy_team = "red" if team == "blue" else "blue"

            # Ziel wieder bestimmen (Status könnte sich geändert haben!)
            if state["has_flag"]:
                target = np.array([2.0, 12.0]) if team == "blue" else np.array([22.0, 12.0])
                scale = 0.5  # Bonus fürs Heimtragen
            else:
                target = self.flags[enemy_team]["position"]
                scale = 0.1  # Kleinerer Bonus fürs Hinlaufen

            new_dist = np.linalg.norm(state["position"] - target)

            # Belohnung für Verbesserung (alte Distanz - neue Distanz)
            # Positiv, wenn wir näher kommen. Negativ, wenn wir weggehen.
            dist_reward = (prev_dists[agent] - new_dist) * scale
            rewards[agent] += dist_reward
        # ----------------------------------------

        # 4. Team-basierte Rewards verteilen
        rewards = self._distribute_team_rewards(rewards)

        # 5. Kleine Zeitstrafe
        for agent in self.agents:
            rewards[agent] -= 0.01

        # 6. Gewinn-Check
        game_over = False
        if self.scores["blue"] >= self.win_score:
            for agent in self.blue_agents:
                rewards[agent] += 100
            for agent in self.red_agents:
                rewards[agent] -= 50
            game_over = True
        elif self.scores["red"] >= self.win_score:
            for agent in self.red_agents:
                rewards[agent] += 100
            for agent in self.blue_agents:
                rewards[agent] -= 50
            game_over = True

        # 7. Zeit abgelaufen?
        if self.current_step >= self.max_steps:
            game_over = True
            # Bonus für führendes Team
            if self.scores["blue"] > self.scores["red"]:
                for agent in self.blue_agents:
                    rewards[agent] += 20
            elif self.scores["red"] > self.scores["blue"]:
                for agent in self.red_agents:
                    rewards[agent] += 20

        # 8. Frame speichern
        self._save_frame()

        # Stats updaten
        self.episode_stats["total_steps"] = self.current_step

        terminated = game_over
        terminations = {agent: terminated for agent in self.agents}
        truncations = {agent: False for agent in self.agents}

        observations = {agent: self._get_observation(agent) for agent in self.agents}
        infos = {agent: {"scores": self.scores.copy()} for agent in self.agents}

        if terminated:
            self.agents = []

        return observations, rewards, terminations, truncations, infos

    def _update_timers(self):
        """Stun-Timer und Cooldowns updaten."""
        for agent in self.possible_agents:
            state = self.agent_states[agent]

            # Stun Timer
            if state["stun_timer"] > 0:
                state["stun_timer"] -= 1
                if state["stun_timer"] <= 0:
                    state["is_stunned"] = False

            # Tackle Cooldown
            if state["tackle_cooldown"] > 0:
                state["tackle_cooldown"] -= 1

    def _execute_action(self, agent: str, action: int) -> float:
        """Aktion ausführen, Reward zurückgeben."""
        state = self.agent_states[agent]
        reward = 0.0

        # Gestunnte Agenten können nichts tun
        if state["is_stunned"]:
            return 0.0

        # Bewegungsgeschwindigkeit
        speed = 0.4
        if state["has_flag"]:
            speed *= (1 - self.carrier_speed_penalty)

        pos = state["position"]
        new_pos = pos.copy()

        # Bewegung
        if action == 0:  # hoch
            new_pos[1] = min(new_pos[1] + speed, self.grid_size - 1)
        elif action == 1:  # runter
            new_pos[1] = max(new_pos[1] - speed, 0)
        elif action == 2:  # links
            new_pos[0] = max(new_pos[0] - speed, 0)
        elif action == 3:  # rechts
            new_pos[0] = min(new_pos[0] + speed, self.grid_size - 1)
        elif action == 4:  # nichts
            pass
        elif action == 5:  # tackle
            reward += self._execute_tackle(agent)

        # Kollisionsabfrage mit Wänden
        # Prüfe sowohl, ob die neue Position in einer Wand ist,
        # als auch ob der Bewegungspfad eine Wand kreuzt
        if not self._is_in_wall(new_pos) and self._check_line_of_sight(pos, new_pos):
            pos[:] = new_pos

        # Flagge mitbewegen wenn getragen
        if state["has_flag"]:
            flag_team = "red" if state["team"] == "blue" else "blue"
            self.flags[flag_team]["position"] = pos.copy()

        return reward

    def _execute_tackle(self, agent: str) -> float:
        """Tackle ausführen mit taktischer Bewertung."""
        state = self.agent_states[agent]

        # Cooldown check
        if state["tackle_cooldown"] > 0:
            return 0.0

        # 1. Basis-Kosten für den Versuch (Energieverbrauch)
        # Verhindert, dass sie die Taste einfach gedrückt halten ("Spammen")
        reward = -0.2

        # Cooldown setzen
        state["tackle_cooldown"] = self.tackle_cooldown

        # Gegner in Reichweite finden
        enemies = self.red_agents if state["team"] == "blue" else self.blue_agents

        # Positionen für Kontext-Check
        my_team = state["team"]
        enemy_team = "red" if my_team == "blue" else "blue"
        enemy_flag_pos = self.flags[enemy_team]["position"]

        for enemy in enemies:
            enemy_state = self.agent_states[enemy]
            dist = np.linalg.norm(state["position"] - enemy_state["position"])

            # Treffer-Check
            if dist <= self.tackle_range and self._check_line_of_sight(
                state["position"], enemy_state["position"]
            ):
                # Stun erfolgreich!
                enemy_state["is_stunned"] = True
                enemy_state["stun_timer"] = self.stun_duration

                # --- TAKTISCHE ANALYSE ---

                # Fall A: "Clutch Play" - Gegner hat unsere Flagge!
                if enemy_state["has_flag"]:
                    reward += 15.0
                    enemy_state["has_flag"] = False

                    # Flagge bestimmen
                    dropped_flag = "red" if my_team == "blue" else "blue"

                    # --- NEU: BOUNCE MECHANIK ---
                    # 1. Vektor vom Tackler (Ich) zum Opfer (Gegner) berechnen
                    bounce_vec = enemy_state["position"] - state["position"]

                    # 2. Vektor normalisieren (auf Länge 1 bringen)
                    norm = np.linalg.norm(bounce_vec)
                    if norm > 0:
                        bounce_vec = bounce_vec / norm

                    # 3. Zielposition berechnen (2 Blöcke in Stoßrichtung)
                    bounce_dist = 2.0
                    new_flag_pos = enemy_state["position"] + (bounce_vec * bounce_dist)

                    # 4. Begrenzen auf Spielfeld (Clamping), damit sie nicht rausfliegt
                    new_flag_pos[0] = np.clip(new_flag_pos[0], 0, self.grid_size - 1)
                    new_flag_pos[1] = np.clip(new_flag_pos[1], 0, self.grid_size - 1)

                    # 5. Wand-Check: Wenn sie in einer Wand landen würde, bleibt sie beim Opfer
                    if not self._is_in_wall(new_flag_pos):
                        self.flags[dropped_flag]["position"] = new_flag_pos
                    else:
                        self.flags[dropped_flag]["position"] = enemy_state["position"].copy()

                    # Status updaten
                    self.flags[dropped_flag]["carried_by"] = None
                    self.flags[dropped_flag]["at_base"] = False
                    # ----------------------------

                    # Stats updaten
                    if my_team == "blue":
                        self.episode_stats["blue_stuns"] += 1
                    else:
                        self.episode_stats["red_stuns"] += 1

                # Fall B: "Defense" - Gegner ist in unserer Base (Einbrecher)
                elif self._is_in_base(enemy_state["position"], my_team):
                    reward += 5.0
                    if my_team == "blue":
                        self.episode_stats["blue_stuns"] += 1
                    else:
                        self.episode_stats["red_stuns"] += 1

                # Fall C: "Offense / Clearing" - Gegner campt an der Flagge, die wir wollen
                # (Wir schlagen ihn weg, um die Flagge zu nehmen -> SEHR GUTE TAKTIK)
                elif np.linalg.norm(enemy_state["position"] - enemy_flag_pos) < 4.0:
                    reward += 5.0
                    if my_team == "blue":
                        self.episode_stats["blue_stuns"] += 1
                    else:
                        self.episode_stats["red_stuns"] += 1

                # Fall D: "Bullying" - Mitten auf dem Feld ohne Grund
                else:
                    # KEIN Reward. Durch die Kosten von -0.2 lernt der Agent:
                    # "Das war Energieverschwendung."
                    pass

                break  # Nur ein Treffer pro Action

        return reward

    def _process_flags(self) -> Dict[str, float]:
        """Flaggen-Aufnahme, -Abgabe und -Reset."""
        rewards = {agent: 0.0 for agent in self.possible_agents}

        for agent in self.possible_agents:
            state = self.agent_states[agent]
            if state["is_stunned"]:
                continue

            pos = state["position"]
            team = state["team"]
            enemy_team = "red" if team == "blue" else "blue"

            # 1. Gegnerische Flagge aufnehmen
            enemy_flag = self.flags[enemy_team]
            if not state["has_flag"] and enemy_flag["carried_by"] is None:
                dist_to_flag = np.linalg.norm(pos - enemy_flag["position"])
                if dist_to_flag < 2.0:  # Vergrößerter Pickup-Radius (war 1.0)
                    state["has_flag"] = True
                    enemy_flag["carried_by"] = agent
                    enemy_flag["at_base"] = False
                    rewards[agent] += 5.0

                    if team == "blue":
                        self.episode_stats["blue_flag_pickups"] += 1
                    else:
                        self.episode_stats["red_flag_pickups"] += 1

            # 2. Flagge in eigene Base bringen = CAPTURE!
            if state["has_flag"] and self._is_in_base(pos, team):
                # CAPTURE!
                self.scores[team] += 1
                rewards[agent] += 50.0

                if team == "blue":
                    self.episode_stats["blue_captures"] += 1
                else:
                    self.episode_stats["red_captures"] += 1

                # Flagge zurücksetzen
                state["has_flag"] = False
                enemy_flag["position"] = self.flag_spawns[enemy_team].copy()
                enemy_flag["carried_by"] = None
                enemy_flag["at_base"] = True

            # 3. Eigene Flagge zurücksetzen (wenn am Boden)
            own_flag = self.flags[team]
            if not own_flag["at_base"] and own_flag["carried_by"] is None:
                dist_to_own_flag = np.linalg.norm(pos - own_flag["position"])
                if dist_to_own_flag < 2.0:  # Vergrößerter Pickup-Radius (war 1.0)
                    # Flagge zurück zur Base!
                    own_flag["position"] = self.flag_spawns[team].copy()
                    own_flag["at_base"] = True
                    rewards[agent] += 8.0

        return rewards

    def _distribute_team_rewards(self, rewards: Dict[str, float]) -> Dict[str, float]:
        """Team-Rewards verteilen (Captures zählen für alle)."""
        blue_total = sum(rewards[a] for a in self.blue_agents)
        red_total = sum(rewards[a] for a in self.red_agents)

        # Wenn ein Teammate einen großen Reward bekommt, bekommt der andere einen Teil
        for agent in self.blue_agents:
            team_bonus = (blue_total - rewards[agent]) * 0.3
            rewards[agent] += team_bonus

        for agent in self.red_agents:
            team_bonus = (red_total - rewards[agent]) * 0.3
            rewards[agent] += team_bonus

        return rewards

    def _is_in_base(self, position: np.ndarray, team: str) -> bool:
        """Prüfen ob Position in einer Base ist."""
        base = self.bases[team]
        return (base["x_min"] <= position[0] <= base["x_max"] and
                base["y_min"] <= position[1] <= base["y_max"])

    def _is_in_wall(self, position: np.ndarray) -> bool:
        """Prüfen ob eine Position in einer Wand liegt."""
        for wall in self.walls:
            if (wall["x_min"] <= position[0] <= wall["x_max"] and
                    wall["y_min"] <= position[1] <= wall["y_max"]):
                return True
        return False

    def _check_line_of_sight(self, pos1: np.ndarray, pos2: np.ndarray) -> bool:
        """Line-of-sight mit linearer Abtastung: True, wenn keine Wand dazwischen liegt."""
        samples = 25
        for t in np.linspace(0, 1, samples):
            # Skip the exact endpoints to avoid false positives on current tile
            if t in (0, 1):
                continue
            sample = pos1 + t * (pos2 - pos1)
            if self._is_in_wall(sample):
                return False
        return True

    def _get_observation(self, agent: str) -> np.ndarray:
        """Observation für einen Agenten mit relativen Vektoren."""
        state = self.agent_states[agent]
        pos = state["position"]
        team = state["team"]
        enemy_team = "red" if team == "blue" else "blue"

        # Hilfsfunktion für relative Vektoren (normiert auf Grid-Größe)
        def get_vec(target_pos, my_pos):
            return (target_pos - my_pos) / self.grid_size

        obs = []

        # 1. Eigene Info (5)
        obs.extend(pos / self.grid_size)  # Absolute Pos (hilft bei Wänden)
        obs.append(1.0 if state["has_flag"] else 0.0)
        obs.append(1.0 if state["is_stunned"] else 0.0)
        obs.append(state["tackle_cooldown"] / self.tackle_cooldown)

        # 2. Vektor zur eigenen Base (Wo muss ich hin zum Abgeben?) (2)
        base_center = np.array([2.0, 12.0]) if team == "blue" else np.array([22.0, 12.0])
        obs.extend(get_vec(base_center, pos))

        # 3. Vektoren zu Flaggen (2+2)
        enemy_flag = self.flags[enemy_team]
        own_flag = self.flags[team]
        obs.extend(get_vec(enemy_flag["position"], pos))  # Wo ist das Ziel?
        obs.extend(get_vec(own_flag["position"], pos))    # Wo ist meine Flagge (Verteidigung)?

        # 4. Teammate (relativ) (4)
        teammates = [a for a in (self.blue_agents if team == "blue" else self.red_agents) if a != agent]
        if teammates:
            tm = teammates[0]
            tm_state = self.agent_states[tm]
            obs.extend(get_vec(tm_state["position"], pos))
            obs.append(1.0 if tm_state["has_flag"] else 0.0)
            obs.append(1.0 if tm_state["is_stunned"] else 0.0)
        else:
            obs.extend([0, 0, 0, 0])  # Fallback

        # 5. Gegner (relativ & sortiert nach Nähe!) (4+4)
        enemies = self.red_agents if team == "blue" else self.blue_agents
        # Liste von (Distanz, Agent-ID) erstellen
        enemy_list = []
        for e in enemies:
            e_pos = self.agent_states[e]["position"]
            dist = np.linalg.norm(e_pos - pos)
            enemy_list.append((dist, e))

        # Sortieren: Nächster Gegner zuerst
        enemy_list.sort(key=lambda x: x[0])

        for _, e_agent in enemy_list:
            e_state = self.agent_states[e_agent]
            obs.extend(get_vec(e_state["position"], pos))
            obs.append(1.0 if e_state["has_flag"] else 0.0)
            obs.append(1.0 if e_state["is_stunned"] else 0.0)

        # 6. Globaler Status (2)
        obs.append(1.0 if enemy_flag["at_base"] else 0.0)
        obs.append(1.0 if own_flag["at_base"] else 0.0)

        # 7. Wände/Rand Wahrnehmung (4) - Bin ich am Rand?
        # Abstand zu 0, 0, Grid, Grid
        obs.append(pos[1] / self.grid_size)  # Abstand unten
        obs.append((self.grid_size - pos[1]) / self.grid_size)  # Abstand oben
        obs.append(pos[0] / self.grid_size)  # Abstand links
        obs.append((self.grid_size - pos[0]) / self.grid_size)  # Abstand rechts

        # 8. Scores (2)
        obs.append(self.scores[team] / self.win_score)
        obs.append(self.scores[enemy_team] / self.win_score)

        return np.array(obs, dtype=np.float32)

    def _save_frame(self):
        """Frame für Replay speichern."""
        frame = {
            "step": self.current_step,
            "agents": {},
            "flags": {},
            "scores": self.scores.copy(),
        }

        for agent in self.possible_agents:
            state = self.agent_states[agent]
            frame["agents"][agent] = {
                "position": state["position"].tolist(),
                "team": state["team"],
                "has_flag": state["has_flag"],
                "is_stunned": state["is_stunned"],
                "tackle_cooldown": state["tackle_cooldown"],
            }

        for team in ["blue", "red"]:
            flag = self.flags[team]
            frame["flags"][team] = {
                "position": flag["position"].tolist(),
                "carried_by": flag["carried_by"],
                "at_base": flag["at_base"],
            }

        self.episode_history.append(frame)

    def get_replay_data(self) -> dict:
        """Replay-Daten für Export."""
        return {
            "metadata": {
                "grid_size": self.grid_size,
                "max_steps": self.max_steps,
                "win_score": self.win_score,
                "tackle_cooldown": self.tackle_cooldown,
                "final_scores": self.scores.copy(),
                "episode_stats": self.episode_stats.copy(),
                "walls": self.walls,  # NEU: Map-Layout für Visualisierung
            },
            "frames": self.episode_history,
        }

    def render(self):
        """Text-Visualisierung."""
        if self.render_mode != "human":
            return

        print(f"\n=== Step {self.current_step} ===")
        print(f"Score: Blue {self.scores['blue']} - {self.scores['red']} Red")

        for agent in self.possible_agents:
            state = self.agent_states[agent]
            status = ""
            if state["is_stunned"]:
                status = "💫 STUNNED"
            elif state["has_flag"]:
                status = "🚩 HAS FLAG"
            pos = state["position"]
            print(f"  {agent}: ({pos[0]:.1f}, {pos[1]:.1f}) {status}")


# Test
if __name__ == "__main__":
    env = CaptureTheFlagEnv(render_mode="human")
    obs, info = env.reset(seed=42)

    print("✅ Environment erstellt!")
    print(f"Agents: {env.possible_agents}")
    print(f"Observation shape: {env.observation_space('blue_0').shape}")
    print(f"Action space: {env.action_space('blue_0')}")

    # Paar Schritte testen
    for _ in range(20):
        actions = {agent: env.action_space(agent).sample() for agent in env.agents}
        obs, rewards, terms, truncs, infos = env.step(actions)
        env.render()

        if all(terms.values()):
            break

    print("\n✅ Test erfolgreich!")
