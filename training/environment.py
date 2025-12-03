"""
Capture the Flag Environment für Multi-Agent RL.
2v2 Teams konkurrieren um Flaggen zu erobern.

SPIELREGELN (Klassisches CTF):
1. Sammle die gegnerische Flagge und bringe sie zu deiner Base
2. Du kannst nur scoren wenn DEINE Flagge in deiner Base ist!
3. Tackle Gegner um sie zu stoppen und Flaggen zu droppen
4. Verteidige deine Flagge und bringe sie zurück wenn gestohlen

WICHTIG: Alle Konfigurationswerte (Rewards, Walls, etc.) werden aus config.py importiert!
"""

import numpy as np
from gymnasium import spaces
from pettingzoo import ParallelEnv
from typing import Dict, Optional, List
import functools

# Import configuration from central config file (Single Source of Truth!)
from config import REWARD_PROFILES, WALLS


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
        stun_duration: int = 20,      # ~1 Sek bei 20 FPS (reduziert von 40)
        tackle_cooldown: int = 65,    # ~3.25 Sek (erhöht von 50)
        tackle_range: float = 2.0,
        carrier_speed_penalty: float = 0.3,
        render_mode: Optional[str] = None,
        reward_profile: str = "balanced",  # NEW: "micromanager", "sparse", or "balanced"
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

        # Reward Profile laden
        if reward_profile not in REWARD_PROFILES:
            raise ValueError(f"Unknown reward profile: {reward_profile}. Choose from: {list(REWARD_PROFILES.keys())}")
        self.reward_profile = REWARD_PROFILES[reward_profile]
        self.reward_profile_name = reward_profile

        # Wände (importiert aus config.py - Single Source of Truth!)
        self.walls = WALLS

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

    # ========== HILFSFUNKTIONEN ==========

    @staticmethod
    def _get_enemy_team(team: str) -> str:
        """Gibt das gegnerische Team zurück."""
        return "red" if team == "blue" else "blue"

    def _get_base_center(self, team: str) -> np.ndarray:
        """Gibt die Mitte der Base eines Teams zurück."""
        return self.flag_spawns[team].copy()

    def _get_team_agents(self, team: str) -> List[str]:
        """Gibt die Agenten eines Teams zurück."""
        return self.blue_agents if team == "blue" else self.red_agents

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

    def _clamp_position(self, position: np.ndarray) -> np.ndarray:
        """Begrenzt Position auf Spielfeld."""
        return np.array([
            np.clip(position[0], 0, self.grid_size - 1),
            np.clip(position[1], 0, self.grid_size - 1)
        ])

    def _drop_flag_safely(self, flag_team: str, drop_position: np.ndarray,
                         tackler_pos: np.ndarray, victim_pos: np.ndarray) -> None:
        """
        Lässt eine Flagge sicher fallen (mit Bounce-Mechanik).

        Logik:
        1. Berechne Bounce-Position (2 Blöcke von Tackler weg)
        2. Validiere Position (nicht in Wand, nicht in gegnerischer Base)
        3. Falls ungültig: Versuche Midpoint
        4. Falls auch ungültig: Reset zur Spawn-Position
        """
        enemy_of_flag = self._get_enemy_team(flag_team)

        # 1. Bounce-Vektor berechnen (von Tackler zu Opfer)
        bounce_vec = victim_pos - tackler_pos
        norm = np.linalg.norm(bounce_vec)
        if norm > 0:
            bounce_vec = bounce_vec / norm
        else:
            # Fallback: Kein Vektor möglich, direkt zu Spawn
            self._reset_flag_to_spawn(flag_team)
            return

        # 2. Bounce-Position berechnen (2 Blöcke in Stoßrichtung)
        bounce_dist = 2.0
        bounce_pos = victim_pos + (bounce_vec * bounce_dist)
        bounce_pos = self._clamp_position(bounce_pos)

        # 3. Validierung: Nicht in gegnerischer Base (würde sofortigen Capture ermöglichen)
        if self._is_in_base(bounce_pos, enemy_of_flag):
            # Flagge würde in gegnerischer Base landen → Reset!
            self._reset_flag_to_spawn(flag_team)
            return

        # 4. Validierung: Nicht in Wand
        if not self._is_in_wall(bounce_pos):
            # Position ist gut!
            self.flags[flag_team]["position"] = bounce_pos
            self.flags[flag_team]["at_base"] = False
            self.flags[flag_team]["carried_by"] = None
            return

        # 5. Fallback 1: Midpoint zwischen Tackler und Opfer
        midpoint = (tackler_pos + victim_pos) / 2.0
        if (not self._is_in_wall(midpoint) and
            not self._is_in_base(midpoint, enemy_of_flag)):
            self.flags[flag_team]["position"] = midpoint
            self.flags[flag_team]["at_base"] = False
            self.flags[flag_team]["carried_by"] = None
            return

        # 6. Fallback 2: Zurück zur Spawn (sicherste Option)
        self._reset_flag_to_spawn(flag_team)

    def _reset_flag_to_spawn(self, flag_team: str) -> None:
        """Setzt eine Flagge zur Spawn-Position zurück."""
        self.flags[flag_team]["position"] = self.flag_spawns[flag_team].copy()
        self.flags[flag_team]["at_base"] = True
        self.flags[flag_team]["carried_by"] = None

    # ========== GYMNASIUM API ==========

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
        # Letztes Spiel sichern für Replay
        if hasattr(self, "episode_history") and len(self.episode_history) > 0:
            self.last_replay = self.get_replay_data()

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
            "blue_failed_captures": 0,  # NEU: Capture-Versuche ohne eigene Flagge
            "red_failed_captures": 0,   # NEU
            "total_steps": 0,
        }

        # Scores
        self.scores = {"blue": 0, "red": 0}

        # Agent States
        self.agent_states = {}

        # Startpositionen zufällig in eigener Hälfte
        def get_random_start_pos(team: str) -> np.ndarray:
            """Findet eine zufällige, freie Position in der Team-Hälfte."""
            x_min, x_max = (1.0, 9.0) if team == "blue" else (15.0, 23.0)

            for _ in range(100):  # Sicherheitsschleife
                x = np.random.uniform(x_min, x_max)
                y = np.random.uniform(1.0, self.grid_size - 1.0)
                pos = np.array([x, y])

                if not self._is_in_wall(pos):
                    return pos

            # Fallback
            return np.array([3.0, 12.0]) if team == "blue" else np.array([21.0, 12.0])

        # Blue Team
        for agent in self.blue_agents:
            self.agent_states[agent] = {
                "position": get_random_start_pos("blue"),
                "has_flag": False,
                "is_stunned": False,
                "stun_timer": 0,
                "tackle_cooldown": 0,
                "team": "blue",
            }

        # Red Team
        for agent in self.red_agents:
            self.agent_states[agent] = {
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

        # Distanzen VOR der Bewegung merken (für Distance Shaping)
        prev_dists = self._calculate_prev_distances()

        # 1. Timer updaten (Stun, Cooldowns)
        self._update_timers()

        # 2. Aktionen ausführen
        for agent, action in actions.items():
            agent_reward = self._execute_action(agent, action)
            rewards[agent] += agent_reward

        # 3. Flaggen-Logik (Pickup, Capture, Return)
        flag_rewards = self._process_flags()
        for agent, reward in flag_rewards.items():
            rewards[agent] += reward

        # 4. Distance Shaping - NUR wenn Agent Flagge trägt (Option B)
        distance_rewards = self._calculate_distance_rewards(prev_dists)
        for agent, reward in distance_rewards.items():
            rewards[agent] += reward

        # 5. Team Reward Distribution - ENTFERNT (verzerrt individuelles Lernsignal)
        # rewards = self._distribute_team_rewards(rewards)

        # 6. Step Penalty (profile-dependent, z.B. für "micromanager" anti-idle)
        for agent in self.agents:
            rewards[agent] += self.reward_profile["STEP_PENALTY"]

        # 7. Gewinn-Check
        game_over, win_rewards = self._check_game_end()
        for agent, reward in win_rewards.items():
            rewards[agent] += reward

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

    # ========== STEP LOGIC ==========

    def _calculate_prev_distances(self) -> Dict[str, Dict[str, float]]:
        """Berechnet Distanzen zum Ziel VOR der Bewegung (inkl. has_flag Status und Ziel)."""
        prev_dists = {}
        for agent in self.agents:
            state = self.agent_states[agent]
            target = self._get_agent_target(agent)
            prev_dists[agent] = {
                "target": target.copy(),  # Ziel speichern (verhindert falsche Rewards bei Zielwechsel)
                "distance": np.linalg.norm(state["position"] - target),
                "has_flag": state["has_flag"]  # Status merken
            }
        return prev_dists

    def _get_agent_target(self, agent: str) -> np.ndarray:
        """
        Gibt das aktuelle Ziel eines Agenten zurück - mit Defense-Logik.

        Prioritäten:
        1. Ich habe die Flagge → zur eigenen Base!
        2. Meine Flagge wurde gestohlen → Jage den Träger!
        3. Meine Flagge liegt am Boden → Hole sie zurück!
        4. Alles sicher → Greife an!
        """
        state = self.agent_states[agent]
        team = state["team"]
        own_flag = self.flags[team]
        enemy_team = self._get_enemy_team(team)

        # 1. Ich habe die Flagge → zur eigenen Base!
        if state["has_flag"]:
            return self._get_base_center(team)

        # 2. Meine Flagge wurde gestohlen → Jage den Träger!
        if own_flag["carried_by"] is not None:
            carrier = own_flag["carried_by"]
            return self.agent_states[carrier]["position"].copy()

        # 3. Meine Flagge liegt am Boden → Hole sie zurück!
        if not own_flag["at_base"]:
            return own_flag["position"].copy()

        # 4. Alles sicher → Greife an!
        return self.flags[enemy_team]["position"].copy()

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

        # Gestunnte Agenten können nichts tun
        if state["is_stunned"]:
            return 0.0

        # Tackle-Aktion
        if action == 5:
            return self._execute_tackle(agent)

        # Bewegung
        speed = 0.4
        if state["has_flag"]:
            speed *= (1 - self.carrier_speed_penalty)

        pos = state["position"]
        new_pos = pos.copy()

        # Richtung berechnen
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

        # Kollisionsabfrage mit Wänden
        if not self._is_in_wall(new_pos) and self._check_line_of_sight(pos, new_pos):
            pos[:] = new_pos

        # Flagge mitbewegen wenn getragen
        if state["has_flag"]:
            enemy_team = self._get_enemy_team(state["team"])
            self.flags[enemy_team]["position"] = pos.copy()

        return 0.0

    def _execute_tackle(self, agent: str) -> float:
        """
        Tackle ausführen.

        REWARD PHILOSOPHY:
        - Flag Carrier Tackle: +TACKLE_FLAG_CARRIER (profile-dependent)
        - Alle anderen Tackles: +TACKLE_ANY (profile-dependent, z.B. für micromanager)
        """
        state = self.agent_states[agent]

        # Cooldown check - kein Penalty, einfach nichts tun
        if state["tackle_cooldown"] > 0:
            return 0.0

        # Kein Basis-Penalty mehr - Agent muss selbst lernen wann Tackles sinnvoll sind
        reward = 0.0

        # Cooldown setzen
        state["tackle_cooldown"] = self.tackle_cooldown

        # Gegner in Reichweite finden
        my_team = state["team"]
        enemy_team = self._get_enemy_team(my_team)
        enemies = self._get_team_agents(enemy_team)

        for enemy in enemies:
            enemy_state = self.agent_states[enemy]
            dist = np.linalg.norm(state["position"] - enemy_state["position"])

            # Treffer-Check (in Reichweite UND Sichtlinie)
            if dist <= self.tackle_range and self._check_line_of_sight(
                state["position"], enemy_state["position"]
            ):
                # Stun erfolgreich!
                enemy_state["is_stunned"] = True
                enemy_state["stun_timer"] = self.stun_duration

                # REWARD: Flaggenträger tacklen (höher) oder normaler Tackle
                if enemy_state["has_flag"]:
                    reward += self.reward_profile["TACKLE_FLAG_CARRIER"]
                    enemy_state["has_flag"] = False

                    # Flagge droppen (mit Bounce-Mechanik)
                    dropped_flag_team = my_team  # Unsere Flagge, die er hatte
                    self._drop_flag_safely(
                        dropped_flag_team,
                        enemy_state["position"],
                        state["position"],
                        enemy_state["position"]
                    )

                    # Stats
                    self.episode_stats[f"{my_team}_stuns"] += 1
                else:
                    # Normaler Tackle (z.B. für "micromanager" profile)
                    reward += self.reward_profile["TACKLE_ANY"]

                break  # Nur ein Treffer pro Action

        return reward

    def _process_flags(self) -> Dict[str, float]:
        """
        Flaggen-Aufnahme, -Abgabe und -Reset.

        REWARD PHILOSOPHY:
        - Pickup: +FLAG_PICKUP (profile-dependent)
        - Capture: +CAPTURE (profile-dependent)
        - Return: +FLAG_RETURN (profile-dependent)
        """
        rewards = {agent: 0.0 for agent in self.possible_agents}

        for agent in self.possible_agents:
            state = self.agent_states[agent]
            if state["is_stunned"]:
                continue

            pos = state["position"]
            team = state["team"]
            enemy_team = self._get_enemy_team(team)

            # 1. Gegnerische Flagge aufnehmen
            enemy_flag = self.flags[enemy_team]
            if not state["has_flag"] and enemy_flag["carried_by"] is None:
                dist_to_flag = np.linalg.norm(pos - enemy_flag["position"])
                if dist_to_flag < 2.0:  # Pickup-Radius
                    state["has_flag"] = True
                    enemy_flag["carried_by"] = agent
                    enemy_flag["at_base"] = False
                    self.episode_stats[f"{team}_flag_pickups"] += 1
                    # REWARD für Pickup (z.B. für "micromanager")
                    rewards[agent] += self.reward_profile["FLAG_PICKUP"]

            # 2. Flagge in eigene Base bringen = CAPTURE
            if state["has_flag"] and self._is_in_base(pos, team):
                own_flag = self.flags[team]

                # KLASSISCHE CTF-REGEL: Capture nur wenn eigene Flagge sicher ist!
                if own_flag["at_base"]:
                    # === CAPTURE ERFOLGREICH! ===
                    self.scores[team] += 1
                    rewards[agent] += self.reward_profile["CAPTURE"]
                    self.episode_stats[f"{team}_captures"] += 1

                    # Flagge zurücksetzen
                    state["has_flag"] = False
                    self._reset_flag_to_spawn(enemy_team)
                else:
                    # CAPTURE FEHLGESCHLAGEN - Eigene Flagge ist weg!
                    self.episode_stats[f"{team}_failed_captures"] += 1

            # 3. Eigene Flagge zurücksetzen (wenn am Boden)
            own_flag = self.flags[team]
            if not own_flag["at_base"] and own_flag["carried_by"] is None:
                dist_to_own_flag = np.linalg.norm(pos - own_flag["position"])
                if dist_to_own_flag < 2.0:  # Return-Radius
                    # Flagge zurück zur Base!
                    self._reset_flag_to_spawn(team)
                    rewards[agent] += self.reward_profile["FLAG_RETURN"]

        return rewards

    def _calculate_distance_rewards(self, prev_dists: Dict[str, Dict[str, float]]) -> Dict[str, float]:
        """
        Distance Shaping basierend auf Reward Profile.

        BALANCED/SPARSE: Nur Flaggenträger bekommen Feedback (CARRIER_DISTANCE)
        MICROMANAGER: ALLE Agenten bekommen Distance Rewards basierend auf ihrer Rolle:
          - Hat Flagge → CARRIER_DISTANCE zur Base
          - Eigene Flagge gestohlen → DISTANCE_TO_CARRIER zum Gegner jagen
          - Alles sicher → DISTANCE_TO_FLAG zur gegnerischen Flagge
        """
        rewards = {}

        for agent in self.agents:
            state = self.agent_states[agent]
            team = state["team"]

            # Ziel muss gleich geblieben sein (verhindert falsche Rewards bei Zielwechsel)
            prev_data = prev_dists[agent]
            current_target = self._get_agent_target(agent)

            # Check: Hat sich das Ziel geändert? (z.B. Flagge aufgenommen)
            if not np.allclose(prev_data["target"], current_target, atol=0.5):
                rewards[agent] = 0.0
                continue

            # Check: Hat sich der has_flag Status geändert?
            if prev_data["has_flag"] != state["has_flag"]:
                rewards[agent] = 0.0
                continue

            # Distanz vorher vs. jetzt
            prev_dist = prev_data["distance"]
            current_dist = np.linalg.norm(state["position"] - current_target)
            dist_delta = prev_dist - current_dist

            # Welche Reward Rate verwenden?
            if state["has_flag"]:
                # Flaggenträger → zur Base
                rate = self.reward_profile["CARRIER_DISTANCE"]
            elif self.flags[team]["carried_by"] is not None:
                # Eigene Flagge gestohlen → Carrier jagen
                rate = self.reward_profile["DISTANCE_TO_CARRIER"]
            else:
                # Offense → zur gegnerischen Flagge
                rate = self.reward_profile["DISTANCE_TO_FLAG"]

            shaping_reward = dist_delta * rate
            shaping_reward = np.clip(shaping_reward, -1.0, 1.0)
            rewards[agent] = shaping_reward

        return rewards

    def _distribute_team_rewards(self, rewards: Dict[str, float]) -> Dict[str, float]:
        """Team-Rewards verteilen (Captures zählen für alle)."""
        blue_total = sum(rewards.get(a, 0.0) for a in self.blue_agents)
        red_total = sum(rewards.get(a, 0.0) for a in self.red_agents)

        # Wenn ein Teammate einen großen Reward bekommt, bekommt der andere einen Teil
        for agent in self.blue_agents:
            team_bonus = (blue_total - rewards.get(agent, 0.0)) * 0.3
            rewards[agent] = rewards.get(agent, 0.0) + team_bonus

        for agent in self.red_agents:
            team_bonus = (red_total - rewards.get(agent, 0.0)) * 0.3
            rewards[agent] = rewards.get(agent, 0.0) + team_bonus

        return rewards

    def _check_game_end(self) -> tuple[bool, Dict[str, float]]:
        """
        Prüft ob das Spiel vorbei ist.

        REWARD PHILOSOPHY (profile-dependent):
        - WIN: +WIN (Teamwork-Signal)
        - LOSE: +LOSE (Verlieren tut weh, negative Zahl)
        - Leading bei Timeout: KEIN Bonus (wird durch Captures bereits reflektiert)
        """
        rewards = {agent: 0.0 for agent in self.possible_agents}

        # Gewinn durch Score
        if self.scores["blue"] >= self.win_score:
            for agent in self.blue_agents:
                rewards[agent] += self.reward_profile["WIN"]
            for agent in self.red_agents:
                rewards[agent] += self.reward_profile["LOSE"]
            return True, rewards

        elif self.scores["red"] >= self.win_score:
            for agent in self.red_agents:
                rewards[agent] += self.reward_profile["WIN"]
            for agent in self.blue_agents:
                rewards[agent] += self.reward_profile["LOSE"]
            return True, rewards

        # Zeit abgelaufen - KEIN Bonus für führendes Team
        # (Captures geben bereits Reward, kein extra Signal nötig)
        if self.current_step >= self.max_steps:
            return True, rewards

        return False, rewards

    # ========== OBSERVATION ==========

    def _get_observation(self, agent: str) -> np.ndarray:
        """Observation für einen Agenten mit relativen Vektoren."""
        state = self.agent_states[agent]
        pos = state["position"]
        team = state["team"]
        enemy_team = self._get_enemy_team(team)

        # Hilfsfunktion für relative Vektoren (normiert auf Grid-Größe)
        def get_vec(target_pos, my_pos):
            return (target_pos - my_pos) / self.grid_size

        obs = []

        # 1. Eigene Info (5)
        obs.extend(pos / self.grid_size)  # Absolute Pos (hilft bei Wänden)
        obs.append(1.0 if state["has_flag"] else 0.0)
        obs.append(1.0 if state["is_stunned"] else 0.0)
        obs.append(state["tackle_cooldown"] / self.tackle_cooldown)

        # 2. Vektor zur eigenen Base (2)
        base_center = self._get_base_center(team)
        obs.extend(get_vec(base_center, pos))

        # 3. Vektoren zu Flaggen (2+2)
        enemy_flag = self.flags[enemy_team]
        own_flag = self.flags[team]
        obs.extend(get_vec(enemy_flag["position"], pos))  # Wo ist das Ziel?
        obs.extend(get_vec(own_flag["position"], pos))    # Wo ist meine Flagge?

        # 4. Teammate (relativ) (4)
        teammates = [a for a in self._get_team_agents(team) if a != agent]
        if teammates:
            tm = teammates[0]
            tm_state = self.agent_states[tm]
            obs.extend(get_vec(tm_state["position"], pos))
            obs.append(1.0 if tm_state["has_flag"] else 0.0)
            obs.append(1.0 if tm_state["is_stunned"] else 0.0)
        else:
            obs.extend([0, 0, 0, 0])  # Fallback

        # 5. Gegner (relativ & sortiert nach Nähe!) (4+4)
        enemies = self._get_team_agents(enemy_team)
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

        # 7. Wände/Rand Wahrnehmung (4)
        obs.append(pos[1] / self.grid_size)  # Abstand unten
        obs.append((self.grid_size - pos[1]) / self.grid_size)  # Abstand oben
        obs.append(pos[0] / self.grid_size)  # Abstand links
        obs.append((self.grid_size - pos[0]) / self.grid_size)  # Abstand rechts

        # 8. Scores (2)
        obs.append(self.scores[team] / self.win_score)
        obs.append(self.scores[enemy_team] / self.win_score)

        return np.array(obs, dtype=np.float32)

    # ========== REPLAY & RENDERING ==========

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
                "walls": self.walls,
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
