# CTF AI - Portfolio Website

Modern portfolio website showcasing the Capture the Flag Multi-Agent Reinforcement Learning project.

## Features

### 1. Case Study Page (index.html)
- Scrollytelling design with smooth animations
- Scientific blog-post style documentation
- Video comparisons showing training progress
- Interactive SVG diagrams
- Key learnings and insights

### 2. Training Dashboard (dashboard.html)
- Interactive Chart.js visualizations
- Real-time training metrics
- Zoomable reward progression chart
- Episode length evolution
- Reward distribution histogram
- Performance insights and statistics

### 3. Live Demo (demo.html)
- 3D visualization using Three.js
- Theater mode presentation
- Interactive camera controls
- Replay file upload
- Side-by-side team scores
- Event log tracking

## File Structure

```
docs/
├── index.html          # Landing page & case study
├── dashboard.html      # Training metrics
├── demo.html          # 3D visualization
├── css/
│   └── style.css      # Global styling
├── js/
│   ├── dashboard.js   # Chart.js logic
│   └── demo.js        # Three.js visualization
├── data/
│   └── training_logs.json  # Training metrics
└── assets/
    └── videos/        # Gameplay videos (to be added)
```

## Setup for GitHub Pages

1. Push the `/docs` folder to your repository
2. Go to repository Settings → Pages
3. Set Source to "Deploy from branch"
4. Select branch: `main` and folder: `/docs`
5. Save and wait for deployment

Your site will be available at:
```
https://[username].github.io/[repository-name]/
```

## Adding Content

### Videos
Place video files in `docs/assets/videos/`:
- `hero-gameplay.mp4` - Hero section background
- `phase1-random.mp4` - Early training footage
- `phase2-trained.mp4` - Late training footage

### Replay Files
The demo page automatically loads replay files from `../visualization/replays/`.
Users can also upload their own replay files via the UI.

### Training Data
Update `docs/data/training_logs.json` with new training runs.
The dashboard will automatically visualize the latest data.

## Customization

### Colors
Edit CSS variables in `docs/css/style.css`:
```css
:root {
    --bg-primary: #0f0f12;
    --accent-green: #00ff88;
    --accent-blue: #00d4ff;
    /* ... */
}
```

### GitHub Link
Update the GitHub URL in all HTML files:
```html
<a href="https://github.com/yourusername/reinforcement-agent">
```

## Technologies Used

- **HTML5 & CSS3** - Structure and styling
- **Three.js** - 3D visualization
- **Chart.js** - Interactive charts
- **Vanilla JavaScript** - No framework dependencies
- **GitHub Pages** - Free hosting

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari 14+

## License

Same as parent project
