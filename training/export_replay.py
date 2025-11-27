"""
Export von Episoden als JSON für Visualisierung.
"""

import json
import os
import numpy as np
from datetime import datetime
from stable_baselines3 import PPO
from environment import CaptureTheFlagEnv


def record_episode(
    model_path: str = None,
    output_dir: str = "../visualization/replays",
    seed: int = None,
) -> str:
    """Episode aufnehmen und exportieren."""
    os.makedirs(output_dir, exist_ok=True)

    env = CaptureTheFlagEnv()

    model = None
    if model_path:
        print(f"📂 Lade Model: {model_path}")
        model = PPO.load(model_path)
    else:
        print("🎲 Nutze zufällige Aktionen")

    obs, info = env.reset(seed=seed)
    done = False

    print("🎬 Nehme Episode auf...")

    while not done:
        actions = {}
        for agent in env.agents:
            if model:
                action, _ = model.predict(obs[agent], deterministic=True)
                actions[agent] = int(action)
            else:
                actions[agent] = env.action_space(agent).sample()

        obs, rewards, terms, truncs, infos = env.step(actions)
        done = all(terms.values())

    # Export
    replay_data = env.get_replay_data()
    replay_data["metadata"]["timestamp"] = datetime.now().isoformat()
    replay_data["metadata"]["model_path"] = model_path

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"episode_{timestamp}.json"
    filepath = os.path.join(output_dir, filename)

    with open(filepath, "w") as f:
        json.dump(replay_data, f, indent=2)

    print(f"✅ Exportiert: {filepath}")
    print(f"   Final Score: Blue {replay_data['metadata']['final_scores']['blue']} - {replay_data['metadata']['final_scores']['red']} Red")

    return filepath


def create_demo_episode(output_dir: str = "../visualization/replays"):
    """Demo-Episode mit vordefinierten Bewegungen."""
    os.makedirs(output_dir, exist_ok=True)

    frames = []

    # Simuliere ein spannendes Spiel
    for step in range(150):
        t = step / 150

        # Blue Team bewegt sich nach rechts
        blue_0_x = 3 + t * 15 if step < 50 else 18 - (t - 0.33) * 10
        blue_1_x = 3 + t * 10

        # Red Team bewegt sich nach links
        red_0_x = 21 - t * 15 if step < 50 else 6 + (t - 0.33) * 10
        red_1_x = 21 - t * 10

        # Flaggen-Logik
        blue_has_flag = 40 < step < 80
        red_has_flag = 60 < step < 100
        blue_stunned = 75 < step < 90

        frame = {
            "step": step,
            "agents": {
                "blue_0": {
                    "position": [min(max(blue_0_x, 0), 24), 12],
                    "team": "blue",
                    "has_flag": blue_has_flag and not blue_stunned,
                    "is_stunned": blue_stunned,
                    "tackle_cooldown": 0,
                },
                "blue_1": {
                    "position": [min(max(blue_1_x, 0), 24), 10],
                    "team": "blue",
                    "has_flag": False,
                    "is_stunned": False,
                    "tackle_cooldown": 0,
                },
                "red_0": {
                    "position": [min(max(red_0_x, 0), 24), 12],
                    "team": "red",
                    "has_flag": red_has_flag,
                    "is_stunned": False,
                    "tackle_cooldown": 0,
                },
                "red_1": {
                    "position": [min(max(red_1_x, 0), 24), 14],
                    "team": "red",
                    "has_flag": False,
                    "is_stunned": False,
                    "tackle_cooldown": 0,
                },
            },
            "flags": {
                "blue": {
                    "position": [red_0_x, 12] if red_has_flag else [2, 12],
                    "carried_by": "red_0" if red_has_flag else None,
                    "at_base": not red_has_flag,
                },
                "red": {
                    "position": [blue_0_x, 12] if blue_has_flag and not blue_stunned else ([15, 12] if blue_stunned else [22, 12]),
                    "carried_by": "blue_0" if blue_has_flag and not blue_stunned else None,
                    "at_base": not blue_has_flag and step < 75,
                },
            },
            "scores": {
                "blue": 1 if step > 100 else 0,
                "red": 1 if step > 120 else 0,
            },
        }
        frames.append(frame)

    replay_data = {
        "metadata": {
            "grid_size": 24,
            "max_steps": 150,
            "win_score": 3,
            "final_scores": {"blue": 1, "red": 1},
            "episode_stats": {
                "blue_captures": 1,
                "red_captures": 1,
                "blue_stuns": 1,
                "red_stuns": 1,
            },
            "demo": True,
        },
        "frames": frames,
    }

    filepath = os.path.join(output_dir, "demo_episode.json")
    with open(filepath, "w") as f:
        json.dump(replay_data, f, indent=2)

    print(f"✅ Demo erstellt: {filepath}")
    return filepath


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=str, default=None)
    parser.add_argument("--demo", action="store_true")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    if args.demo:
        create_demo_episode()
    else:
        record_episode(model_path=args.model, seed=args.seed)
