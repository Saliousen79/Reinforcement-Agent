"""
PPO Training für Capture the Flag.
"""

import os
import json
import numpy as np
from pathlib import Path
from datetime import datetime
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import BaseCallback, CheckpointCallback
from stable_baselines3.common.vec_env import VecMonitor
from supersuit import pettingzoo_env_to_vec_env_v1, concat_vec_envs_v1

from environment import CaptureTheFlagEnv

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
DEFAULT_LOG_DIR = PROJECT_ROOT / "dashboard" / "data"
DEFAULT_MODEL_DIR = BASE_DIR / "models"
DEFAULT_REPLAY_DIR = PROJECT_ROOT / "visualization" / "replays"
DEFAULT_TENSORBOARD_DIR = BASE_DIR / "logs"


class MetricsCallback(BaseCallback):
    """Erweitertes Callback für Analytics Dashboard."""

    def __init__(self, log_path: str, save_freq: int = 1000, verbose: int = 1,
                 model_name: str = "Unknown", total_timesteps: int = 0):
        super().__init__(verbose)
        self.log_path = log_path
        self.save_freq = save_freq
        self.model_name = model_name
        self.total_timesteps = total_timesteps
        self.metrics = {
            "model_name": model_name,
            "total_timesteps": total_timesteps,
            "current_timesteps": 0,
            "progress_percent": 0.0,
            "last_update": None,
            "timesteps": [],
            "mean_reward": [],
            "std_reward": [],
            "mean_length": [],  # NEU: Wie lange dauert ein Spiel?
            "episodes": [],
            "max_reward": 0.0,
            "current_mean_reward": 0.0,
        }

    def _on_step(self) -> bool:
        if self.n_calls % self.save_freq == 0:
            # ep_info_buffer enthält 'r' (Reward) und 'l' (Length)
            if len(self.model.ep_info_buffer) > 0:
                rewards = [ep["r"] for ep in self.model.ep_info_buffer]
                lengths = [ep["l"] for ep in self.model.ep_info_buffer]  # NEU

                mean_reward = float(np.mean(rewards))
                max_reward_current = float(np.max(rewards))

                self.metrics["timesteps"].append(self.n_calls)
                self.metrics["mean_reward"].append(mean_reward)
                self.metrics["std_reward"].append(float(np.std(rewards)))
                self.metrics["mean_length"].append(float(np.mean(lengths)))  # NEU
                self.metrics["episodes"].append(len(self.model.ep_info_buffer))

                # Update Live-Metriken
                self.metrics["current_timesteps"] = self.n_calls
                self.metrics["current_mean_reward"] = mean_reward
                self.metrics["max_reward"] = max(self.metrics["max_reward"], max_reward_current)
                if self.total_timesteps > 0:
                    self.metrics["progress_percent"] = (self.n_calls / self.total_timesteps) * 100
                self.metrics["last_update"] = datetime.now().isoformat()

                # Speichern
                with open(self.log_path, "w") as f:
                    json.dump(self.metrics, f, indent=2)

                if self.verbose:
                    print(f"Step {self.n_calls}: Reward = {mean_reward:.2f}, Length = {np.mean(lengths):.1f}")

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


def create_replay(model_path: str, output_dir: str | Path = None, seed: int = 42):
    """Replay mit trainiertem Modell erstellen."""
    from datetime import datetime

    model_path = Path(model_path)
    output_path = Path(output_dir) if output_dir else DEFAULT_REPLAY_DIR
    output_path.mkdir(parents=True, exist_ok=True)

    env = CaptureTheFlagEnv()
    model = PPO.load(str(model_path))

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
    replay_data["metadata"]["model_path"] = str(model_path)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"trained_episode_{timestamp}.json"
    filepath = output_path / filename

    with filepath.open("w") as f:
        json.dump(replay_data, f, indent=2)

    print(f"   ✅ Replay gespeichert: {filepath}")
    print(f"   📊 Final Score: Blue {replay_data['metadata']['final_scores']['blue']} - {replay_data['metadata']['final_scores']['red']} Red")
    print(f"   📈 Captures: Blue {replay_data['metadata']['episode_stats']['blue_captures']}, Red {replay_data['metadata']['episode_stats']['red_captures']}")
    print(f"   💥 Stuns: Blue {replay_data['metadata']['episode_stats']['blue_stuns']}, Red {replay_data['metadata']['episode_stats']['red_stuns']}")

    return str(filepath)


def train(
    total_timesteps: int = 5_000_000,  # Erhöht von 500k auf 5M
    n_envs: int = 8,                   # Mehr parallele Envs für schnelleres Training
    learning_rate: float = 3e-4,
    save_freq: int = 200_000,
    log_dir: str | Path = DEFAULT_LOG_DIR,
    model_dir: str | Path = DEFAULT_MODEL_DIR,
    load_path: str = None,
    run_name: str = None,
    cleanup_checkpoints: bool = True,
):
    """Training starten."""
    log_dir = Path(log_dir)
    model_dir = Path(model_dir)
    tensorboard_dir = DEFAULT_TENSORBOARD_DIR

    log_dir.mkdir(parents=True, exist_ok=True)
    model_dir.mkdir(parents=True, exist_ok=True)
    tensorboard_dir.mkdir(parents=True, exist_ok=True)

    if run_name is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        run_name = f"ctf_{timestamp}"

    print("=" * 50)
    print(f"🚩 Capture the Flag Training: '{run_name}'")
    print("=" * 50)
    print(f"Timesteps: {total_timesteps:,} | Parallel Envs: {n_envs}")

    # Environment
    env = make_env()
    vec_env = pettingzoo_env_to_vec_env_v1(env)

    # Multiprocessing aktiviert: Jedes Environment bekommt einen eigenen CPU-Kern
    # Das beschleunigt das Training um Faktor 4-6x!
    vec_env = concat_vec_envs_v1(
        vec_env,
        n_envs,
        num_cpus=n_envs,  # Turbo-Modus: Parallele Ausführung auf allen Kernen
        base_class="stable_baselines3"
    )
    vec_env = VecMonitor(vec_env)

    # Modell laden oder neu erstellen
    load_path_resolved = None
    if load_path:
        candidates: list[Path] = []
        raw = Path(load_path)

        if raw.is_absolute():
            candidates.append(raw)
        else:
            # 1) relativ zur aktuellen Arbeitsdirectory
            candidates.append(Path.cwd() / raw)
            # 2) relativ zum training/ Ordner
            candidates.append(BASE_DIR / raw)
            # 3) relativ zum models-Ordner, nur Name extrahieren falls Pfad schon "models/..." enthielt
            candidates.append(model_dir / raw.name)

        for cand in candidates:
            if cand.exists():
                load_path_resolved = cand
                break

    if load_path_resolved and load_path_resolved.exists():
        print(f"\n📂 Lade Modell: {load_path_resolved}")
        model = PPO.load(load_path_resolved, env=vec_env, tensorboard_log=str(tensorboard_dir))
        model.learning_rate = learning_rate
        reset_timesteps = False
    else:
        print("\n✨ Erstelle neues Modell (Training von Null)")
        model = PPO(
            policy="MlpPolicy",
            env=vec_env,
            learning_rate=learning_rate,
            n_steps=1024,        # Schritte pro Update pro Env
            batch_size=256,      # Größere Batch Size für stabilere Gradients
            n_epochs=10,
            gamma=0.99,
            gae_lambda=0.95,
            clip_range=0.2,
            ent_coef=0.01,       # Exploration erzwingen
            verbose=1,
            tensorboard_log=str(tensorboard_dir),
            policy_kwargs=dict(net_arch=[256, 256])  # Größeres Netzwerk für komplexere Observations
        )
        reset_timesteps = True

    # Callbacks
    checkpoint_cb = CheckpointCallback(
        save_freq=save_freq // n_envs,
        save_path=str(model_dir),
        name_prefix=run_name,
    )

    metrics_cb = MetricsCallback(
        log_path=str(log_dir / "training_logs.json"),
        save_freq=1000,
        model_name=run_name,
        total_timesteps=total_timesteps,
    )

    best_game_cb = BestGameCallback()

    # Training
    print(f"\n🚀 Training '{run_name}' startet... (Ziel: {total_timesteps:,} Steps)\n")

    try:
        model.learn(
            total_timesteps=total_timesteps,
            callback=[checkpoint_cb, metrics_cb, best_game_cb],
            progress_bar=True,
            reset_num_timesteps=reset_timesteps,
        )

        final_model_path = model_dir / f"{run_name}_final"
        model.save(str(final_model_path))
        print(f"\n✅ Training fertig! Gespeichert als: {final_model_path}.zip")

        # Automatisch Replay erstellen
        print("\n🎬 Erstelle Replay mit trainiertem Modell...")
        create_replay(final_model_path)

        # Zwischenstände aufräumen
        if cleanup_checkpoints:
            for ckpt in model_dir.glob(f"{run_name}_*_steps.zip"):
                try:
                    ckpt.unlink()
                except OSError:
                    pass

    except KeyboardInterrupt:
        interrupted_path = model_dir / f"{run_name}_interrupted"
        model.save(str(interrupted_path))
        print(f"\n⚠️ Abbruch! Gespeichert als: {interrupted_path}.zip")

        # Auch bei Interrupt ein Replay erstellen
        print("\n🎬 Erstelle Replay mit aktuellem Modell...")
        create_replay(interrupted_path)

    finally:
        vec_env.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--timesteps", type=int, default=5_000_000)
    parser.add_argument("--envs", type=int, default=8)
    parser.add_argument("--load", type=str, default=None, help="Pfad zum Laden (.zip)")
    parser.add_argument("--name", type=str, default=None, help="Name des Agenten (z.B. 'Alpha')")
    args = parser.parse_args()

    train(
        total_timesteps=args.timesteps,
        n_envs=args.envs,
        load_path=args.load,
        run_name=args.name,
    )
