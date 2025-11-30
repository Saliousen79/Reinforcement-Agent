"""
Erstellt Replays für alle Checkpoints der 3 Experimente.

Struktur:
  Micromanager: 10M, 50M, 100M (final)
  Sparse:       10M, 50M, 100M (final)
  Balanced:     10M, 50M, 100M (final)

Total: 9 Replays (oder mehr, wenn du alle 10M Checkpoints willst)
"""

import json
from pathlib import Path
from datetime import datetime
import numpy as np
from stable_baselines3 import PPO

from environment import CaptureTheFlagEnv

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"
REPLAY_DIR = BASE_DIR / "replays"

# Experiment-Konfiguration
EXPERIMENTS = {
    "Micromanager": {
        "profile": "micromanager",
        "checkpoints": [10_000_000, 50_000_000, "final"],  # Wichtige Meilensteine
    },
    "Sparse": {
        "profile": "sparse",
        "checkpoints": [10_000_000, 50_000_000, "final"],
    },
    "Balanced": {
        "profile": "balanced",
        "checkpoints": [10_000_000, 50_000_000, "final"],
    },
}


def create_replay_for_checkpoint(model_name: str, checkpoint: str | int, profile: str, seed: int = 42):
    """Erstellt ein Replay für einen spezifischen Checkpoint."""

    # Model Path bestimmen
    if checkpoint == "final":
        model_path = MODEL_DIR / f"{model_name}_final.zip"
    else:
        model_path = MODEL_DIR / f"{model_name}_{checkpoint}_steps.zip"

    if not model_path.exists():
        print(f"   ⚠️  Modell nicht gefunden: {model_path}")
        return None

    print(f"   🎮 Lade Modell: {model_path.name}")

    # Environment mit richtigem Profile
    env = CaptureTheFlagEnv(reward_profile=profile)
    model = PPO.load(str(model_path))

    # Episode spielen
    obs, info = env.reset(seed=seed)
    done = False

    while not done:
        actions = {}
        for agent in env.agents:
            action, _ = model.predict(obs[agent], deterministic=True)
            actions[agent] = int(action)

        obs, rewards, terms, truncs, infos = env.step(actions)
        done = all(terms.values())

    # Replay-Daten sammeln
    replay_data = env.get_replay_data()
    replay_data["metadata"]["timestamp"] = datetime.now().isoformat()
    replay_data["metadata"]["model_name"] = model_name
    replay_data["metadata"]["checkpoint"] = checkpoint
    replay_data["metadata"]["reward_profile"] = profile

    # Speichern
    REPLAY_DIR.mkdir(parents=True, exist_ok=True)

    if checkpoint == "final":
        filename = f"{model_name}_100M.json"
    else:
        filename = f"{model_name}_{checkpoint // 1_000_000}M.json"

    filepath = REPLAY_DIR / filename

    with filepath.open("w") as f:
        json.dump(replay_data, f, indent=2)

    # Stats
    stats = replay_data["metadata"]["episode_stats"]
    scores = replay_data["metadata"]["final_scores"]

    print(f"   ✅ Gespeichert: {filename}")
    print(f"      Score: Blue {scores['blue']} - {scores['red']} Red")
    print(f"      Captures: Blue {stats['blue_captures']}, Red {stats['red_captures']}")
    print(f"      Stuns: Blue {stats['blue_stuns']}, Red {stats['red_stuns']}")

    return str(filepath)


def main():
    """Alle Replays erstellen."""
    print("\n" + "=" * 70)
    print("🎬 REPLAY GENERATION: Checkpoint Replays für Portfolio")
    print("=" * 70)

    total_replays = sum(len(exp["checkpoints"]) for exp in EXPERIMENTS.values())
    print(f"\n📊 {len(EXPERIMENTS)} Experimente × {len(EXPERIMENTS['Micromanager']['checkpoints'])} Checkpoints = {total_replays} Replays")
    print(f"💾 Output: {REPLAY_DIR}\n")

    created = 0
    failed = 0

    for exp_name, config in EXPERIMENTS.items():
        print(f"\n{'─' * 70}")
        print(f"🚩 {exp_name} (Profile: {config['profile']})")
        print(f"{'─' * 70}")

        for checkpoint in config["checkpoints"]:
            checkpoint_str = "final" if checkpoint == "final" else f"{checkpoint:,} steps"
            print(f"\n📍 Checkpoint: {checkpoint_str}")

            result = create_replay_for_checkpoint(
                model_name=exp_name,
                checkpoint=checkpoint,
                profile=config["profile"],
                seed=42  # Fixer Seed für Vergleichbarkeit
            )

            if result:
                created += 1
            else:
                failed += 1

    # Zusammenfassung
    print("\n" + "=" * 70)
    print("✅ REPLAY GENERATION ABGESCHLOSSEN")
    print("=" * 70)
    print(f"  Erfolgreich: {created}/{total_replays}")
    print(f"  Fehlgeschlagen: {failed}/{total_replays}")
    print(f"  Output-Verzeichnis: {REPLAY_DIR}")

    if failed > 0:
        print(f"\n⚠️  {failed} Replays konnten nicht erstellt werden.")
        print("    Mögliche Gründe:")
        print("    - Modelle existieren noch nicht (Training läuft noch)")
        print("    - Falscher Pfad")
        print("    - Checkpoint wurde durch cleanup gelöscht")

    print("\n📋 NÄCHSTE SCHRITTE:")
    print("  1. Replays im Dashboard ansehen")
    print("  2. Performance vergleichen (Micromanager vs Sparse vs Balanced)")
    print("  3. Ergebnisse in Portfolio dokumentieren\n")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ Fehler: {e}")
        import traceback
        traceback.print_exc()
