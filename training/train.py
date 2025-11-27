"""
PPO Training für Capture the Flag.
"""

import os
import numpy as np
from datetime import datetime
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import BaseCallback, CheckpointCallback
from stable_baselines3.common.vec_env import VecMonitor
from supersuit import pettingzoo_env_to_vec_env_v1, concat_vec_envs_v1
import json

from environment import CaptureTheFlagEnv


class MetricsCallback(BaseCallback):
    """Callback für Analytics Dashboard."""

    def __init__(self, log_path: str, save_freq: int = 1000, verbose: int = 1):
        super().__init__(verbose)
        self.log_path = log_path
        self.save_freq = save_freq
        self.metrics = {
            "timesteps": [],
            "mean_reward": [],
            "std_reward": [],
            "episodes": [],
        }

    def _on_step(self) -> bool:
        if self.n_calls % self.save_freq == 0:
            if len(self.model.ep_info_buffer) > 0:
                rewards = [ep["r"] for ep in self.model.ep_info_buffer]
                self.metrics["timesteps"].append(self.n_calls)
                self.metrics["mean_reward"].append(float(np.mean(rewards)))
                self.metrics["std_reward"].append(float(np.std(rewards)))
                self.metrics["episodes"].append(len(self.model.ep_info_buffer))

                # Speichern
                with open(self.log_path, "w") as f:
                    json.dump(self.metrics, f, indent=2)

                if self.verbose:
                    print(f"Step {self.n_calls}: Mean Reward = {np.mean(rewards):.2f}")

        return True


class BestGameCallback(BaseCallback):
    """
    Speichert das Replay, wenn ein neuer Highscore erreicht wurde.
    """
    def __init__(self, output_dir: str = "../visualization/replays"):
        super().__init__(verbose=1)
        self.output_dir = output_dir
        self.best_reward = -float('inf')
        os.makedirs(output_dir, exist_ok=True)

    def _on_step(self) -> bool:
        # 'infos' enthält Infos von allen parallelen Environments
        infos = self.locals.get("infos", [])

        for i, info in enumerate(infos):
            # Prüfen ob Episode beendet ist (via Monitor Wrapper Info)
            if "episode" in info:
                episode_reward = info["episode"]["r"]

                # Ist das ein neuer Rekord? (Und nicht nur zufälliges Rauschen am Anfang)
                if episode_reward > self.best_reward:
                    self.best_reward = episode_reward

                    # Zugriff auf das Environment - muss unwrappen
                    try:
                        # Bei concat_vec_envs_v1 und VecMonitor
                        if hasattr(self.training_env, 'venv'):
                            # VecMonitor wrapper
                            vec_env = self.training_env.venv
                        else:
                            vec_env = self.training_env

                        # Jetzt zum eigentlichen env
                        if hasattr(vec_env, 'par_env'):
                            # concat_vec_envs_v1 Struktur
                            env = vec_env.par_env
                        elif hasattr(vec_env, 'envs'):
                            env = vec_env.envs[i]
                        else:
                            env = vec_env

                        # Unwrap bis zum eigentlichen Environment
                        while hasattr(env, 'env') and not hasattr(env, 'last_replay'):
                            env = env.env

                        if hasattr(env, "last_replay"):
                            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                            filename = f"best_game_reward_{int(episode_reward)}_{timestamp}.json"
                            filepath = os.path.join(self.output_dir, filename)

                            with open(filepath, "w") as f:
                                json.dump(env.last_replay, f)

                            if self.verbose > 0:
                                print(f"\n🏆 Neuer Highscore: {episode_reward:.2f}! Replay gespeichert: {filename}")
                    except Exception as e:
                        if self.verbose > 0:
                            print(f"\n⚠️ Konnte Replay nicht speichern: {e}")

        return True


def make_env():
    """Environment Factory."""
    return CaptureTheFlagEnv(
        grid_size=24,
        max_steps=500,
        win_score=3,
    )


def create_replay(model_path: str, output_dir: str = "../visualization/replays", seed: int = 42):
    """Replay mit trainiertem Modell erstellen."""
    import os
    from datetime import datetime

    os.makedirs(output_dir, exist_ok=True)

    env = CaptureTheFlagEnv()
    model = PPO.load(model_path)

    obs, info = env.reset(seed=seed)
    done = False

    while not done:
        actions = {}
        for agent in env.agents:
            action, _ = model.predict(obs[agent], deterministic=True)
            actions[agent] = int(action)

        obs, rewards, terms, truncs, infos = env.step(actions)
        done = all(terms.values())

    # Export
    replay_data = env.get_replay_data()
    replay_data["metadata"]["timestamp"] = datetime.now().isoformat()
    replay_data["metadata"]["model_path"] = model_path

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"trained_episode_{timestamp}.json"
    filepath = os.path.join(output_dir, filename)

    with open(filepath, "w") as f:
        json.dump(replay_data, f, indent=2)

    print(f"   ✅ Replay gespeichert: {filepath}")
    print(f"   📊 Final Score: Blue {replay_data['metadata']['final_scores']['blue']} - {replay_data['metadata']['final_scores']['red']} Red")
    print(f"   📈 Captures: Blue {replay_data['metadata']['episode_stats']['blue_captures']}, Red {replay_data['metadata']['episode_stats']['red_captures']}")
    print(f"   💥 Stuns: Blue {replay_data['metadata']['episode_stats']['blue_stuns']}, Red {replay_data['metadata']['episode_stats']['red_stuns']}")

    return filepath


def train(
    total_timesteps: int = 500_000,
    n_envs: int = 4,
    learning_rate: float = 3e-4,
    save_freq: int = 50_000,
    log_dir: str = "../dashboard/data",
    model_dir: str = "./models",
):
    """Training starten."""
    os.makedirs(log_dir, exist_ok=True)
    os.makedirs(model_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_name = f"ctf_{timestamp}"

    print("=" * 50)
    print("🚩 Capture the Flag Training")
    print("=" * 50)
    print(f"Timesteps: {total_timesteps:,}")
    print(f"Parallel Envs: {n_envs}")
    print("=" * 50)

    # Environment
    env = make_env()
    vec_env = pettingzoo_env_to_vec_env_v1(env)
    vec_env = concat_vec_envs_v1(vec_env, n_envs, num_cpus=1, base_class="stable_baselines3")
    vec_env = VecMonitor(vec_env)

    # Model
    model = PPO(
        policy="MlpPolicy",
        env=vec_env,
        learning_rate=learning_rate,
        n_steps=2048,
        batch_size=64,
        n_epochs=10,
        gamma=0.99,
        gae_lambda=0.95,
        clip_range=0.2,
        ent_coef=0.01,
        verbose=1,
        tensorboard_log="./logs",
    )

    # Callbacks
    checkpoint_cb = CheckpointCallback(
        save_freq=save_freq // n_envs,
        save_path=model_dir,
        name_prefix=run_name,
    )

    metrics_cb = MetricsCallback(
        log_path=os.path.join(log_dir, "training_logs.json"),
        save_freq=1000,
    )

    best_game_cb = BestGameCallback()

    # Training
    print("\n🚀 Training startet...\n")

    try:
        model.learn(
            total_timesteps=total_timesteps,
            callback=[checkpoint_cb, metrics_cb, best_game_cb],
            progress_bar=True,
        )

        final_model_path = os.path.join(model_dir, f"{run_name}_final")
        model.save(final_model_path)
        print(f"\n✅ Training abgeschlossen!")

        # Automatisch Replay erstellen
        print("\n🎬 Erstelle Replay mit trainiertem Modell...")
        create_replay(final_model_path)

    except KeyboardInterrupt:
        interrupted_path = os.path.join(model_dir, f"{run_name}_interrupted")
        model.save(interrupted_path)
        print(f"\n⚠️ Training unterbrochen, Model gespeichert")

        # Auch bei Interrupt ein Replay erstellen
        print("\n🎬 Erstelle Replay mit aktuellem Modell...")
        create_replay(interrupted_path)

    finally:
        vec_env.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--timesteps", type=int, default=500_000)
    parser.add_argument("--envs", type=int, default=4)
    args = parser.parse_args()

    train(total_timesteps=args.timesteps, n_envs=args.envs)
