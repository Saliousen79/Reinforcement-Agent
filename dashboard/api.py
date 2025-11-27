"""
Flask API für das Analytics Dashboard.
Stellt Trainingsdaten über REST-Endpoints zur Verfügung.
"""

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)

DATA_DIR = "data"
REPLAY_DIR = "../visualization/replays"


@app.route("/")
def index():
    """Dashboard HTML servieren."""
    return send_from_directory(".", "index.html")


@app.route("/dashboard.js")
def dashboard_js():
    """Dashboard JavaScript servieren."""
    return send_from_directory(".", "dashboard.js")


@app.route("/api/training_logs")
def get_training_logs():
    """Trainingslogs als JSON zurückgeben."""
    log_path = os.path.join(DATA_DIR, "training_logs.json")

    if not os.path.exists(log_path):
        return jsonify({
            "error": "No training data found",
            "message": "Start training first: cd training && python train.py",
            "timesteps": [],
            "mean_reward": [],
            "std_reward": [],
            "episodes": [],
        }), 404

    with open(log_path, "r") as f:
        data = json.load(f)

    return jsonify(data)


@app.route("/api/episodes")
def list_episodes():
    """Liste aller verfügbaren Replay-Episoden."""
    if not os.path.exists(REPLAY_DIR):
        return jsonify({"episodes": []})

    episodes = []
    for filename in os.listdir(REPLAY_DIR):
        if filename.endswith(".json"):
            filepath = os.path.join(REPLAY_DIR, filename)
            with open(filepath, "r") as f:
                metadata = json.load(f).get("metadata", {})

            episodes.append({
                "filename": filename,
                "timestamp": metadata.get("timestamp", "unknown"),
                "final_scores": metadata.get("final_scores", {}),
                "total_steps": metadata.get("episode_stats", {}).get("total_steps", 0),
            })

    # Sortiere nach Timestamp
    episodes.sort(key=lambda x: x["timestamp"], reverse=True)

    return jsonify({"episodes": episodes})


@app.route("/api/episode/<filename>")
def get_episode(filename):
    """Einzelne Episode laden."""
    filepath = os.path.join(REPLAY_DIR, filename)

    if not os.path.exists(filepath):
        return jsonify({"error": "Episode not found"}), 404

    with open(filepath, "r") as f:
        data = json.load(f)

    return jsonify(data)


@app.route("/api/stats")
def get_stats():
    """Zusammenfassende Statistiken."""
    log_path = os.path.join(DATA_DIR, "training_logs.json")

    if not os.path.exists(log_path):
        return jsonify({
            "total_timesteps": 0,
            "total_episodes": 0,
            "mean_reward": 0,
            "best_reward": 0,
        })

    with open(log_path, "r") as f:
        data = json.load(f)

    timesteps = data.get("timesteps", [])
    rewards = data.get("mean_reward", [])
    episodes = data.get("episodes", [])

    stats = {
        "total_timesteps": timesteps[-1] if timesteps else 0,
        "total_episodes": episodes[-1] if episodes else 0,
        "mean_reward": rewards[-1] if rewards else 0,
        "best_reward": max(rewards) if rewards else 0,
        "worst_reward": min(rewards) if rewards else 0,
        "latest_std": data.get("std_reward", [])[-1] if data.get("std_reward") else 0,
    }

    return jsonify(stats)


@app.route("/api/health")
def health_check():
    """Health Check Endpoint."""
    return jsonify({
        "status": "healthy",
        "service": "CTF Analytics API",
        "version": "1.0.0",
    })


if __name__ == "__main__":
    # Erstelle data Verzeichnis falls nicht vorhanden
    os.makedirs(DATA_DIR, exist_ok=True)

    print("=" * 50)
    print("📊 CTF Analytics API Server")
    print("=" * 50)
    print("🌐 Dashboard: http://localhost:5000")
    print("📡 API: http://localhost:5000/api/")
    print("=" * 50)

    app.run(debug=True, host="0.0.0.0", port=5000)
