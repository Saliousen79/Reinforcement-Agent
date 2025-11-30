# 🚩 Capture the Flag - Multi-Agent Reinforcement Learning

Ein vollständiges 2v2 Capture the Flag Multi-Agent RL Projekt mit PPO-Training, 3D-Visualisierung und interaktivem Analytics Dashboard.

![CTF Banner](https://img.shields.io/badge/Multi--Agent-RL-blue) ![Python](https://img.shields.io/badge/Python-3.8+-green) ![License](https://img.shields.io/badge/License-MIT-yellow)

## 🎯 Überblick

Dieses Projekt implementiert ein vollständiges Reinforcement Learning System für Capture the Flag. Zwei Teams mit je 2 Agenten lernen kooperativ zu spielen, Strategien zu entwickeln und komplexe Spielsituationen zu meistern.

**Highlights:**
- 🤖 **3 trainierte Modelle** (50M, 200M, 250M Zeitschritte)
- 🎮 **3D Replay Viewer** mit Three.js
- 📊 **Live Dashboard** für Training-Metriken
- 📖 **Interaktive Dokumentation** mit Spielerklärungen
- 🔧 **Vollständig reproduzierbar**

## 🌟 Features

- **Custom PettingZoo Environment** (24x24 Grid mit Walls & Safe Zones)
- **PPO Training** mit Stable-Baselines3
- **Team Cooperation**: Agenten lernen koordiniert zu spielen
- **Tackle Mechanik**: Betäube Gegner strategisch
- **Realistic Gameplay**: Speed-Penalty für Flaggenträger
- **JSON Replay System**: Speichere und analysiere jedes Spiel

## 📁 Projektstruktur

```
.
├── index.html             # 🏠 Landing Page mit Navigation
├── docs/                  # 📖 Interaktive Dokumentation
│   └── index.html         #    - Spielerklärung
│                          #    - Modell-Präsentationen
│                          #    - Video-Embeds
├── training/              # 🎓 Training Code & Modelle
│   ├── environment.py     #    - CTF Environment (PettingZoo)
│   ├── train.py           #    - PPO Training Script
│   ├── export_replay.py   #    - Replay Export Tool
│   ├── models/            #    📦 Finale Modelle:
│   │   ├── Night_1.zip           - ~50M Steps (Baseline)
│   │   ├── Night_200M.zip        - 200M Steps (Advanced)
│   │   └── Algernon_250M.zip     - 250M Steps (Best)
│   └── logs/              #    📊 TensorBoard Logs
├── visualization/         # 🎮 3D Replay Viewer
│   ├── index.html         #    - Three.js Visualisierung
│   ├── main.js            #    - Rendering Engine
│   └── replays/           #    - JSON Replays
└── dashboard/             # 📊 Analytics Dashboard
    ├── index.html         #    - Live Training Metriken
    └── dashboard.js       #    - Chart.js Integration
```

## 🚀 Quick Start

### Option A: Nur die Visualisierung nutzen (empfohlen)

Die einfachste Methode, um die trainierten Modelle zu sehen:

```bash
# 1. Repository klonen
git clone https://github.com/yourusername/Reinforcement-Agent.git
cd Reinforcement-Agent

# 2. Lokalen Server starten
python -m http.server 8000

# 3. Browser öffnen
# 🏠 Landing Page:     http://localhost:8000
# 📖 Dokumentation:    http://localhost:8000/docs/
# 🎮 3D Viewer:        http://localhost:8000/visualization/
# 📊 Dashboard:        http://localhost:8000/dashboard/
```

Die 3 finalen Modelle (Night_1, Night_200M, Algernon_250M) und ein Replay sind bereits im Repository enthalten!

### Option B: Eigenes Training (Fortgeschritten)

Für eigene Experimente und neues Training:

```bash
# 1. Virtual Environment erstellen
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# 2. Dependencies installieren
cd training
pip install -r requirements.txt

# 3. Training starten (z.B. 1 Million Steps)
python train.py --timesteps 1000000 --envs 4 --name MyModel

# 4. Replay aus trainiertem Modell erstellen
python export_replay.py --model models/MyModel_final.zip

# 5. Server starten und Replay ansehen
cd ..
python -m http.server 8000
# Öffne http://localhost:8000/visualization/
```

### 🎬 Replays erstellen

```bash
cd training

# Demo Episode (ohne Modell - zufällige Aktionen)
python export_replay.py --demo

# Mit einem der trainierten Modelle
python export_replay.py --model models/Algernon_250M.zip --seed 42
python export_replay.py --model models/Night_200M.zip --seed 123
python export_replay.py --model models/Night_1.zip

# Replays werden in visualization/replays/ gespeichert
```

## 🤖 Trainierte Modelle

Das Repository enthält 3 finale Modelle mit unterschiedlichen Trainingsgraden:

| Modell | Zeitschritte | Performance | Verwendung |
|--------|-------------|-------------|------------|
| **Night_1** | ~50M | Baseline | Gute Grundstrategien, defensiv |
| **Night_200M** | 200M | Advanced | Ausgewogen, adaptive Taktiken |
| **Algernon_250M** | 250M | Elite | Beste Performance, kreative Strategien |

**Alle Modelle sind spielbereit!** Einfach Server starten und im 3D Viewer ansehen.

## 🔄 Reproduzierbarkeit

Das Projekt ist vollständig reproduzierbar. Um das Training zu wiederholen:

1. **Environment Setup:** Alle Parameter in `training/environment.py`
2. **Training Config:** Hyperparameter in `training/train.py`
3. **Reproduktion:** Nutze den gleichen Seed für deterministische Ergebnisse

```bash
# Exakte Reproduktion eines Trainings
python train.py --timesteps 1000000 --envs 4 --name Experiment1 --seed 42
```

**Wichtige Dateien:**
- `training/requirements.txt` - Exakte Package-Versionen
- `training/environment.py` - Environment-Konfiguration
- `training/train.py` - Training-Loop und PPO-Config

## 🎮 Environment Details

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

## 🛠️ Troubleshooting

### Training-Probleme

**"ModuleNotFoundError" beim Training:**
```bash
cd training
pip install -r requirements.txt
```

**Training zu langsam:**
- Reduziere `--timesteps` für Tests (z.B. 100000)
- Erhöhe `--envs` für mehr parallele Environments (z.B. 8 oder 16)

**Modell lernt nicht:**
- Check TensorBoard: `tensorboard --logdir training/logs`
- Reward sollte im Laufe der Zeit steigen
- Bei Problemen: Hyperparameter in `train.py` anpassen

### Visualisierungs-Probleme

**3D Viewer zeigt nichts:**
1. Erstelle ein Demo-Replay: `python export_replay.py --demo`
2. Server muss im Projekt-Root laufen (nicht in `visualization/`)
3. Check Browser-Console für Fehler

**Dashboard zeigt keine Daten:**
- Mindestens einmal Training starten: `python train.py --timesteps 10000`
- Oder `training/data/training_logs.json` manuell erstellen

**Replay lädt nicht:**
- JSON-Datei muss in `visualization/replays/` liegen
- Check Browser DevTools Network Tab für 404-Fehler

### Allgemeine Probleme

**Server startet nicht auf Port 8000:**
```bash
# Nutze einen anderen Port
python -m http.server 8080
# Dann öffne http://localhost:8080
```

**Performance-Probleme im 3D Viewer:**
- Nutze einen modernen Browser (Chrome/Firefox empfohlen)
- Reduziere Replay-Länge für kürzere Ladezeiten

## 📚 Dokumentation

Für detaillierte Informationen:
- 📖 **Interaktive Docs:** Öffne `http://localhost:8000/docs/` nach dem Server-Start
- 🎮 **Spielmechaniken:** Siehe `docs/index.html` für visuelle Erklärungen
- 🤖 **Modell-Details:** Jedes Modell hat eine eigene Sektion in der Dokumentation

## 🤝 Contributing

Beiträge sind willkommen! Um beizutragen:

1. Fork das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/AmazingFeature`)
3. Commit deine Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE) Datei

## 🙏 Credits & Technologie-Stack

**Frameworks & Libraries:**
- [PettingZoo](https://pettingzoo.farama.org/) - Multi-Agent Environment Framework
- [Stable-Baselines3](https://stable-baselines3.readthedocs.io/) - PPO Implementation
- [Three.js](https://threejs.org/) - 3D Visualisierung
- [Chart.js](https://www.chartjs.org/) - Dashboard Charts

**Inspiration:**
- OpenAI Hide and Seek
- DeepMind's Multi-Agent Research
- Classic CTF Game Design

---

**Made with ❤️ using Reinforcement Learning**

Für Fragen oder Feedback, öffne ein [Issue](https://github.com/yourusername/Reinforcement-Agent/issues)!
