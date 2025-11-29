# Capture the Flag - Multi-Agent Reinforcement Learning

Ein 2v2 Capture the Flag Environment mit PPO-Training, 3D-Visualisierung und Analytics Dashboard.

## Features

- Custom PettingZoo Environment (24x24 Grid)
- PPO Training mit Stable-Baselines3
- 3D Replay Viewer (Three.js)
- Analytics Dashboard mit Echtzeit-Metriken
- JSON Replay System

## Projektstruktur

```
.
├── training/              # Training Code, Models, Logs
│   ├── environment.py     # CTF Environment
│   ├── train.py          # PPO Training
│   ├── export_replay.py  # Replay Export
│   ├── models/           # Trainierte Modelle
│   └── logs/             # TensorBoard Logs
├── visualization/         # 3D Replay Viewer
│   └── replays/          # Episode Replays (JSON)
├── dashboard/            # Analytics Dashboard
│   └── data/             # Training Metriken
└── index.html            # Landing Page
```

## Quick Start

### 1. Installation

```bash
# Repository klonen
git clone <dein-repo-url>
cd Reinforcement-Agent

# Virtual Environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Dependencies installieren
cd training
pip install -r requirements.txt
```

### 2. Training starten

```bash
# Neues Training
python train.py --timesteps 500000 --envs 8 --name Run1

# Training fortsetzen
python train.py --timesteps 500000 --load models/ctf_final.zip
```

### 3. Replay erstellen

```bash
# Demo Episode (ohne Modell)
python export_replay.py --demo

# Mit trainiertem Modell
python export_replay.py --model models/ctf_final.zip --seed 42
```

### 4. Visualisierung öffnen

```bash
# Im Projekt-Root (wichtig für korrekte Pfade!)
cd ..
python -m http.server 8000

# Browser öffnen:
# http://localhost:8000            - Landing Page
# http://localhost:8000/visualization/  - 3D Viewer
# http://localhost:8000/dashboard/      - Analytics
```

## Environment Details

### Observation Space (22 Werte)
- Eigene Info (x, y, has_flag, is_stunned, cooldown)
- Teammate (x, y, has_flag)
- Gegner (x, y, has_flag) x2
- Flaggen (x, y, at_base) x2
- Scores (own, enemy)

### Action Space
- 0-3: Hoch, Runter, Links, Rechts
- 4: Nichts tun
- 5: Tackle

### Spielmechaniken
- Flagge aufnehmen in Gegner-Base
- Flaggenträger 20% langsamer
- Tackle stunned Gegner für 1.5s (Cooldown: 5s)
- Safe Zone in eigener Base
- Sieg bei 3 Captures oder höchster Score nach 500 Steps

### Rewards
| Aktion | Reward |
|--------|--------|
| Flagge aufnehmen | +5 |
| Eigene Flagge zurücksetzen | +8 |
| Gegner stunnen | +3 |
| Flaggenträger stunnen | +13 |
| Capture | +50 |
| Spiel gewonnen | +100 |
| Spiel verloren | -50 |
| Pro Schritt | -0.01 |

## Konfiguration

### Environment Parameter

In `train.py` → `make_env()`:

```python
CaptureTheFlagEnv(
    grid_size=24,
    max_steps=500,
    win_score=3,
    stun_duration=30,
    tackle_cooldown=100,
    tackle_range=1.5,
    carrier_speed_penalty=0.2
)
```

### PPO Hyperparameter

In `train.py` → `PPO()`:

```python
PPO(
    policy="MlpPolicy",
    learning_rate=3e-4,
    n_steps=2048,
    batch_size=64,
    gamma=0.99,
    ent_coef=0.01
)
```

## Troubleshooting

**Training startet nicht:**
```bash
pip install -r requirements.txt
```

**Visualisierung lädt nicht:**
1. Demo erstellen: `python export_replay.py --demo`
2. Server im Projekt-Root starten (nicht in `visualization/`)

**Dashboard zeigt keine Daten:**
```bash
# Mindestens einmal Training starten
python train.py --timesteps 10000
```

## Lizenz

MIT License - siehe LICENSE Datei

## Credits

- PettingZoo - Multi-Agent Environment Framework
- Stable-Baselines3 - RL Algorithms
- Three.js - 3D Visualisierung
- Chart.js - Dashboard Charts
