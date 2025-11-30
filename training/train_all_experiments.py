"""
Master-Skript für Portfolio-Experimente.
Trainiert 3 Modelle mit verschiedenen Reward-Strukturen:
1. Micromanager (Heavy Shaping)
2. Sparse (Pure Minimalist)
3. Balanced (Current Best Practice)

Jedes Modell wird 100M Steps trainiert mit Checkpoints bei 10M, 50M, 100M.
"""

import subprocess
import sys
from pathlib import Path
from datetime import datetime

TRAINING_CONFIG = {
    "total_timesteps": 100_000_000,  # 100M
    "n_envs": 24,
    "save_freq": 10_000_000,  # Checkpoint alle 10M
}

EXPERIMENTS = [
    {
        "name": "Micromanager",
        "profile": "micromanager",
        "description": "Heavy Shaping - Rewards für alles (Pickups, Distance, Tackles)",
    },
    {
        "name": "Sparse",
        "profile": "sparse",
        "description": "Pure Minimalist - NUR Captures & Win/Loss",
    },
    {
        "name": "Balanced",
        "profile": "balanced",
        "description": "Current Best - Carrier Distance + Critical Defense",
    },
]


def run_experiment(exp_config: dict):
    """Ein Experiment ausführen."""
    name = exp_config["name"]
    profile = exp_config["profile"]
    description = exp_config["description"]

    print("\n" + "=" * 70)
    print(f"🚀 EXPERIMENT: {name}")
    print(f"📊 Profile: {profile}")
    print(f"📝 Description: {description}")
    print("=" * 70)

    # Training Command
    cmd = [
        sys.executable,  # Python executable
        "train.py",
        "--name", name,
        "--profile", profile,
        "--timesteps", str(TRAINING_CONFIG["total_timesteps"]),
        "--envs", str(TRAINING_CONFIG["n_envs"]),
    ]

    print(f"\n▶ Running: {' '.join(cmd)}\n")

    # Training starten (live output)
    try:
        result = subprocess.run(cmd, check=True, cwd=Path(__file__).parent)
        print(f"\n✅ {name} Training abgeschlossen!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\n❌ {name} Training fehlgeschlagen: {e}")
        return False
    except KeyboardInterrupt:
        print(f"\n⚠️ {name} Training abgebrochen durch User!")
        return False


def main():
    """Alle Experimente ausführen."""
    start_time = datetime.now()

    print("\n" + "█" * 70)
    print("█" + " " * 68 + "█")
    print("█" + "  PORTFOLIO EXPERIMENTS: 3 REWARD STRUCTURES".center(68) + "█")
    print("█" + " " * 68 + "█")
    print("█" * 70)
    print(f"\n📅 Start: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"⏱️  Erwartete Dauer: ~6-12 Stunden (je nach CPU)")
    print(f"💾 Checkpoints: 10M, 20M, 30M, ..., 100M")
    print(f"📊 Logs: TensorBoard + JSON")
    print(f"\n{'=' * 70}\n")

    results = {}

    for i, exp in enumerate(EXPERIMENTS, 1):
        print(f"\n📍 Experiment {i}/{len(EXPERIMENTS)}")
        success = run_experiment(exp)
        results[exp["name"]] = "✅ SUCCESS" if success else "❌ FAILED"

        # Zwischenbilanz
        print("\n" + "─" * 70)
        print("ZWISCHENBILANZ:")
        for exp_name, status in results.items():
            print(f"  {status}  {exp_name}")
        print("─" * 70)

    # Finale Zusammenfassung
    end_time = datetime.now()
    duration = end_time - start_time

    print("\n" + "█" * 70)
    print("█" + " " * 68 + "█")
    print("█" + "  ALLE EXPERIMENTE ABGESCHLOSSEN".center(68) + "█")
    print("█" + " " * 68 + "█")
    print("█" * 70)
    print(f"\n📅 Ende: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"⏱️  Dauer: {duration}")
    print(f"\n{'=' * 70}")
    print("FINALE ERGEBNISSE:")
    for exp_name, status in results.items():
        print(f"  {status}  {exp_name}")
    print("=" * 70)

    # Nächste Schritte
    print("\n📋 NÄCHSTE SCHRITTE:")
    print("  1. Replays erstellen: python create_checkpoint_replays.py")
    print("  2. Dashboard öffnen: http://localhost:8000 (oder dein Dashboard)")
    print("  3. TensorBoard starten: tensorboard --logdir training/logs")
    print("\n✨ Viel Erfolg mit deinem Portfolio!\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️ Alle Trainings abgebrochen!")
        sys.exit(1)
