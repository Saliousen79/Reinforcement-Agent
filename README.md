# 🚩 Capture the Flag - Multi-Agent Reinforcement Learning

A complete 2v2 Capture the Flag Multi-Agent RL project with PPO training, 3D visualization, and interactive analytics.

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Multi-Agent](https://img.shields.io/badge/Multi--Agent-RL-green.svg)](https://pettingzoo.farama.org/)

## 📋 Table of Contents

- [Overview](#-overview)
- [Demo](#-demo)
- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Trained Models](#-trained-models)
- [Training Your Own Models](#-training-your-own-models)
- [Environment Details](#-environment-details)
- [Configuration](#%EF%B8%8F-configuration)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

## 🎯 Overview

This project implements a complete Reinforcement Learning system for a 2v2 Capture the Flag game. Two teams with two agents each learn to cooperatively play, develop strategies, and master complex game situations using Proximal Policy Optimization (PPO).

**Key Highlights:**
- 🤖 **3 trained models** (Charlie, Gordon, Algernon) with different skill levels
- 🎮 **Interactive 3D Replay Viewer** built with Three.js
- 📊 **Analytics dashboard** with training metrics visualization
- 📖 **Comprehensive documentation** with gameplay explanations
- 🔧 **Fully reproducible** training pipeline

## 🎬 Demo

**Live Website:** [View Project](https://saliovin.github.io/Reinforcement-Agent/)

The project includes:
- **3D Replay Visualization**: Watch trained agents play in real-time
- **Interactive Documentation**: Learn about the game mechanics and training
- **Performance Metrics**: Compare the three trained models

## ⭐ Features

### Environment
- **Custom PettingZoo Environment** with 24x24 grid, walls, and safe zones
- **Team Cooperation**: Agents learn coordinated strategies
- **Tackle Mechanic**: Strategically stun opponents
- **Realistic Gameplay**: Speed penalty for flag carriers

### Training
- **PPO Algorithm** via Stable-Baselines3
- **Parallel Training**: Multiple environments for faster convergence
- **TensorBoard Integration**: Real-time training metrics

### Visualization
- **3D Game Viewer**: Watch replays from any angle
- **JSON Replay System**: Save and analyze every game
- **Performance Dashboards**: Track training progress

## 🚀 Installation

### Prerequisites

- Python 3.8 or higher
- Git

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/Reinforcement-Agent.git
cd Reinforcement-Agent
```

2. **Create virtual environment**
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. **Install dependencies**
```bash
cd training
pip install -r requirements.txt
```

## 🎮 Quick Start

### Option A: View Pre-trained Models (Recommended)

The easiest way to see the trained models in action:

```bash
# Start a local server
python -m http.server 8000

# Open in browser
# 🏠 Landing Page:  http://localhost:8000
# 📖 Documentation: http://localhost:8000/dokumentation.html
# 📊 Metrics:       http://localhost:8000/kennzahlen.html
# 🎮 3D Viewer:     http://localhost:8000/visualization/
```

Three final models (Charlie, Gordon, Algernon) and their replays are already included!

### Option B: Generate New Replays

```bash
cd training

# Create a demo replay (random actions)
python export_replay.py --demo

# Use a trained model
python export_replay.py --model models/Algernon.zip --seed 42

# Replays are saved to visualization/replays/
```

## 📁 Project Structure

```
Reinforcement-Agent/
├── index.html              # 🏠 Landing page
├── dokumentation.html      # 📖 Documentation and gameplay guide
├── kennzahlen.html         # 📊 Performance metrics dashboard
│
├── training/               # 🎓 Training code and models
│   ├── environment.py      # Custom CTF environment (PettingZoo)
│   ├── train.py            # PPO training script
│   ├── export_replay.py    # Replay export tool
│   ├── requirements.txt    # Python dependencies
│   ├── models/             # 📦 Trained models
│   │   ├── Charlie.zip     # Baseline (95.4M steps)
│   │   ├── Gordon.zip      # Advanced (100.1M steps)
│   │   └── Algernon.zip    # Elite (100.1M steps)
│   └── logs/               # TensorBoard training logs
│
└── visualization/          # 🎮 3D replay viewer
    ├── index.html          # Viewer interface
    ├── main.js             # Three.js rendering engine
    ├── assets/             # 3D models and textures
    └── replays/            # JSON replay files
```

## 🤖 Trained Models

The repository includes three models with different training durations and performance levels:

| Model | Training Steps | Performance | Characteristics |
|-------|---------------|-------------|-----------------|
| **Charlie** | 95.4M | Baseline | Learns basic strategies, defensive play |
| **Gordon** | 100.1M | Advanced | Balanced gameplay, adaptive tactics |
| **Algernon** | 100.1M | Elite | Best performance, creative strategies |

### Performance Comparison

| Metric | Charlie | Gordon | Algernon |
|--------|---------|--------|----------|
| Final Reward | 0.00 | 51.60 | **79.62** |
| Peak Reward | 0.00 | **113.13** | 88.22 |
| Min. Episode Length | 500.0 | 480.6 | **357.0** |
| Explained Variance | 0.820 | 0.651 | **0.911** |
| Training Time | 9.15h | 15.56h | **6.53h** |

#### Understanding Charlie's Paradox

Charlie presents an interesting phenomenon in RL: **high Explained Variance (0.820) despite zero reward improvement**.

**What does this mean?**
- The **Value Function (Critic)** successfully learned to predict state values with high consistency
- The **Policy (Actor)** found no gradient for improvement due to extremely sparse rewards
- The Critic learned that "all states are equally bad" - a correct but useless prediction

**Why does this happen?**
In sparse reward environments, the agent rarely encounters positive signals. The Value Function can achieve high Explained Variance by simply predicting low/zero returns consistently, while the Policy never receives actionable feedback to improve behavior.

**Key Insight:** This demonstrates the critical importance of reward shaping balance - too little feedback leads to learning stagnation, even when the value network appears to be "learning" based on metrics alone.

**All models are ready to play!** Simply start the server and view them in the 3D viewer.

## 🏋️ Training Your Own Models

### Basic Training

```bash
cd training

# Train for 1 million steps
python train.py --timesteps 1000000 --envs 4 --name MyModel

# Export a replay
python export_replay.py --model models/MyModel_final.zip
```

### Advanced Training

```bash
# Full training with custom configuration
python train.py \
  --timesteps 50000000 \
  --envs 8 \
  --name AdvancedModel \
  --seed 42
```

### Monitor Training

```bash
# Start TensorBoard
tensorboard --logdir training/logs

# Open http://localhost:6006
```

## 🎯 Environment Details

### Observation Space (31 values per agent)

Each agent receives a **31-dimensional feature vector** with ego-centric, relative observations:

- **Self Info (5)**: normalized position (x, y), has_flag, is_stunned, tackle_cooldown
- **Vector to Own Base (2)**: relative direction (dx, dy)
- **Vector to Enemy Flag (2)**: relative direction to target
- **Vector to Own Flag (2)**: relative direction to defend
- **Teammate Info (4)**: relative position (dx, dy), has_flag, is_stunned
- **Opponents Sorted by Distance (8)**: 2× (relative dx, dy, has_flag, is_stunned)
- **Flag Status (2)**: enemy_flag_at_base, own_flag_at_base
- **Map Boundaries (4)**: distance to walls (top, bottom, left, right)
- **Scores (2)**: own_score, enemy_score (normalized)

### Action Space

- `0-3`: Movement (Up, Down, Left, Right)
- `4`: Stay still
- `5`: Tackle

### Game Mechanics

1. **Objective**: Capture the enemy flag 3 times or have the highest score after 500 steps
2. **Flag Carrier**: Moves 30% slower (carrier_speed_penalty = 0.3)
3. **Tackle**: Stuns enemies for ~1 second (20 steps @ 20 FPS, Cooldown: ~3.25s / 65 steps)
4. **Safe Zone**: Protection in own base
5. **Victory Condition**: First to 3 captures or highest score at timeout

### Reward Shaping Experiment

This project explores **three different reward profiles** to study the impact of reward shaping on learning behavior:

#### 🟡 Sparse (Charlie)
**Philosophy:** Reward only final outcomes
- Capture: +100
- Win/Lose: ±50
- Everything else: 0

**Result:** No measurable learning (Final Reward: 0.00)

#### 🔴 Dense / Micromanager (Gordon)
**Philosophy:** Reward almost every action
- Capture: +50
- Win/Lose: ±20
- Flag Pickup: +10
- Tackle (any): +3
- Tackle Flag Carrier: +8
- Flag Return: +5
- Distance Shaping: +0.15 to +0.3 per step
- Step Penalty: -0.01

**Result:** Moderate performance (Final Reward: 51.60) but high variance

#### 🟢 Balanced (Algernon) ✨ **Recommended**
**Philosophy:** Reward only critical milestones
- Capture: +100
- Win/Lose: ±30
- Tackle Flag Carrier: +8
- Flag Return: +5
- Distance Bonus: +0.1 per step (only for flag carriers)

**Result:** Best performance (Final Reward: 79.62, Explained Variance: 0.911)

## ⚙️ Configuration

### Environment Parameters

In `training/environment.py`:

```python
CaptureTheFlagEnv(
    grid_size=24,          # Grid dimensions
    max_steps=500,         # Episode length
    win_score=3,           # Captures to win
    stun_duration=20,      # Steps stunned (~1s @ 20 FPS)
    tackle_cooldown=65,    # Steps between tackles (~3.25s @ 20 FPS)
    tackle_range=2.0,      # Tackle distance
    carrier_speed_penalty=0.3  # Flag carrier slowdown (30%)
)
```

### PPO Hyperparameters

In `training/train.py`:

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

## 🔧 Troubleshooting

### Training Issues

**"ModuleNotFoundError"**
```bash
cd training
pip install -r requirements.txt
```

**Training too slow**
- Reduce `--timesteps` for testing (e.g., 100000)
- Increase `--envs` for more parallel environments (8 or 16)

**Model not learning**
- Check TensorBoard: `tensorboard --logdir training/logs`
- Reward should increase over time
- Adjust hyperparameters in `train.py` if needed

### Visualization Issues

**3D Viewer shows nothing**
1. Create a demo replay: `python export_replay.py --demo`
2. Server must run from project root (not `visualization/`)
3. Check browser console for errors

**Server won't start on port 8000**
```bash
# Use a different port
python -m http.server 8080
# Then open http://localhost:8080
```

### General Issues

**Performance problems in 3D Viewer**
- Use a modern browser (Chrome/Firefox recommended)
- Reduce replay length for faster loading

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

**Frameworks & Libraries:**
- [PettingZoo](https://pettingzoo.farama.org/) - Multi-Agent Environment Framework
- [Stable-Baselines3](https://stable-baselines3.readthedocs.io/) - PPO Implementation
- [Three.js](https://threejs.org/) - 3D Visualization
- [Chart.js](https://www.chartjs.org/) - Analytics Charts

**Inspiration:**
- OpenAI Hide and Seek
- DeepMind's Multi-Agent Research
- Classic CTF Game Design

---

**Made with ❤️ using Reinforcement Learning**

For questions or feedback, open an [Issue](https://github.com/yourusername/Reinforcement-Agent/issues)!
