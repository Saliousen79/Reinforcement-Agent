"""
Test Script für Wand-Kollision
Testet, ob Agenten wirklich durch Wände blockiert werden.
"""

import numpy as np
from environment import CaptureTheFlagEnv

def test_wall_collision():
    """Testet ob Agenten durch Wände laufen können."""
    env = CaptureTheFlagEnv()
    obs, info = env.reset(seed=42)

    print("=== WAND-KOLLISIONS-TEST ===\n")

    # Zeige Wand-Konfiguration
    print("Wand-Positionen (Arena-Layout):")
    for i, wall in enumerate(env.walls):
        print(f"  Wand {i+1}: X=[{wall['x_min']}, {wall['x_max']}], Y=[{wall['y_min']}, {wall['y_max']}]")

    print("\n" + "="*50 + "\n")

    # Test 1: Agent direkt in Zentrum-Säule setzen
    print("TEST 1: Agent in Wand teleportieren")
    test_agent = "blue_0"

    # Setze Agent direkt VOR eine Wand (Säule bei x=10-11, y=10-11)
    env.agent_states[test_agent]["position"] = np.array([9.5, 10.5])
    print(f"Start-Position: {env.agent_states[test_agent]['position']}")

    # Versuche nach rechts zu laufen (direkt in die Wand bei x=10)
    print("\nVersuche 10 Schritte nach RECHTS zu gehen (in Richtung Wand)...")
    for step in range(10):
        old_pos = env.agent_states[test_agent]["position"].copy()

        # Action 3 = rechts
        actions = {agent: 4 for agent in env.agents}  # Alle stehen still
        actions[test_agent] = 3  # Nur test_agent geht rechts

        obs, rewards, terms, truncs, infos = env.step(actions)

        new_pos = env.agent_states[test_agent]["position"]
        moved = np.linalg.norm(new_pos - old_pos)

        # Prüfe ob in Wand
        in_wall = env._is_in_wall(new_pos)

        print(f"  Step {step+1}: Pos={new_pos}, Moved={moved:.3f}, In Wall={in_wall}")

        if in_wall:
            print("  [FEHLER] Agent ist IN einer Wand!")
            return False

    print("\n[OK] Test 1 bestanden: Agent konnte nicht durch Wand laufen\n")
    print("="*50 + "\n")

    # Test 2: Diagonal durch Wand
    print("TEST 2: Diagonal durch Wand versuchen")
    env.reset(seed=123)
    test_agent = "red_0"

    # Setze Agent südlich der Wand bei x=17-19, y=4-5
    env.agent_states[test_agent]["position"] = np.array([18.0, 3.0])
    print(f"Start-Position: {env.agent_states[test_agent]['position']}")

    print("\nVersuche nach OBEN zu gehen (in Richtung Wand bei y=4)...")
    for step in range(10):
        old_pos = env.agent_states[test_agent]["position"].copy()

        # Action 0 = oben
        actions = {agent: 4 for agent in env.agents}
        actions[test_agent] = 0

        obs, rewards, terms, truncs, infos = env.step(actions)

        new_pos = env.agent_states[test_agent]["position"]
        moved = np.linalg.norm(new_pos - old_pos)
        in_wall = env._is_in_wall(new_pos)

        print(f"  Step {step+1}: Pos={new_pos}, Moved={moved:.3f}, In Wall={in_wall}")

        if in_wall:
            print("  [FEHLER] Agent ist IN einer Wand!")
            return False

    print("\n[OK] Test 2 bestanden: Agent konnte nicht durch Wand laufen\n")
    print("="*50 + "\n")

    # Test 3: Prüfe ob Agent an Wand "klebt"
    print("TEST 3: Agent sollte an Wand stoppen")
    final_pos = env.agent_states[test_agent]["position"]

    # Agent sollte bei y < 4.0 sein (vor der Wand)
    if final_pos[1] >= 4.0:
        print(f"[FEHLER] Agent ist zu weit gegangen: y={final_pos[1]} (sollte < 4.0 sein)")
        print("  Agent ist moeglicherweise durch die Wand gelaufen!")
        return False
    else:
        print(f"[OK] Agent hat korrekt an der Wand gestoppt: y={final_pos[1]}")

    print("\n" + "="*50)
    print("[OK] ALLE TESTS BESTANDEN!")
    print("="*50)
    return True

if __name__ == "__main__":
    success = test_wall_collision()
    exit(0 if success else 1)
