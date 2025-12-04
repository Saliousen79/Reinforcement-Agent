# Project Algernon

**Multi-Agent Reinforcement Learning für Capture the Flag**

Eine vergleichendes Projekt über den Einfluss von Reward-Strukturen auf das Lernverhalten von RL-Agenten in einer kompetitiven 2v2-Umgebung.

[Live Demo](https://saliovin.github.io/Reinforcement-Agent/) · [Dokumentation](https://saliovin.github.io/Reinforcement-Agent/dokumentation.html) · [Kennzahlen](https://saliovin.github.io/Reinforcement-Agent/kennzahlen.html)

---

## Überblick

Dieses Projekt untersucht, wie unterschiedliche Reward-Strukturen das Lernverhalten von RL-Agenten beeinflussen. Drei Modelle wurden mit identischen Hyperparametern, aber verschiedenen Belohnungsprofilen trainiert:

| Modell | Reward-Profil | Ergebnis |
|--------|---------------|----------|
| **Charlie** | Sparse (nur Capture/Sieg) | Kein messbares Lernen |
| **Gordon** | Dense (kontinuierliches Feedback) | +47.26 Reward, aber instabil |
| **Algernon** | Balanced (kritische Meilensteine) | +79.62 Reward, beste Performance |

## Schnellstart

### Voraussetzungen

- Python 3.8+
- Git

### Installation

```bash
git clone https://github.com/yourusername/Reinforcement-Agent.git
cd Reinforcement-Agent

python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

cd training
pip install -r requirements.txt
```

### Website lokal starten

```bash
# Vom Projektroot
python -m http.server 8000
```

Öffne `http://localhost:8000` im Browser.

### Replay erstellen

```bash
cd training

# Demo mit zufälligen Aktionen
python export_replay.py --demo

# Mit trainiertem Modell
python export_replay.py --model models/Algernon.zip --seed 42
```

### Training starten

```bash
cd training

# Standardkonfiguration (100M Steps, 16 Envs)
python train.py --name MeinModell --profile balanced

# Schnelltest
python train.py --timesteps 1000000 --envs 4 --name Test
```

Profile: `sparse`, `micromanager`, `balanced`

## Projektstruktur

```
Reinforcement-Agent/
├── training/
│   ├── environment.py      # CTF-Umgebung (PettingZoo)
│   ├── train.py            # PPO-Training
│   ├── config.py           # Zentrale Konfiguration
│   ├── export_replay.py    # Replay-Export
│   └── models/             # Trainierte Modelle
├── visualization/
│   ├── index.html          # 3D-Viewer
│   ├── main.js             # Three.js Rendering
│   └── replays/            # JSON-Replays
├── index.html              # Landing Page
├── dokumentation.html      # Technische Docs
└── kennzahlen.html         # Metriken-Dashboard
```

## Konfiguration

Alle Parameter sind zentral in `training/config.py` definiert:

```python
# Environment
ENV_CONFIG = {
    "grid_size": 24,
    "max_steps": 500,
    "win_score": 3,
    "stun_duration": 20,      # ~1s @ 20 FPS
    "tackle_cooldown": 65,    # ~3.25s
}

# PPO Hyperparameter
PPO_CONFIG = {
    "learning_rate": 3e-4,
    "batch_size": 512,
    "n_steps": 2048,
    "ent_coef": 0.03,
}
```

## Technologie

- **Training**: Stable-Baselines3, PyTorch, PettingZoo
- **Visualisierung**: Three.js, Chart.js
- **Monitoring**: TensorBoard

## Lizenz

MIT License - siehe [LICENSE](LICENSE)