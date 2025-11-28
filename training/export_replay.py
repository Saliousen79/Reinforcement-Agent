"""
Skript zum Exportieren einer Episode als JSON-Replay.
Kann entweder eine Demo mit zufälligen Aktionen oder eine Episode
mit einem trainierten PPO-Modell aufnehmen.

Vereinfachte Nutzung:
- python export_replay.py --demo
- python export_replay.py --model latest
- python export_replay.py --model models/mein_spezifisches_modell.zip
"""

import argparse
import os
import json
import datetime
import numpy as np
from stable_baselines3 import PPO

from environment import CaptureTheFlagEnv

MODELS_DIR = "training/models"
REPLAYS_DIR = "visualization/replays"


def find_latest_model() -> str:
    """
    Findet das neueste, finale Modell im `models`-Verzeichnis.
    Sucht nach Dateien, die auf '_final.zip' enden.
    """
    if not os.path.exists(MODELS_DIR):
        return None

    final_models = [f for f in os.listdir(MODELS_DIR) if f.endswith("_final.zip")]

    if not final_models:
        return None

    # Sortiere die Modelle nach dem Änderungsdatum (neuestes zuerst)
    latest_model = sorted(
        final_models,
        key=lambda f: os.path.getmtime(os.path.join(MODELS_DIR, f)),
        reverse=True
    )[0]

    return os.path.join(MODELS_DIR, latest_model)


def record_episode(env, model=None, seed=None):
    """Nimmt eine komplette Episode auf."""
    obs, info = env.reset(seed=seed)
    done = False

    while not done:
        actions = {}

        if model:
            # Predict für jeden Agenten einzeln
            for agent in env.agents:
                action, _ = model.predict(obs[agent], deterministic=True)
                actions[agent] = int(action)
        else:
            # Zufällige Aktionen für Demo-Modus
            actions = {agent: env.action_space(agent).sample() for agent in env.agents}

        obs, rewards, terminations, truncations, infos = env.step(actions)

        # Prüfen, ob die Episode beendet ist
        done = any(terminations.values()) or any(truncations.values())

    print(f"[*] Episode beendet. Finaler Score: Blue {env.scores['blue']} - {env.scores['red']} Red")
    return env.get_replay_data()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Capture the Flag - Replay Exporter")
    parser.add_argument("--model", type=str, help="Pfad zum trainierten Modell oder 'latest' für das Neueste.")
    parser.add_argument("--demo", action="store_true", help="Erstellt eine Demo-Episode mit zufälligen Aktionen.")
    parser.add_argument("--seed", type=int, default=None, help="Seed für die Umgebung zur Reproduzierbarkeit.")
    args = parser.parse_args()

    model_path = args.model
    model = None

    if model_path:
        if model_path.lower() == 'latest':
            print("[*] Suche nach dem neuesten Modell...")
            model_path = find_latest_model()
            if not model_path:
                print("[!] Kein finales Modell im 'models'-Ordner gefunden. Bitte zuerst trainieren.")
                exit(1)

        if not os.path.exists(model_path):
            print(f"[!] Fehler: Modelldatei nicht gefunden unter '{model_path}'")
            exit(1)

        print(f"[+] Lade Modell: {model_path}")
        try:
            model = PPO.load(model_path)
        except Exception as e:
            print(f"[!] Fehler beim Laden des Modells: {e}")
            print("[!] Mögliche Ursache: Observation Space hat sich geändert (Shape Mismatch)")
            exit(1)

    elif not args.demo:
        print("[!] Kein Modell angegeben und nicht im Demo-Modus. Starte mit zufaelligen Aktionen.")

    # Umgebung erstellen
    env = CaptureTheFlagEnv()

    # Episode aufnehmen
    print("[*] Nehme Episode auf...")
    replay_data = record_episode(env, model, seed=args.seed)

    # Replay speichern mit Metadaten im Dateinamen
    os.makedirs(REPLAYS_DIR, exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

    # Füge Score und Typ zum Dateinamen hinzu
    score_blue = replay_data['metadata']['final_scores']['blue']
    score_red = replay_data['metadata']['final_scores']['red']
    episode_type = "trained" if model else "demo"
    filename = f"{episode_type}_Blue{score_blue}v{score_red}Red_{timestamp}.json"
    filepath = os.path.join(REPLAYS_DIR, filename)

    with open(filepath, "w") as f:
        json.dump(replay_data, f, indent=2)

    print(f"[+] Exportiert: {os.path.abspath(filepath)}")