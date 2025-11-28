/**
 * CTF AI - 3D Replay Visualization
 * Adapted from the original visualization/main.js
 */

// =====================================================
// GLOBALS
// =====================================================

let scene, camera, renderer;
let replayData = null;
let currentFrame = 0;
let isPlaying = true;
let playbackSpeed = 1;
let lastFrameTime = 0;
const FRAME_DURATION = 50;
let tackle_cooldown = 100;

// Meshes
const agentMeshes = {};
const flagMeshes = {};
const wallMeshes = [];
let blueBase, redBase, ground;

// Event tracking
let lastEvents = [];

// =====================================================
// INITIALIZATION
// =====================================================

function init() {
    setupScene();
    setupLights();
    setupGround();
    setupBases();
    setupWalls();
    setupControls();
    loadAvailableReplays();
    animate(0);
}

/**
 * Setup Three.js scene
 */
function setupScene() {
    const container = document.getElementById('canvas-container');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0f12);
    scene.fog = new THREE.Fog(0x0f0f12, 40, 80);

    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(12, 25, 35);
    camera.lookAt(12, 0, 12);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Camera controls (orbit)
    setupCameraControls();

    // Resize handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

/**
 * Setup camera orbit controls
 */
function setupCameraControls() {
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };

    renderer.domElement.addEventListener('mousedown', (e) => {
        isDragging = true;
        prevMouse = { x: e.clientX, y: e.clientY };
    });

    renderer.domElement.addEventListener('mouseup', () => {
        isDragging = false;
    });

    renderer.domElement.addEventListener('mouseleave', () => {
        isDragging = false;
    });

    renderer.domElement.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const dx = e.clientX - prevMouse.x;
        const dy = e.clientY - prevMouse.y;

        camera.position.x -= dx * 0.05;
        camera.position.z -= dy * 0.05;
        camera.lookAt(12, 0, 12);

        prevMouse = { x: e.clientX, y: e.clientY };
    });

    renderer.domElement.addEventListener('wheel', (e) => {
        camera.position.y += e.deltaY * 0.02;
        camera.position.y = Math.max(10, Math.min(50, camera.position.y));
    });
}

/**
 * Setup lighting
 */
function setupLights() {
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(20, 30, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);

    scene.add(new THREE.HemisphereLight(0x6c63ff, 0x0f0f12, 0.3));
}

/**
 * Setup ground plane and grid
 */
function setupGround() {
    const groundGeo = new THREE.PlaneGeometry(30, 30);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e });
    ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(12, -0.01, 12);
    ground.receiveShadow = true;
    scene.add(ground);

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

/**
 * Setup team bases
 */
function setupBases() {
    // Blue Base
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

    // Red Base
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

/**
 * Setup walls
 */
function setupWalls(customWalls = null) {
    clearWalls();

    const defaultWalls = [
        { x_min: 10, x_max: 11, y_min: 10, y_max: 11 },
        { x_min: 13, x_max: 14, y_min: 10, y_max: 11 },
        { x_min: 10, x_max: 11, y_min: 13, y_max: 14 },
        { x_min: 13, x_max: 14, y_min: 13, y_max: 14 },
        { x_min: 5, x_max: 7, y_min: 4, y_max: 5 },
        { x_min: 5, x_max: 7, y_min: 19, y_max: 20 },
        { x_min: 17, x_max: 19, y_min: 4, y_max: 5 },
        { x_min: 17, x_max: 19, y_min: 19, y_max: 20 }
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
        wallMeshes.push(wallMesh);
    });
}

function clearWalls() {
    wallMeshes.forEach(mesh => scene.remove(mesh));
    wallMeshes.length = 0;
}

/**
 * Setup UI controls
 */
function setupControls() {
    // Play button
    document.getElementById('play-btn').onclick = () => {
        isPlaying = true;
        document.getElementById('play-btn').classList.add('active');
        document.getElementById('pause-btn').classList.remove('active');
    };

    // Pause button
    document.getElementById('pause-btn').onclick = () => {
        isPlaying = false;
        document.getElementById('pause-btn').classList.add('active');
        document.getElementById('play-btn').classList.remove('active');
    };

    // Reset button
    document.getElementById('reset-btn').onclick = () => {
        currentFrame = 0;
        updateScene();
    };

    // Speed slider
    document.getElementById('speed-slider').oninput = (e) => {
        playbackSpeed = parseFloat(e.target.value);
        document.getElementById('speed-value').textContent = playbackSpeed + 'x';
    };

    // Upload button
    document.getElementById('upload-btn').onclick = () => {
        document.getElementById('file-input').click();
    };

    document.getElementById('file-input').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            loadReplayFromFile(file);
        }
    };

    // Sidebar toggle
    document.getElementById('sidebar-toggle').onclick = () => {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('collapsed');
    };
}

// =====================================================
// REPLAY LOADING
// =====================================================

/**
 * Load available replay files
 */
async function loadAvailableReplays() {
    const container = document.getElementById('replay-list');

    try {
        // Try to load from visualization/replays folder
        const replayFiles = [
            'demo_episode.json',
            'trained_episode_20251127_233628.json',
            'trained_episode_20251128_041358.json',
            'trained_episode_20251128_081536.json',
            'trained_Blue0v0Red_20251128_091347.json',
            'demo_Blue0v0Red_20251128_092056.json',
            'trained_Blue2v3Red_20251128_093045.json',
            'trained_episode_20251128_095115.json'
        ];

        let html = '';
        let loadedFirst = false;

        for (const file of replayFiles) {
            try {
                const response = await fetch(`../visualization/replays/${file}`, { method: 'HEAD' });
                if (response.ok) {
                    const fileName = file.replace('.json', '').replace(/_/g, ' ');
                    html += `
                        <div class="replay-item ${!loadedFirst ? 'active' : ''}" data-file="${file}">
                            ${fileName}
                        </div>
                    `;

                    if (!loadedFirst) {
                        await loadReplay(`../visualization/replays/${file}`);
                        loadedFirst = true;
                    }
                }
            } catch (err) {
                // File doesn't exist, skip
            }
        }

        if (html) {
            container.innerHTML = html;

            // Add click handlers
            document.querySelectorAll('.replay-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const file = item.dataset.file;
                    document.querySelectorAll('.replay-item').forEach(el => el.classList.remove('active'));
                    item.classList.add('active');
                    await loadReplay(`../visualization/replays/${file}`);
                });
            });
        } else {
            container.innerHTML = `
                <p style="color: var(--text-muted); font-size: 0.9rem;">
                    No replays found.<br>
                    Upload a replay file to get started.
                </p>
            `;
        }
    } catch (error) {
        console.error('Error loading replays:', error);
        container.innerHTML = `
            <p style="color: var(--text-muted); font-size: 0.9rem;">
                Upload a replay file to get started.
            </p>
        `;
    }
}

/**
 * Load replay from URL
 */
async function loadReplay(url) {
    showLoading();

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.frames || !Array.isArray(data.frames) || data.frames.length === 0) {
            throw new Error('Invalid replay data: no frames');
        }

        replayData = data;

        // Load metadata
        if (data.metadata && data.metadata.tackle_cooldown) {
            tackle_cooldown = data.metadata.tackle_cooldown;
        }

        // Load walls
        if (data.metadata && data.metadata.walls) {
            setupWalls(data.metadata.walls);
        } else {
            setupWalls();
        }

        clearAgents();
        createAgents();
        createFlags();

        currentFrame = 0;
        updateScene();

        hideLoading();
        console.log('Replay loaded:', data.frames.length, 'frames');
    } catch (error) {
        console.error('Error loading replay:', error);
        showError('Failed to load replay: ' + error.message);
    }
}

/**
 * Load replay from uploaded file
 */
function loadReplayFromFile(file) {
    showLoading();

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            if (!data.frames || !Array.isArray(data.frames) || data.frames.length === 0) {
                throw new Error('Invalid replay data: no frames');
            }

            replayData = data;

            if (data.metadata && data.metadata.tackle_cooldown) {
                tackle_cooldown = data.metadata.tackle_cooldown;
            }

            if (data.metadata && data.metadata.walls) {
                setupWalls(data.metadata.walls);
            } else {
                setupWalls();
            }

            clearAgents();
            createAgents();
            createFlags();

            currentFrame = 0;
            updateScene();

            hideLoading();

            // Update replay list
            const container = document.getElementById('replay-list');
            container.innerHTML = `
                <div class="replay-item active">
                    ${file.name}
                </div>
            `;

            console.log('Replay loaded from file:', data.frames.length, 'frames');
        } catch (error) {
            console.error('Error parsing replay:', error);
            showError('Failed to parse replay file');
        }
    };

    reader.onerror = () => {
        showError('Failed to read file');
    };

    reader.readAsText(file);
}

// =====================================================
// AGENTS & FLAGS
// =====================================================

function clearAgents() {
    Object.values(agentMeshes).forEach(m => scene.remove(m));
    Object.values(flagMeshes).forEach(m => scene.remove(m));
    Object.keys(agentMeshes).forEach(k => delete agentMeshes[k]);
    Object.keys(flagMeshes).forEach(k => delete flagMeshes[k]);
}

function createAgents() {
    if (!replayData || !replayData.frames || !replayData.frames[0]) return;

    const frame = replayData.frames[0];

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

        // Stun indicator
        const stunGeo = new THREE.RingGeometry(0.5, 0.7, 16);
        const stunMat = new THREE.MeshBasicMaterial({
            color: 0xffd43b,
            side: THREE.DoubleSide
        });
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

        const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const pole = new THREE.Mesh(poleGeo, poleMat);

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

// =====================================================
// UPDATE & ANIMATION
// =====================================================

function updateScene() {
    if (!replayData || !replayData.frames[currentFrame]) return;

    const frame = replayData.frames[currentFrame];

    // Update agents
    Object.entries(frame.agents).forEach(([id, data]) => {
        const mesh = agentMeshes[id];
        if (!mesh) return;

        const oldPos = mesh.position.clone();
        const targetPos = new THREE.Vector3(data.position[0], 0.8, data.position[1]);

        mesh.position.x += (data.position[0] - mesh.position.x) * 0.2;
        mesh.position.z += (data.position[1] - mesh.position.z) * 0.2;

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

        const movementSpeed = mesh.position.distanceTo(oldPos);

        if (data.has_flag) {
            mesh.position.y = targetPos.y + Math.sin(Date.now() * 0.01) * 0.1;
        } else {
            mesh.position.y = targetPos.y;
        }

        if (movementSpeed > 0.01 && !data.is_stunned) {
            const stretch = 1 + movementSpeed * 2;
            const squash = 1 / (1 + movementSpeed * 1.5);
            mesh.scale.y = stretch;
            mesh.scale.x = squash;
            mesh.scale.z = squash;
        } else {
            mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.2);
        }

        if (data.tackle_cooldown > tackle_cooldown - 5) {
            const lungeProgress = (tackle_cooldown - data.tackle_cooldown) / 5;
            const lungeAmount = Math.sin(lungeProgress * Math.PI) * 0.8;

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
        mesh.position.y = data.carried_by ? 1.5 : 1;
    });

    // Update UI
    document.getElementById('step-display').textContent = frame.step;
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

// =====================================================
// UI HELPERS
// =====================================================

function showLoading() {
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

function showError(message) {
    const overlay = document.getElementById('loading-overlay');
    overlay.innerHTML = `
        <div style="text-align: center; max-width: 400px;">
            <svg width="60" height="60" fill="#ff6b6b" viewBox="0 0 16 16">
                <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
            </svg>
            <h2 style="margin-top: 1rem; color: #ff6b6b;">Error</h2>
            <p style="margin-top: 1rem; color: var(--text-secondary);">${message}</p>
            <button onclick="location.reload()" class="cta-button" style="margin-top: 2rem;">Retry</button>
        </div>
    `;
    overlay.classList.remove('hidden');
}

// =====================================================
// START
// =====================================================

init();
