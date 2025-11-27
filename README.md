# 🚩 Capture the Flag - Multi-Agent Reinforcement Learning

Ein vollständiges Multi-Agent RL-Projekt mit 2v2 Capture the Flag, PPO-Training, 3D-Visualisierung und Analytics Dashboard.

## 📋 Projektübersicht

**Capture the Flag** ist ein kompetitives 2v2 Multi-Agent Environment, in dem Teams gegeneinander antreten, um die gegnerische Flagge zu erobern.

### Features

- ✅ **Custom PettingZoo Environment** - Vollständig implementiertes CTF-Spielfeld (24x24 Grid)
- ✅ **PPO Training** - Stable-Baselines3 mit Multi-Agent Support
- ✅ **3D Visualisierung** - Three.js Replay Viewer für Episoden
- ✅ **Analytics Dashboard** - Echtzeit-Metriken und Charts
- ✅ **Replay System** - JSON Export und Wiedergabe von Episoden

### Spielmechaniken

- **Flaggen aufnehmen**: In Gegner-Base → Flagge automatisch aufnehmen
- **Flaggen tragen**: Agent wird 20% langsamer mit Flagge
- **Flagge abgeben**: Mit Flagge in eigene Base → +50 Punkte
- **Tackle/Stun**: Gegner in Reichweite (1.5 Einheiten) stunnen (1.5 Sek)
- **Cooldown**: 5 Sekunden zwischen Tackles
- **Safe Zone**: In eigener Base kann man nicht gestunnt werden
- **Flagge zurücksetzen**: Eigene gefallene Flagge berühren → zurück zur Base

### Siegbedingungen

- Erstes Team mit **3 Captures** gewinnt
- Höchster Score nach **500 Steps**

---

## 📁 Projektstruktur

```
capture-the-flag/
├── training/
│   ├── environment.py          # CTF PettingZoo Environment
│   ├── train.py                # PPO Training Script
│   ├── export_replay.py        # JSON Replay Export
│   ├── requirements.txt        # Python Dependencies
│   └── models/                 # Gespeicherte Modelle (nach Training)
├── visualization/
│   ├── index.html              # 3D Replay Viewer
│   ├── main.js                 # Three.js Code
│   └── replays/
│       └── demo_episode.json   # Demo Replay (nach Export)
├── dashboard/
│   ├── index.html              # Analytics Dashboard
│   ├── dashboard.js            # Dashboard Logic
│   ├── api.py                  # Flask API (optional)
│   └── data/
│       └── training_logs.json  # Training Metriken
└── README.md
```

---

## 🚀 Installation

### 1. Repository klonen

```bash
git clone <dein-repo-url>
cd Reinforcement-Agent
```

### 2. Virtual Environment erstellen

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 3. Dependencies installieren

```bash
cd training
pip install -r requirements.txt
```

**Wichtige Abhängigkeiten:**
- `gymnasium==0.29.1`
- `pettingzoo==1.24.3`
- `stable-baselines3==2.2.1`
- `torch>=2.0.0`
- `flask==3.0.0` (für API)

---

## 🎮 Nutzung

### 1. Environment testen

```bash
cd training
python environment.py
```

Output:
```
✅ Environment erstellt!
Agents: ['blue_0', 'blue_1', 'red_0', 'red_1']
Observation shape: (22,)
Action space: Discrete(6)

=== Step 1 ===
Score: Blue 0 - 0 Red
  blue_0: (3.0, 10.0)
  blue_1: (3.0, 14.0)
  ...
```

### 2. Training starten

```bash
python train.py --timesteps 500000 --envs 4
```

**Parameter:**
- `--timesteps`: Anzahl der Trainingsschritte (default: 500,000)
- `--envs`: Anzahl paralleler Environments (default: 4)

**Output:**
```
==================================================
🚩 Capture the Flag Training
==================================================
Timesteps: 500,000
Parallel Envs: 4
==================================================

🚀 Training startet...

Step 1000: Mean Reward = -12.34
Step 2000: Mean Reward = -8.56
...
```

**Trainierte Modelle werden gespeichert in:**
- `training/models/ctf_YYYYMMDD_HHMMSS_XXXXX_steps.zip` (Checkpoints)
- `training/models/ctf_YYYYMMDD_HHMMSS_final.zip` (Finales Modell)

### 3. Replay erstellen

**Demo Episode (ohne Modell):**
```bash
python export_replay.py --demo
```

**Episode mit trainiertem Modell:**
```bash
python export_replay.py --model models/ctf_20250127_143022_final.zip --seed 42
```

Output:
```
📂 Lade Model: models/ctf_20250127_143022_final.zip
🎬 Nehme Episode auf...
✅ Exportiert: ../visualization/replays/episode_20250127_143512.json
   Final Score: Blue 2 - 1 Red
```

### 4. 3D Visualisierung öffnen

**Methode 1: Lokaler HTTP Server (empfohlen)**

```bash
cd visualization

# Python 3
python -m http.server 8000

# Öffne Browser: http://localhost:8000
```

**Methode 2: Direkt öffnen**

Öffne `visualization/index.html` direkt im Browser (funktioniert möglicherweise nicht wegen CORS).

**Steuerung:**
- **Maus ziehen**: Kamera bewegen
- **Mausrad**: Zoom
- **Play/Pause**: Episode steuern
- **Speed**: Wiedergabegeschwindigkeit (0.5x - 3x)
- **Reset**: Zurück zum Anfang

### 5. Analytics Dashboard öffnen

**Methode 1: Mit Flask API**

```bash
cd dashboard
python api.py
```

Öffne Browser: `http://localhost:5000`

**Methode 2: Statisch**

```bash
cd dashboard
python -m http.server 8001
```

Öffne Browser: `http://localhost:8001`

Das Dashboard zeigt:
- 📊 **Total Episodes & Timesteps**
- 📈 **Mean & Best Reward**
- 📉 **Training Progress Charts**
- 📊 **Reward Distribution**
- 📈 **Moving Averages**
- 📉 **Variance Analysis**

---

## 🎯 Environment Details

### Observation Space (22 Werte)

Jeder Agent bekommt:
1. **Eigene Info (5)**: `x, y, has_flag, is_stunned, tackle_cooldown`
2. **Teammate (3)**: `x, y, has_flag`
3. **Gegner 0 (3)**: `x, y, has_flag`
4. **Gegner 1 (3)**: `x, y, has_flag`
5. **Eigene Flagge (3)**: `x, y, at_base`
6. **Gegner Flagge (3)**: `x, y, at_base`
7. **Scores (2)**: `own_score, enemy_score`

Alle Werte sind normalisiert (`0.0 - 1.0`).

### Action Space (6 Aktionen)

- `0`: Hoch
- `1`: Runter
- `2`: Links
- `3`: Rechts
- `4`: Nichts tun
- `5`: Tackle (Stun in Reichweite)

### Reward Struktur

| Aktion | Reward |
|--------|--------|
| Flagge aufnehmen | +5.0 |
| Eigene Flagge zurücksetzen | +8.0 |
| Gegner stunnen | +3.0 |
| Flaggenträger stunnen | +13.0 (3 + 10 Bonus) |
| **Capture (Flagge abgeben)** | **+50.0** |
| Spiel gewonnen | +100.0 |
| Spiel verloren | -50.0 |
| Pro Schritt | -0.01 (Zeitstrafe) |

**Team Rewards**: 30% der Teammate-Rewards werden verteilt.

### Spielfeld Layout

```
Grid: 24x24 Einheiten

 0                12               24
 ┌─────────────────┬─────────────────┐
 │ BLUE BASE       │      RED BASE   │
 │ (0-4, 8-16)     │   (20-24, 8-16) │
 │                 │                 │
 │  🏁 Blue Flag   │   Red Flag 🏁   │
 │                 │                 │
 │  👤 blue_0      │      red_0 👤   │
 │  👤 blue_1      │      red_1 👤   │
 └─────────────────┴─────────────────┘
```

---

## 🔧 Erweiterte Konfiguration

### Environment Parameter anpassen

In [training/train.py](training/train.py) → `make_env()`:

```python
def make_env():
    return CaptureTheFlagEnv(
        grid_size=24,           # Spielfeldgröße
        max_steps=500,          # Max Steps pro Episode
        win_score=3,            # Captures zum Sieg
        stun_duration=30,       # Stun-Dauer (Steps @ 20 FPS = 1.5s)
        tackle_cooldown=100,    # Cooldown (Steps @ 20 FPS = 5s)
        tackle_range=1.5,       # Reichweite für Tackle
        carrier_speed_penalty=0.2,  # Geschwindigkeitsmalus mit Flagge
    )
```

### PPO Hyperparameter

In [training/train.py](training/train.py) → `PPO()`:

```python
model = PPO(
    policy="MlpPolicy",
    learning_rate=3e-4,     # Learning Rate
    n_steps=2048,           # Steps pro Update
    batch_size=64,          # Batch Size
    n_epochs=10,            # Epochs pro Update
    gamma=0.99,             # Discount Factor
    gae_lambda=0.95,        # GAE Lambda
    clip_range=0.2,         # PPO Clip Range
    ent_coef=0.01,          # Entropy Coefficient
)
```

---

## 📊 Metriken & Analyse

### Training Logs

Gespeichert in: [dashboard/data/training_logs.json](dashboard/data/training_logs.json)

```json
{
  "timesteps": [1000, 2000, ...],
  "mean_reward": [-12.34, -8.56, ...],
  "std_reward": [5.23, 4.12, ...],
  "episodes": [10, 25, ...]
}
```

### Episode Replay Format

Gespeichert in: `visualization/replays/episode_*.json`

```json
{
  "metadata": {
    "grid_size": 24,
    "final_scores": {"blue": 2, "red": 1},
    "episode_stats": {
      "blue_captures": 2,
      "red_captures": 1,
      "blue_stuns": 5,
      "red_stuns": 3
    }
  },
  "frames": [
    {
      "step": 0,
      "agents": { ... },
      "flags": { ... },
      "scores": {"blue": 0, "red": 0}
    }
  ]
}
```

---

## 🐛 Troubleshooting

### Problem: Training startet nicht

**Fehler**: `ModuleNotFoundError: No module named 'pettingzoo'`

**Lösung**:
```bash
pip install -r requirements.txt
```

### Problem: Visualisierung lädt nicht

**Fehler**: `Failed to fetch replays/demo_episode.json`

**Lösung**:
1. Demo erstellen:
   ```bash
   cd training
   python export_replay.py --demo
   ```
2. Lokalen Server starten (siehe Nutzung)

### Problem: Dashboard zeigt keine Daten

**Fehler**: "Keine Trainingsdaten gefunden"

**Lösung**:
Training mindestens einmal starten:
```bash
cd training
python train.py --timesteps 10000
```

### Problem: CUDA Out of Memory

**Lösung**: Batch Size oder Anzahl paralleler Envs reduzieren:
```bash
python train.py --timesteps 500000 --envs 2
```

---

## 🎓 Learning Resources

### Multi-Agent RL
- [PettingZoo Documentation](https://pettingzoo.farama.org/)
- [Stable-Baselines3 Docs](https://stable-baselines3.readthedocs.io/)

### PPO Algorithm
- [PPO Paper (Schulman et al.)](https://arxiv.org/abs/1707.06347)
- [OpenAI Spinning Up](https://spinningup.openai.com/en/latest/algorithms/ppo.html)

### Three.js
- [Three.js Documentation](https://threejs.org/docs/)
- [Three.js Examples](https://threejs.org/examples/)

---

## 📝 Nächste Schritte

### Verbesserungen für das Environment
- [ ] Mehr Agents pro Team (3v3, 4v4)
- [ ] Hindernisse auf dem Spielfeld
- [ ] Power-Ups (Speed Boost, Shield)
- [ ] Dynamische Map-Generierung

### Verbesserungen für das Training
- [ ] Self-Play Training
- [ ] Curriculum Learning
- [ ] LSTM/Attention Policies
- [ ] Multi-Task Learning

### Verbesserungen für Visualisierung
- [ ] Live Training Replay
- [ ] Heatmaps für Agent-Bewegungen
- [ ] Strategy Analysis Tools
- [ ] Video Export (MP4)

---

## 🤝 Beitragen

Contributions sind willkommen! Bitte:
1. Fork das Repo
2. Erstelle einen Feature Branch
3. Commit deine Änderungen
4. Push zum Branch
5. Öffne einen Pull Request

---

## 📄 Lizenz

MIT License - siehe LICENSE Datei

---

## 🙏 Credits

- **PettingZoo** - Multi-Agent Environment Framework
- **Stable-Baselines3** - RL Algorithms
- **Three.js** - 3D Visualisierung
- **Chart.js** - Dashboard Charts

---

## 📧 Kontakt

Bei Fragen oder Problemen, öffne ein Issue auf GitHub.

**Happy Training!** 🚀
