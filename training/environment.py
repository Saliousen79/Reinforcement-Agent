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
        self.walls = [
            {"x_min": 11, "x_max": 13, "y_min": 4, "y_max": 8},
            {"x_min": 11, "x_max": 13, "y_min": 16, "y_max": 20},
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
        Observation pro Agent (22 Werte):
        - Eigene Info: x, y, has_flag, is_stunned, tackle_cooldown (5)
        - Teammate: x, y, has_flag (3)
        - Gegner 0: x, y, has_flag (3)
        - Gegner 1: x, y, has_flag (3)
        - Eigene Flagge: x, y, at_base (3)
        - Gegner Flagge: x, y, at_base (3)
        - Scores: own, enemy (2)
        """
        return spaces.Box(low=-1.0, high=2.0, shape=(22,), dtype=np.float32)

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

        def spawn_with_offset(x: float, y: float) -> np.ndarray:
            y_offset = np.random.uniform(-3, 3)
            return np.array([x, np.clip(y + y_offset, 0, self.grid_size - 1)])

        # Blue Team - linke Seite
        self.agent_states["blue_0"] = {
            "position": spawn_with_offset(3.0, 10.0),
            "has_flag": False,
            "is_stunned": False,
            "stun_timer": 0,
            "tackle_cooldown": 0,
            "team": "blue",
        }
        self.agent_states["blue_1"] = {
            "position": spawn_with_offset(3.0, 14.0),
            "has_flag": False,
            "is_stunned": False,
            "stun_timer": 0,
            "tackle_cooldown": 0,
            "team": "blue",
        }

        # Red Team - rechte Seite
        self.agent_states["red_0"] = {
            "position": spawn_with_offset(21.0, 10.0),
            "has_flag": False,
            "is_stunned": False,
            "stun_timer": 0,
            "tackle_cooldown": 0,
            "team": "red",
        }
        self.agent_states["red_1"] = {
            "position": spawn_with_offset(21.0, 14.0),
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
        if not self._is_in_wall(new_pos):
            pos[:] = new_pos

        # Flagge mitbewegen wenn getragen
        if state["has_flag"]:
            flag_team = "red" if state["team"] == "blue" else "blue"
            self.flags[flag_team]["position"] = pos.copy()

        return reward

    def _execute_tackle(self, agent: str) -> float:
        """Tackle ausführen."""
        state = self.agent_states[agent]
        reward = 0.0

        # Cooldown check
        if state["tackle_cooldown"] > 0:
            return 0.0

        # In eigener Base? Kann nicht tacklen (und wird nicht getackled)
        #if self._is_in_base(state["position"], state["team"]):
        #    continue

        # Cooldown setzen
        state["tackle_cooldown"] = self.tackle_cooldown

        # Gegner in Reichweite finden
        enemies = self.red_agents if state["team"] == "blue" else self.blue_agents

        for enemy in enemies:
            enemy_state = self.agent_states[enemy]

            # Distanz prüfen
            dist = np.linalg.norm(state["position"] - enemy_state["position"])

            if dist <= self.tackle_range and self._check_line_of_sight(
                state["position"], enemy_state["position"]
            ):
                # Stun!
                enemy_state["is_stunned"] = True
                enemy_state["stun_timer"] = self.stun_duration

                reward += 3.0  # Basis Stun-Reward

                # Stats
                if state["team"] == "blue":
                    self.episode_stats["blue_stuns"] += 1
                else:
                    self.episode_stats["red_stuns"] += 1

                # Hatte Gegner eine Flagge?
                if enemy_state["has_flag"]:
                    reward += 10.0  # Bonus für Flaggenträger stunnen!
                    enemy_state["has_flag"] = False

                    # Flagge fallen lassen
                    dropped_flag = "red" if state["team"] == "blue" else "blue"
                    self.flags[dropped_flag]["carried_by"] = None
                    self.flags[dropped_flag]["at_base"] = False
                    # Position bleibt wo sie ist

                break  # Nur einen Gegner pro Tackle

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
                if dist_to_flag < 1.0:
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
                if dist_to_own_flag < 1.0:
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
        """Observation für einen Agenten."""
        state = self.agent_states[agent]
        team = state["team"]
        enemy_team = "red" if team == "blue" else "blue"

        # Normalisierung
        def norm_pos(p):
            return p / self.grid_size

        obs = []

        # Eigene Info (5)
        obs.extend(norm_pos(state["position"]))
        obs.append(1.0 if state["has_flag"] else 0.0)
        obs.append(1.0 if state["is_stunned"] else 0.0)
        obs.append(state["tackle_cooldown"] / self.tackle_cooldown)

        # Teammate (3)
        teammates = self.blue_agents if team == "blue" else self.red_agents
        teammate = [t for t in teammates if t != agent][0]
        tm_state = self.agent_states[teammate]
        obs.extend(norm_pos(tm_state["position"]))
        obs.append(1.0 if tm_state["has_flag"] else 0.0)

        # Gegner (6)
        enemies = self.red_agents if team == "blue" else self.blue_agents
        for enemy in enemies:
            e_state = self.agent_states[enemy]
            obs.extend(norm_pos(e_state["position"]))
            obs.append(1.0 if e_state["has_flag"] else 0.0)

        # Eigene Flagge (3)
        own_flag = self.flags[team]
        obs.extend(norm_pos(own_flag["position"]))
        obs.append(1.0 if own_flag["at_base"] else 0.0)

        # Gegner Flagge (3)
        enemy_flag = self.flags[enemy_team]
        obs.extend(norm_pos(enemy_flag["position"]))
        obs.append(1.0 if enemy_flag["at_base"] else 0.0)

        # Scores (2)
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
