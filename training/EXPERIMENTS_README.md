# Portfolio Experiments: 3 Reward Structures

Dieses Experiment vergleicht **3 verschiedene Reward-Strategien** für das Capture the Flag Reinforcement Learning Spiel.

## 🎯 Experiment-Ziel

**Forschungsfrage:** Wie beeinflusst die Reward-Struktur das Lernverhalten und die finale Performance?

## 📊 Die 3 Experimente

### 1️⃣ **Micromanager** (Heavy Shaping)
Belohnt **jeden kleinen Schritt** in die richtige Richtung.

**Rewards:**
- ✅ Capture: +50.0
- ✅ Win/Loss: ±20.0
- ✅ **Flag Pickup:** +10.0
- ✅ **Distance to Flag:** +0.2 (ALLE Agenten)
- ✅ **Carrier Distance:** +0.3 (Richtung Base)
- ✅ **Tackle Any:** +3.0 (Jeder Tackle)
- ✅ **Tackle Flag Carrier:** +8.0
- ✅ **Flag Return:** +5.0
- ✅ **Distance to Carrier:** +0.15 (Defense)
- ⚠️ **Step Penalty:** -0.01 (Anti-Idle)

**Hypothese:** Lernt schneller, könnte aber in lokalen Optima hängenbleiben (reward hacking).

---

### 2️⃣ **Sparse** (Pure Minimalist)
Belohnt **NUR das Endergebnis** - keine Hilfe während des Spiels.

**Rewards:**
- ✅ Capture: +100.0
- ✅ Win/Loss: ±50.0
- ❌ Alles andere: **0.0**

**Hypothese:** Braucht länger zum Lernen, entwickelt aber kreative Strategien.

---

### 3️⃣ **Balanced** (Current Best Practice)
Belohnt **kritische Momente**, aber nicht jeden Schritt.

**Rewards:**
- ✅ Capture: +100.0
- ✅ Win/Loss: ±30.0
- ✅ **Carrier Distance:** +0.1 (NUR wenn Flagge getragen wird)
- ✅ **Tackle Flag Carrier:** +8.0
- ✅ **Flag Return:** +5.0

**Hypothese:** Bester Kompromiss - schnelles Lernen + strategische Tiefe.

---

## 🚀 Training starten

### Option 1: Alle 3 Experimente automatisch (empfohlen)

```bash
cd training
python train_all_experiments.py
```

**Dauer:** ~6-12 Stunden (je nach CPU)
**Checkpoints:** Bei 10M, 20M, 30M, ..., 100M Steps

---

### Option 2: Einzelne Experimente

#### Micromanager
```bash
python train.py --name Micromanager --profile micromanager --timesteps 100000000
```

#### Sparse
```bash
python train.py --name Sparse --profile sparse --timesteps 100000000
```

#### Balanced
```bash
python train.py --name Balanced --profile balanced --timesteps 100000000
```

---

## 📁 Resultierende Struktur

Nach dem Training:

```
training/
├── models/
│   ├── Micromanager_10000000_steps.zip    # 10M Checkpoint
│   ├── Micromanager_50000000_steps.zip    # 50M Checkpoint
│   ├── Micromanager_final.zip             # 100M Final
│   ├── Sparse_10000000_steps.zip
│   ├── Sparse_50000000_steps.zip
│   ├── Sparse_final.zip
│   ├── Balanced_10000000_steps.zip
│   ├── Balanced_50000000_steps.zip
│   └── Balanced_final.zip
├── logs/
│   ├── PPO_Micromanager/                  # TensorBoard Daten
│   ├── PPO_Sparse/
│   └── PPO_Balanced/
└── replays/
    ├── Micromanager_10M.json              # Nach Replay-Generierung
    ├── Micromanager_50M.json
    ├── Micromanager_100M.json
    └── ... (9 Replays total)
```

---

## 🎬 Replays erstellen

Nach dem Training, Replays für alle Checkpoints generieren:

```bash
python create_checkpoint_replays.py
```

**Output:** 9 JSON-Replays (3 Modelle × 3 Checkpoints)

---

## 📈 Analyse & Vergleich

### 1. TensorBoard starten

```bash
tensorboard --logdir training/logs
```

**Vergleiche:**
- Mean Reward über Zeit
- Episode Length
- Learning Curve

### 2. Dashboard verwenden

Öffne dein Dashboard und lade die Replays:
- Micromanager_10M.json vs Sparse_10M.json vs Balanced_10M.json
- Vergleiche Spielstil und Taktiken

### 3. Metriken analysieren

In `training_logs.json` findest du:
- Reward-Verlauf
- Episode Length
- Progress-Tracking

---

## 🔬 Erwartete Ergebnisse

| Metrik | Micromanager | Sparse | Balanced |
|--------|--------------|--------|----------|
| **Lerngeschwindigkeit** | ⚡ Schnell | 🐢 Langsam | 🚀 Mittel |
| **Finale Performance** | ? | ? | ? |
| **Spielstil** | Aggressiv | Kreativ | Strategisch |
| **Reward Hacking** | ⚠️ Risiko | ✅ Sicher | ✅ Sicher |

---

## 📝 Portfolio-Dokumentation

### Was du zeigen kannst:

1. **Problem Statement:** "Wie beeinflusst Reward Shaping das RL-Lernen?"
2. **Experiment-Design:** 3 verschiedene Reward-Strukturen
3. **Implementation:** Code-Snippets von `REWARD_PROFILES`
4. **Ergebnisse:** TensorBoard Grafiken + Replay-Videos
5. **Diskussion:** Welches Profil war am besten? Warum?

### Beispiel-Grafiken:

- Reward-Kurven aller 3 Modelle (übereinander)
- Vergleich bei 10M, 50M, 100M
- Heatmap: Wo bewegen sich die Agenten? (aus Replays)

---

## ⚙️ Troubleshooting

### Training dauert zu lange?
- Reduziere `--timesteps` auf 10M für schnelle Tests
- Erhöhe `--envs` auf 16 (wenn genug CPU-Kerne)

### Modell lernt nicht?
- Check TensorBoard: Ist der Reward steigend?
- Sparse braucht VIEL länger - sei geduldig!

### Checkpoint fehlt?
- Check `cleanup_checkpoints=False` in `train.py`
- Möglicherweise wurde Training abgebrochen

---

## 🎓 Wissenschaftliche Quellen

Für deine Dokumentation:

1. **Ng, A. Y., Harada, D., & Russell, S. (1999).** "Policy invariance under reward transformations: Theory and application to reward shaping."
2. **OpenAI Spinning Up:** https://spinningup.openai.com/en/latest/spinningup/rl_intro3.html#reward-shaping
3. **Stable Baselines3 Docs:** https://stable-baselines3.readthedocs.io/

---

## ✨ Viel Erfolg!

Bei Fragen oder Problemen, check die Logs oder öffne ein Issue im Repo.

**Happy Training! 🚀**
