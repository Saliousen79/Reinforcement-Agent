"""
Export config.py as JSON for visualization/main.js to ensure Single Source of Truth.

Usage:
    python export_config_json.py

Output:
    ../visualization/config.json
"""

import json
from pathlib import Path
from config import ENV_CONFIG, WALLS, REWARD_PROFILES, REWARD_PROFILE_META

def export_config_to_json():
    """Exportiert die Python-Config als JSON für das JavaScript-Frontend."""

    output_path = Path(__file__).parent.parent / "visualization" / "config.json"

    config_data = {
        "environment": ENV_CONFIG,
        "walls": WALLS,
        "reward_profiles": {
            profile_name: {
                "rewards": rewards,
                "meta": REWARD_PROFILE_META[profile_name]
            }
            for profile_name, rewards in REWARD_PROFILES.items()
        }
    }

    # JSON schreiben mit schöner Formatierung
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(config_data, f, indent=2, ensure_ascii=False)

    print(f"[OK] Config exportiert nach: {output_path}")
    print(f"   Environment: {len(ENV_CONFIG)} Parameter")
    print(f"   Walls: {len(WALLS)} Sektionen")
    print(f"   Reward Profiles: {len(REWARD_PROFILES)}")
    print("\n[INFO] main.js kann jetzt die Walls aus config.json laden!")

    return str(output_path)


if __name__ == "__main__":
    export_config_to_json()
