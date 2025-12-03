"""
Zentrale Konfigurationsdatei für das Capture the Flag RL-Projekt.
Diese Datei ist die EINZIGE Quelle der Wahrheit für alle Parameter.

WICHTIG: Bei Änderungen müssen auch README.md und HTML-Dokumentation aktualisiert werden!
"""

# ========== ENVIRONMENT CONFIGURATION ==========

ENV_CONFIG = {
    "grid_size": 24,
    "max_steps": 500,
    "win_score": 3,
    "stun_duration": 20,          # ~1.0 Sekunden @ 20 FPS
    "tackle_cooldown": 65,        # ~3.25 Sekunden @ 20 FPS
    "tackle_range": 2.0,
    "carrier_speed_penalty": 0.3,  # Flaggenträger 30% langsamer
}

# Wände (Map Layout) - Single Source of Truth für Python & JavaScript
WALLS = [
    # --- ZENTRUM (Sichtschutz) ---
    {"x_min": 10, "x_max": 11, "y_min": 10, "y_max": 11},
    {"x_min": 13, "x_max": 14, "y_min": 10, "y_max": 11},
    {"x_min": 10, "x_max": 11, "y_min": 13, "y_max": 14},
    {"x_min": 13, "x_max": 14, "y_min": 13, "y_max": 14},
    # --- BLUE DEFENSE (Links) ---
    {"x_min": 5, "x_max": 7, "y_min": 4, "y_max": 5},
    {"x_min": 5, "x_max": 7, "y_min": 19, "y_max": 20},
    # --- RED DEFENSE (Rechts) ---
    {"x_min": 17, "x_max": 19, "y_min": 4, "y_max": 5},
    {"x_min": 17, "x_max": 19, "y_min": 19, "y_max": 20},
]

# ========== REWARD PROFILES ==========
# Diese Struktur wird direkt von environment.py verwendet!

REWARD_PROFILES = {
    "sparse": {
        "CAPTURE": 100.0,
        "WIN": 50.0,
        "LOSE": -50.0,
        "FLAG_PICKUP": 0.0,
        "DISTANCE_TO_FLAG": 0.0,
        "CARRIER_DISTANCE": 0.0,
        "TACKLE_ANY": 0.0,
        "TACKLE_FLAG_CARRIER": 0.0,
        "FLAG_RETURN": 0.0,
        "DISTANCE_TO_CARRIER": 0.0,
        "STEP_PENALTY": 0.0,
    },
    "micromanager": {
        "CAPTURE": 50.0,
        "WIN": 20.0,
        "LOSE": -20.0,
        "FLAG_PICKUP": 10.0,
        "DISTANCE_TO_FLAG": 0.2,
        "CARRIER_DISTANCE": 0.3,
        "TACKLE_ANY": 3.0,
        "TACKLE_FLAG_CARRIER": 8.0,
        "FLAG_RETURN": 5.0,
        "DISTANCE_TO_CARRIER": 0.15,
        "STEP_PENALTY": -0.01,
    },
    "balanced": {
        "CAPTURE": 100.0,
        "WIN": 30.0,
        "LOSE": -30.0,
        "FLAG_PICKUP": 0.0,
        "DISTANCE_TO_FLAG": 0.0,
        "CARRIER_DISTANCE": 0.1,
        "TACKLE_ANY": 0.0,
        "TACKLE_FLAG_CARRIER": 8.0,
        "FLAG_RETURN": 5.0,
        "DISTANCE_TO_CARRIER": 0.0,
        "STEP_PENALTY": 0.0,
    },
}

# Metadaten für Dokumentation und Dashboard
REWARD_PROFILE_META = {
    "sparse": {
        "description": "Minimalist - Nur finale Ergebnisse zählen",
        "philosophy": "Reward only final outcomes",
        "agent": "Charlie",
    },
    "micromanager": {
        "description": "Dense - Kontinuierliches Feedback für fast alles",
        "philosophy": "Reward almost every action",
        "agent": "Gordon",
    },
    "balanced": {
        "description": "Balanced - Selektive Belohnung kritischer Meilensteine",
        "philosophy": "Reward only critical milestones",
        "agent": "Algernon",
    },
}

# ========== PPO HYPERPARAMETERS ==========

PPO_CONFIG = {
    "policy": "MlpPolicy",
    "learning_rate": 3e-4,
    "n_steps": 2048,
    "batch_size": 512,            # Erhöht für stabile Updates
    "gamma": 0.99,
    "ent_coef": 0.03,             # Erhöht für mehr Exploration
    "n_epochs": 10,
    "gae_lambda": 0.95,
    "clip_range": 0.2,
    "clip_range_vf": None,
    "max_grad_norm": 0.5,
    "vf_coef": 0.5,
    "device": "cpu",              # CPU oft schneller für MLP-Policies
    "verbose": 1,
}

# ========== POLICY NETWORK ARCHITECTURE ==========

POLICY_KWARGS = {
    "net_arch": [512, 512],       # Deep Network für komplexe Strategien
    "activation_fn": "tanh",      # Tanh Aktivierungsfunktion
}

# ========== TRAINING CONFIGURATION ==========

TRAINING_CONFIG = {
    "total_timesteps": 100_000_000,
    "n_envs": 16,                 # Anzahl paralleler Umgebungen
    "log_interval": 10,
    "save_freq": 1_000_000,       # Checkpoint alle 1M Steps
    "eval_freq": 500_000,
    "eval_episodes": 10,
}

# ========== TRAINED MODELS METADATA ==========

MODELS_METADATA = {
    "Charlie": {
        "timesteps": 95_400_000,
        "reward_profile": "sparse",
        "n_envs": 4,
        "training_time_hours": 9.15,
        "final_reward": 0.00,
        "peak_reward": 0.00,
        "min_episode_length": 500.0,
        "explained_variance": 0.820,
        "description": "Sparse Rewards - Kein messbares Lernen trotz hoher Explained Variance",
    },
    "Gordon": {
        "timesteps": 100_100_000,
        "reward_profile": "micromanager",
        "n_envs": 4,
        "training_time_hours": 15.56,
        "final_reward": 51.60,
        "peak_reward": 113.13,
        "min_episode_length": 480.6,
        "explained_variance": 0.651,
        "description": "Dense Rewards - Moderate Performance mit hoher Varianz",
    },
    "Algernon": {
        "timesteps": 100_100_000,
        "reward_profile": "balanced",
        "n_envs": 8,
        "training_time_hours": 6.53,
        "final_reward": 79.62,
        "peak_reward": 88.22,
        "min_episode_length": 357.0,
        "explained_variance": 0.911,
        "description": "Balanced Rewards - Beste Performance und Stabilität",
    },
}

# ========== OBSERVATION SPACE DOCUMENTATION ==========

OBSERVATION_SPACE_DOC = """
Der Observation Space besteht aus 31 kontinuierlichen Werten:

1. Self Info (5):
   - Normalized position (x, y)
   - has_flag (binary)
   - is_stunned (binary)
   - tackle_cooldown (normalized)

2. Vector to Own Base (2):
   - Relative direction (dx, dy)

3. Vector to Enemy Flag (2):
   - Relative direction to target

4. Vector to Own Flag (2):
   - Relative direction to defend

5. Teammate Info (4):
   - Relative position (dx, dy)
   - has_flag (binary)
   - is_stunned (binary)

6. Opponents Sorted by Distance (8):
   - Nearest opponent (dx, dy, has_flag, is_stunned)
   - Second opponent (dx, dy, has_flag, is_stunned)

7. Flag Status (2):
   - enemy_flag_at_base (binary)
   - own_flag_at_base (binary)

8. Map Boundaries (4):
   - Distance to walls (top, bottom, left, right)

9. Scores (2):
   - own_score (normalized)
   - enemy_score (normalized)

TOTAL: 31 Werte
"""

# ========== HELPER FUNCTIONS ==========

def get_reward_profile(profile_name: str) -> dict:
    """
    Gibt ein Reward-Profil zurück.

    Args:
        profile_name: Name des Profils ("sparse", "micromanager", "balanced")

    Returns:
        Dictionary mit Reward-Werten
    """
    if profile_name not in REWARD_PROFILES:
        raise ValueError(f"Unknown reward profile: {profile_name}. Available: {list(REWARD_PROFILES.keys())}")
    return REWARD_PROFILES[profile_name]


def print_config_summary():
    """Gibt eine Zusammenfassung der Konfiguration aus."""
    print("=" * 60)
    print("CAPTURE THE FLAG - CONFIGURATION SUMMARY")
    print("=" * 60)

    print("\n[ENVIRONMENT]")
    for key, value in ENV_CONFIG.items():
        print(f"  {key:25s}: {value}")

    print(f"\n[WALLS]")
    print(f"  Total: {len(WALLS)} wall sections")

    print("\n[PPO HYPERPARAMETERS]")
    for key, value in PPO_CONFIG.items():
        print(f"  {key:25s}: {value}")

    print("\n[REWARD PROFILES]")
    for profile_name, profile_data in REWARD_PROFILES.items():
        meta = REWARD_PROFILE_META[profile_name]
        print(f"\n  {profile_name.upper()} ({meta['agent']}):")
        print(f"    {meta['description']}")
        print(f"    Capture: {profile_data['CAPTURE']}")
        print(f"    Win/Lose: ±{profile_data['WIN']}/{profile_data['LOSE']}")

    print("\n[TRAINED MODELS]")
    for model_name, metadata in MODELS_METADATA.items():
        print(f"\n  {model_name}:")
        print(f"    Profile: {metadata['reward_profile']}")
        print(f"    Steps: {metadata['timesteps']:,}")
        print(f"    Final Reward: {metadata['final_reward']}")
        print(f"    Training Time: {metadata['training_time_hours']}h")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    # Wenn direkt ausgeführt, zeige Konfiguration
    print_config_summary()
    print("\n[OBSERVATION SPACE]")
    print(OBSERVATION_SPACE_DOC)
