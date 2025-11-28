/**
 * Capture the Flag - Three.js 3D Visualisierung
 */

// Globals
let scene, camera, renderer;
let replayData = null;
let currentFrame = 0;
let isPlaying = true;
let playbackSpeed = 1;
let lastFrameTime = 0;
const FRAME_DURATION = 50;
let tackle_cooldown = 100; // Default, wird aus Metadaten überschrieben

// Meshes
const agentMeshes = {};
const flagMeshes = {};
const wallMeshes = [];  // Array für dynamische Wände
let blueBase, redBase, ground;

// =====================
// INIT
// =====================

function init() {
    setupScene();
    setupLights();
    setupGround();
    setupBases();
    setupWalls();
    setupControls();
    loadAvailableEpisodes();
    animate(0);
}

function setupScene() {
    const container = document.getElementById('canvas-container');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0f1a);
    scene.fog = new THREE.Fog(0x0f0f1a, 40, 80);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(12, 25, 35);
    camera.lookAt(12, 0, 12);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Simple orbit
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };

    renderer.domElement.addEventListener('mousedown', e => {
        isDragging = true;
        prevMouse = { x: e.clientX, y: e.clientY };
    });

    renderer.domElement.addEventListener('mouseup', () => isDragging = false);
    renderer.domElement.addEventListener('mouseleave', () => isDragging = false);

    renderer.domElement.addEventListener('mousemove', e => {
        if (!isDragging) return;
        const dx = e.clientX - prevMouse.x;
        const dy = e.clientY - prevMouse.y;

        camera.position.x -= dx * 0.05;
        camera.position.z -= dy * 0.05;
        camera.lookAt(12, 0, 12);

        prevMouse = { x: e.clientX, y: e.clientY };
    });

    renderer.domElement.addEventListener('wheel', e => {
        camera.position.y += e.deltaY * 0.02;
        camera.position.y = Math.max(10, Math.min(50, camera.position.y));
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function setupLights() {
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(20, 30, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);

    scene.add(new THREE.HemisphereLight(0x6c63ff, 0x0f0f1a, 0.3));
}

function setupGround() {
    // Main ground
    const groundGeo = new THREE.PlaneGeometry(30, 30);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e });
    ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(12, -0.01, 12);
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid
    const grid = new THREE.GridHelper(24, 24, 0x333366, 0x222244);
    grid.position.set(12, 0, 12);
    scene.add(grid);

    // Center line
    const lineMat = new THREE.LineBasicMaterial({ color: 0x666688 });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(12, 0.05, 0),
        new THREE.Vector3(12, 0.05, 24)
    ]);
    scene.add(new THREE.Line(lineGeo, lineMat));
}

function setupBases() {
    // Blue Base (links)
    const blueGeo = new THREE.PlaneGeometry(4, 8);
    const blueMat = new THREE.MeshStandardMaterial({
        color: 0x4dabf7,
        transparent: true,
        opacity: 0.3
    });
    blueBase = new THREE.Mesh(blueGeo, blueMat);
    blueBase.rotation.x = -Math.PI / 2;
    blueBase.position.set(2, 0.02, 12);
    scene.add(blueBase);

    // Red Base (rechts)
    const redGeo = new THREE.PlaneGeometry(4, 8);
    const redMat = new THREE.MeshStandardMaterial({
        color: 0xff6b6b,
        transparent: true,
        opacity: 0.3
    });
    redBase = new THREE.Mesh(redGeo, redMat);
    redBase.rotation.x = -Math.PI / 2;
    redBase.position.set(22, 0.02, 12);
    scene.add(redBase);
}

function clearWalls() {
    // Entferne alte Wände aus der Szene
    wallMeshes.forEach(mesh => scene.remove(mesh));
    wallMeshes.length = 0;
}

function setupWalls(customWalls = null) {
    // Lösche alte Wände zuerst
    clearWalls();

    // Standard "Die Arena" Layout - wird verwendet wenn kein customWalls übergeben wird
    const defaultWalls = [
        // --- ZENTRUM (Sichtschutz) ---
        // Vier Säulen, die einen "Platz" in der Mitte bilden
        { x_min: 10, x_max: 11, y_min: 10, y_max: 11 },
        { x_min: 13, x_max: 14, y_min: 10, y_max: 11 },
        { x_min: 10, x_max: 11, y_min: 13, y_max: 14 },
        { x_min: 13, x_max: 14, y_min: 13, y_max: 14 },

        // --- BLUE DEFENSE (Links) ---
        // Ein "Bunker" oben und unten zum Verstecken
        { x_min: 5, x_max: 7, y_min: 4, y_max: 5 },   // Unten
        { x_min: 5, x_max: 7, y_min: 19, y_max: 20 }, // Oben

        // --- RED DEFENSE (Rechts - Gespiegelt) ---
        { x_min: 17, x_max: 19, y_min: 4, y_max: 5 },   // Unten
        { x_min: 17, x_max: 19, y_min: 19, y_max: 20 }  // Oben
    ];

    const walls = customWalls || defaultWalls;

    walls.forEach(wall => {
        const width = wall.x_max - wall.x_min;
        const depth = wall.y_max - wall.y_min;
        const height = 2;

        const wallGeo = new THREE.BoxGeometry(width, height, depth);
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x2c2c2c,
            metalness: 0.3,
            roughness: 0.7
        });

        const wallMesh = new THREE.Mesh(wallGeo, wallMat);
        wallMesh.position.set(
            (wall.x_min + wall.x_max) / 2,
            height / 2,
            (wall.y_min + wall.y_max) / 2
        );
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;

        scene.add(wallMesh);
        wallMeshes.push(wallMesh);  // Zur Liste hinzufügen für späteres Löschen
    });
}

function setupControls() {
    document.getElementById('play-btn').onclick = () => {
        isPlaying = true;
        document.getElementById('play-btn').classList.add('active');
        document.getElementById('pause-btn').classList.remove('active');
    };

    document.getElementById('pause-btn').onclick = () => {
        isPlaying = false;
        document.getElementById('pause-btn').classList.add('active');
        document.getElementById('play-btn').classList.remove('active');
    };

    document.getElementById('reset-btn').onclick = () => {
        currentFrame = 0;
        updateScene();
    };

    document.getElementById('speed').oninput = e => {
        playbackSpeed = parseFloat(e.target.value);
        document.getElementById('speed-val').textContent = playbackSpeed + 'x';
    };

    document.getElementById('episode-select').onchange = e => {
        if (e.target.value) {
            loadEpisode(e.target.value);
        }
    };

    // File Upload Button
    document.getElementById('file-upload-btn').onclick = () => {
        document.getElementById('file-input').click();
    };

    document.getElementById('file-input').onchange = e => {
        const file = e.target.files[0];
        if (file) {
            loadEpisodeFromFile(file);
        }
    };
}

// =====================
// EPISODE LOADING
// =====================

async function loadAvailableEpisodes() {
    const select = document.getElementById('episode-select');

    // Versuche alle verfügbaren Episoden zu finden
    const possibleFiles = [
        'demo_episode.json',
        'episode_20251127_134405.json'  // Die generierte Episode
    ];

    let loaded = false;

    for (const file of possibleFiles) {
        try {
            const res = await fetch(`replays/${file}`, { method: 'HEAD' });
            if (res.ok) {
                const option = document.createElement('option');
                option.value = file;
                option.textContent = file.replace('.json', '').replace(/_/g, ' ');
                select.appendChild(option);

                // Lade die erste verfügbare Episode
                if (!loaded) {
                    await loadEpisode(file);
                    select.value = file;
                    loaded = true;
                }
            }
        } catch (err) {
            // Datei existiert nicht, ignorieren
        }
    }

    if (!loaded) {
        document.getElementById('loading').innerHTML = `
            <p>⚠️ Keine Episode gefunden</p>
            <p style="color:#888;font-size:0.8rem;margin-top:10px;">
                Klicke auf "📁 Replay laden" um eine Episode hochzuladen<br>
                oder erstelle eine Demo: python export_replay.py --demo
            </p>
        `;
    }
}

async function loadEpisode(filename) {
    document.getElementById('loading').style.display = 'block';

    try {
        const res = await fetch(`replays/${filename}`);
        const data = await res.json();

        // Validierung
        if (!data.frames || !Array.isArray(data.frames) || data.frames.length === 0) {
            throw new Error('Keine Frames in der Episode');
        }

        if (!data.frames[0].agents) {
            throw new Error('Keine Agent-Daten gefunden');
        }

        replayData = data;

        // Metadaten laden
        if (data.metadata && data.metadata.tackle_cooldown) {
            tackle_cooldown = data.metadata.tackle_cooldown;
        }

        // NEU: Wände aus Replay-Metadaten laden (falls vorhanden)
        if (data.metadata && data.metadata.walls) {
            console.log(`🗺️ Lade Map-Layout aus Replay (${data.metadata.walls.length} Wände)`);
            setupWalls(data.metadata.walls);
        } else {
            console.log('🗺️ Keine Map-Info im Replay - verwende Standard-Arena-Layout');
            setupWalls();  // Fallback auf Standard-Map
        }

        clearAgents();
        createAgents();
        createFlags();

        currentFrame = 0;
        updateScene();

        document.getElementById('loading').style.display = 'none';
        console.log(`✅ Episode geladen: ${filename} (${data.frames.length} Frames)`);

    } catch (err) {
        console.error('Load error:', err);
        document.getElementById('loading').innerHTML = `
            <p>⚠️ Konnte Episode nicht laden</p>
            <p style="color:#888;font-size:0.8rem;margin-top:10px;">
                ${err.message || 'Unbekannter Fehler'}<br><br>
                Klicke auf "📁 Replay laden" um eine Episode hochzuladen<br>
                oder erstelle eine Demo: python export_replay.py --demo
            </p>
        `;
    }
}

function loadEpisodeFromFile(file) {
    document.getElementById('loading').style.display = 'block';

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            // Validierung
            if (!data.frames || !Array.isArray(data.frames) || data.frames.length === 0) {
                throw new Error('Keine Frames gefunden');
            }

            if (!data.frames[0].agents) {
                throw new Error('Keine Agent-Daten gefunden');
            }

            // Daten sind gültig
            replayData = data;

            // Metadaten laden
            if (data.metadata && data.metadata.tackle_cooldown) {
                tackle_cooldown = data.metadata.tackle_cooldown;
            }

            // NEU: Wände aus Replay-Metadaten laden (falls vorhanden)
            if (data.metadata && data.metadata.walls) {
                console.log(`🗺️ Lade Map-Layout aus Replay (${data.metadata.walls.length} Wände)`);
                setupWalls(data.metadata.walls);
            } else {
                console.log('🗺️ Keine Map-Info im Replay - verwende Standard-Arena-Layout');
                setupWalls();  // Fallback auf Standard-Map
            }

            clearAgents();
            createAgents();
            createFlags();

            currentFrame = 0;
            updateScene();

            document.getElementById('loading').style.display = 'none';

            // Update dropdown
            const select = document.getElementById('episode-select');
            select.innerHTML = `<option value="">${file.name}</option>`;

            console.log(`✅ Episode geladen: ${data.frames.length} Frames`);

        } catch (err) {
            console.error('Parse error:', err);
            document.getElementById('loading').innerHTML = `
                <p>⚠️ Fehler beim Laden der Datei</p>
                <p style="color:#888;font-size:0.8rem;margin-top:10px;">
                    ${err.message || 'Ungültiges JSON-Format'}<br><br>
                    Stelle sicher, dass die Datei mit export_replay.py erstellt wurde.
                </p>
            `;
        }
    };

    reader.onerror = () => {
        document.getElementById('loading').innerHTML = `
            <p>⚠️ Fehler beim Lesen der Datei</p>
        `;
    };

    reader.readAsText(file);
}

function clearAgents() {
    Object.values(agentMeshes).forEach(m => scene.remove(m));
    Object.values(flagMeshes).forEach(m => scene.remove(m));
    Object.keys(agentMeshes).forEach(k => delete agentMeshes[k]);
    Object.keys(flagMeshes).forEach(k => delete flagMeshes[k]);
}

function createAgents() {
    if (!replayData || !replayData.frames || !replayData.frames[0]) {
        console.error('Keine Replay-Daten verfügbar');
        return;
    }

    const frame = replayData.frames[0];

    if (!frame.agents) {
        console.error('Keine Agent-Daten im ersten Frame');
        return;
    }

    Object.entries(frame.agents).forEach(([id, data]) => {
        const isBlue = data.team === 'blue';
        const color = isBlue ? 0x4dabf7 : 0xff6b6b;

        // Body
        const bodyGeo = new THREE.CapsuleGeometry(0.4, 0.8, 8, 16);
        const bodyMat = new THREE.MeshStandardMaterial({ color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.1);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.15, 0.3, 0.35);
        body.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.15, 0.3, 0.35);
        body.add(rightEye);

        // Stun indicator (hidden initially)
        const stunGeo = new THREE.RingGeometry(0.5, 0.7, 16);
        const stunMat = new THREE.MeshBasicMaterial({ color: 0xffd43b, side: THREE.DoubleSide });
        const stunRing = new THREE.Mesh(stunGeo, stunMat);
        stunRing.rotation.x = -Math.PI / 2;
        stunRing.position.y = 1.5;
        stunRing.visible = false;
        stunRing.name = 'stunRing';
        body.add(stunRing);

        body.position.set(data.position[0], 0.8, data.position[1]);
        body.userData = { team: data.team, originalColor: color };

        scene.add(body);
        agentMeshes[id] = body;
    });
}

function createFlags() {
    ['blue', 'red'].forEach(team => {
        const isBlue = team === 'blue';
        const color = isBlue ? 0x4dabf7 : 0xff6b6b;

        // Pole
        const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const pole = new THREE.Mesh(poleGeo, poleMat);

        // Flag cloth
        const flagGeo = new THREE.PlaneGeometry(0.8, 0.5);
        const flagMat = new THREE.MeshStandardMaterial({
            color,
            side: THREE.DoubleSide,
            emissive: color,
            emissiveIntensity: 0.3,
        });
        const flag = new THREE.Mesh(flagGeo, flagMat);
        flag.position.set(0.4, 0.5, 0);
        pole.add(flag);

        pole.position.set(isBlue ? 2 : 22, 1, 12);

        scene.add(pole);
        flagMeshes[team] = pole;
    });
}

// =====================
// UPDATE & ANIMATION
// =====================

function updateScene() {
    if (!replayData || !replayData.frames[currentFrame]) return;

    const frame = replayData.frames[currentFrame];

    // Update agents
    Object.entries(frame.agents).forEach(([id, data]) => {
        const mesh = agentMeshes[id];
        if (!mesh) return;

        // Alte Position für Animationen speichern
        const oldPos = mesh.position.clone();
        const targetPos = new THREE.Vector3(data.position[0], 0.8, data.position[1]);

        // Position
        mesh.position.x += (data.position[0] - mesh.position.x) * 0.2;
        mesh.position.z += (data.position[1] - mesh.position.z) * 0.2;

        // Stun effect
        const stunRing = mesh.getObjectByName('stunRing');
        if (stunRing) {
            stunRing.visible = data.is_stunned;
            if (data.is_stunned) {
                stunRing.rotation.z += 0.1;
                mesh.material.color.setHex(0x666666);
            } else {
                mesh.material.color.setHex(mesh.userData.originalColor);
            }
        }

        // Has flag glow
        const movementSpeed = mesh.position.distanceTo(oldPos);

        if (data.has_flag) { // Bobbing, wenn Flagge getragen wird
            mesh.position.y = targetPos.y + Math.sin(Date.now() * 0.01) * 0.1;
        } else {
            mesh.position.y = targetPos.y;
        }

        // "Squash and Stretch" Lauf-Animation
        if (movementSpeed > 0.01 && !data.is_stunned) {
            const stretch = 1 + movementSpeed * 2;
            const squash = 1 / (1 + movementSpeed * 1.5);
            mesh.scale.y = stretch;
            mesh.scale.x = squash;
            mesh.scale.z = squash;
        } else {
            // Zurück zur normalen Skalierung
            mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.2);
        }

        // Tackle "Lunge"-Animation
        if (data.tackle_cooldown > tackle_cooldown - 5) { // 5 Frames nach dem Tackle
            const lungeProgress = (tackle_cooldown - data.tackle_cooldown) / 5;
            const lungeAmount = Math.sin(lungeProgress * Math.PI) * 0.8; // Vor und zurück

            const direction = new THREE.Vector3().subVectors(targetPos, oldPos).normalize();
            if (direction.length() > 0) {
                mesh.position.add(direction.multiplyScalar(lungeAmount));
            }
        }

    });

    // Update flags
    Object.entries(frame.flags).forEach(([team, data]) => {
        const mesh = flagMeshes[team];
        if (!mesh) return;

        mesh.position.x += (data.position[0] - mesh.position.x) * 0.2;
        mesh.position.z += (data.position[1] - mesh.position.z) * 0.2;

        // Carried flag is higher
        mesh.position.y = data.carried_by ? 1.5 : 1;
    });

    // Update UI
    document.getElementById('step-display').textContent = `Step: ${frame.step}`;
    document.getElementById('blue-score').textContent = frame.scores.blue;
    document.getElementById('red-score').textContent = frame.scores.red;
}

function animate(timestamp) {
    requestAnimationFrame(animate);

    if (isPlaying && replayData) {
        const elapsed = timestamp - lastFrameTime;
        if (elapsed > FRAME_DURATION / playbackSpeed) {
            currentFrame++;
            if (currentFrame >= replayData.frames.length) {
                currentFrame = 0;
            }
            lastFrameTime = timestamp;
        }
    }

    updateScene();
    renderer.render(scene, camera);
}

// Start
init();
