import json

with open('demo_Blue0v0Red_20251128_092056.json') as f:
    data = json.load(f)

walls = data['metadata']['walls']
print(f'Anzahl Waende: {len(walls)}')
print('\nAlle Waende:')
for i, w in enumerate(walls):
    print(f'  {i+1}. x=[{w["x_min"]},{w["x_max"]}], y=[{w["y_min"]},{w["y_max"]}]')
