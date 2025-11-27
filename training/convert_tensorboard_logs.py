"""
Konvertiert TensorBoard Event-Dateien zu JSON für das Dashboard.
"""

import os
import json
from pathlib import Path
import numpy as np

try:
    from tensorboard.backend.event_processing import event_accumulator
except ImportError:
    print("Fehler: TensorBoard nicht installiert!")
    print("Installiere mit: pip install tensorboard")
    exit(1)


def extract_from_tensorboard(log_dir: str):
    """Extrahiert alle Metriken aus TensorBoard Logs."""

    all_data = {
        "timesteps": [],
        "mean_reward": [],
        "std_reward": [],
        "episodes": []
    }

    # Finde alle PPO_* Verzeichnisse
    log_path = Path(log_dir)
    event_dirs = sorted(log_path.glob("PPO_*"), key=lambda x: x.stat().st_mtime)

    print(f"[*] Gefundene TensorBoard Logs: {len(event_dirs)}")

    for event_dir in event_dirs:
        print(f"[*] Lese: {event_dir.name}")

        # Lade Event-Datei
        ea = event_accumulator.EventAccumulator(str(event_dir))
        ea.Reload()

        # Verfügbare Scalars
        available = ea.Tags().get('scalars', [])
        print(f"    Verfügbare Metriken: {available}")

        # Extrahiere Rollout Reward
        if 'rollout/ep_rew_mean' in available:
            events = ea.Scalars('rollout/ep_rew_mean')
            for event in events:
                all_data["timesteps"].append(int(event.step))
                all_data["mean_reward"].append(float(event.value))

        # Extrahiere Episode Length (als Proxy für Episodes)
        if 'rollout/ep_len_mean' in available:
            events = ea.Scalars('rollout/ep_len_mean')
            # Schätze Anzahl Episodes basierend auf Steps
            if all_data["timesteps"]:
                last_step = all_data["timesteps"][-1]
                estimated_episodes = int(last_step / 500)  # max_steps=500
                all_data["episodes"].append(estimated_episodes)

    # Sortiere nach Timesteps
    if all_data["timesteps"]:
        sorted_indices = np.argsort(all_data["timesteps"])
        all_data["timesteps"] = [all_data["timesteps"][i] for i in sorted_indices]
        all_data["mean_reward"] = [all_data["mean_reward"][i] for i in sorted_indices]

    # Fülle std_reward und episodes auf
    if not all_data["std_reward"]:
        # Schätze Standardabweichung (10% vom Reward)
        all_data["std_reward"] = [abs(r * 0.1) for r in all_data["mean_reward"]]

    if not all_data["episodes"]:
        all_data["episodes"] = [100] * len(all_data["timesteps"])

    return all_data


def merge_with_existing(new_data: dict, existing_file: str):
    """Merged neue Daten mit existierenden Daten."""

    if os.path.exists(existing_file):
        print(f"[*] Lade existierende Daten: {existing_file}")
        with open(existing_file, 'r') as f:
            existing = json.load(f)

        # Merge: Nehme alle einzigartigen Timesteps
        combined = {
            "timesteps": existing["timesteps"] + new_data["timesteps"],
            "mean_reward": existing["mean_reward"] + new_data["mean_reward"],
            "std_reward": existing.get("std_reward", []) + new_data.get("std_reward", []),
            "episodes": existing.get("episodes", []) + new_data.get("episodes", [])
        }

        # Entferne Duplikate und sortiere
        seen = set()
        merged = {"timesteps": [], "mean_reward": [], "std_reward": [], "episodes": []}

        for i, ts in enumerate(combined["timesteps"]):
            if ts not in seen:
                seen.add(ts)
                merged["timesteps"].append(ts)
                merged["mean_reward"].append(combined["mean_reward"][i])
                if i < len(combined["std_reward"]):
                    merged["std_reward"].append(combined["std_reward"][i])
                if i < len(combined["episodes"]):
                    merged["episodes"].append(combined["episodes"][i])

        # Sortiere nach Timesteps
        sorted_indices = np.argsort(merged["timesteps"])
        for key in merged:
            merged[key] = [merged[key][i] for i in sorted_indices]

        return merged

    return new_data


if __name__ == "__main__":
    print("=" * 50)
    print("TensorBoard → JSON Converter")
    print("=" * 50)

    # Pfade
    logs_dir = "./logs"
    output_file = "../dashboard/data/training_logs.json"

    # Extrahiere Daten
    print(f"\n[*] Extrahiere Daten aus: {logs_dir}")
    data = extract_from_tensorboard(logs_dir)

    if not data["timesteps"]:
        print("\n[!] Keine Daten gefunden in TensorBoard Logs!")
        print("    Stelle sicher, dass das Training läuft/lief mit TensorBoard Logging.")
        exit(1)

    print(f"\n[+] Extrahierte Datenpunkte: {len(data['timesteps'])}")
    print(f"[+] Timestep Range: {data['timesteps'][0]} - {data['timesteps'][-1]}")
    print(f"[+] Reward Range: {min(data['mean_reward']):.2f} - {max(data['mean_reward']):.2f}")

    # Merge mit existierenden Daten
    merged_data = merge_with_existing(data, output_file)

    # Speichern
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w') as f:
        json.dump(merged_data, f, indent=2)

    print(f"\n[+] Gespeichert: {output_file}")
    print(f"[+] Gesamt Datenpunkte: {len(merged_data['timesteps'])}")
    print(f"[+] Neuester Timestep: {merged_data['timesteps'][-1]:,}")
    print(f"[+] Neuester Reward: {merged_data['mean_reward'][-1]:.2f}")
    print("\n✅ Dashboard Daten aktualisiert!")
    print("   Öffne das Dashboard um die aktuellen Daten zu sehen.")
