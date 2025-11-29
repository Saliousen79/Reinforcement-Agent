/**
 * Capture the Flag - Three.js 3D Visualisierung
 * Verbesserte Version mit besseren Animationen und Indikatoren
 */

// Globals
let scene, camera, renderer;
let replayData = null;
let currentFrame = 0;
let isPlaying = true;
let playbackSpeed = 1;
let lastFrameTime = 0;
const FRAME_DURATION = 50;
let tackle_cooldown = 100;
let stun_duration = 50; // Default, wird aus Metadaten überschrieben

// Meshes
const agentMeshes = {};
const flagMeshes = {};
const wallMeshes = [];
let blueBase, redBase, ground;

// Animation time
let animationTime = 0;

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

    const lineMat = new THREE.LineBasicMaterial({ color: 0x666688 });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(12, 0.05, 0),
        new THREE.Vector3(12, 0.05, 24)
    ]);
    scene.add(new THREE.Line(lineGeo, lineMat));
}

function setupBases() {
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
    wallMeshes.forEach(mesh => scene.remove(mesh));
    wallMeshes.length = 0;
}

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
            loadEpisodeById(e.target.value);
        }
    };

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

// Aktuell geladenes Replay (für Kontext)
let currentReplayInfo = null;

async function loadAvailableEpisodes() {
    const select = document.getElementById('episode-select');
    
    // Embedded Replays aus der Konfiguration laden
    const embeddedReplays = window.EMBEDDED_REPLAYS || [];
    
    let loaded = false;

    for (const replay of embeddedReplays) {
        try {
            const res = await fetch(`replays/${replay.filename}`, { method: 'HEAD' });
            if (res.ok) {
                const option = document.createElement('option');
                option.value = replay.id;
                option.textContent = replay.title;
                option.dataset.filename = replay.filename;
                select.appendChild(option);

                // Lade das erste verfügbare Replay
                if (!loaded) {
                    await loadEpisodeById(replay.id);
                    select.value = replay.id;
                    loaded = true;
                }
            }
        } catch (err) {
            console.log(`Replay ${replay.filename} nicht gefunden`);
        }
    }

    if (!loaded) {
        document.getElementById('loading').innerHTML = `
            <p>⚠️ Keine Episode gefunden</p>
            <p style="color:#888;font-size:0.8rem;margin-top:10px;">
                Klicke auf "📁 Eigenes Replay" um eine Episode hochzuladen<br>
                oder erstelle eine Demo: python export_replay.py --demo
            </p>
        `;
        updateReplayContext(null);
    }
}

// Replay anhand der ID laden
async function loadEpisodeById(replayId) {
    const embeddedReplays = window.EMBEDDED_REPLAYS || [];
    const replayInfo = embeddedReplays.find(r => r.id === replayId);
    
    if (replayInfo) {
        currentReplayInfo = replayInfo;
        await loadEpisode(replayInfo.filename);
        updateReplayContext(replayInfo);
    }
}

// Kontext-Panel aktualisieren
function updateReplayContext(replayInfo) {
    const titleEl = document.getElementById('replay-title');
    const descEl = document.getElementById('replay-description');
    const tagsEl = document.getElementById('replay-tags');
    const metaEl = document.getElementById('replay-meta');
    
    if (!replayInfo) {
        titleEl.textContent = 'Kein Replay geladen';
        descEl.innerHTML = '<p id="no-replay-hint">Wähle ein Replay aus der Liste oder lade eine eigene Datei.</p>';
        tagsEl.innerHTML = '';
        metaEl.style.display = 'none';
        return;
    }
    
    titleEl.textContent = replayInfo.title || 'Unbenanntes Replay';
    descEl.innerHTML = replayInfo.description || '<p>Keine Beschreibung verfügbar.</p>';
    
    // Tags anzeigen
    tagsEl.innerHTML = '';
    if (replayInfo.tags && replayInfo.tags.length > 0) {
        replayInfo.tags.forEach(tag => {
            const tagEl = document.createElement('span');
            tagEl.className = `replay-tag tag-${tag}`;
            tagEl.textContent = tag;
            tagsEl.appendChild(tagEl);
        });
    }
    
    // Metadaten aktualisieren wenn Replay geladen
    if (replayData) {
        metaEl.style.display = 'block';
        document.getElementById('meta-frames').textContent = replayData.frames?.length || '-';
        
        const agentCount = replayData.frames?.[0]?.agents ? Object.keys(replayData.frames[0].agents).length : '-';
        document.getElementById('meta-agents').textContent = agentCount;
        
        const mapName = replayData.metadata?.map_name || 'Standard Arena';
        document.getElementById('meta-map').textContent = mapName;
    }
}

async function loadEpisode(filename) {
    document.getElementById('loading').style.display = 'block';

    try {
        const res = await fetch(`replays/${filename}`);
        const data = await res.json();

        if (!data.frames || !Array.isArray(data.frames) || data.frames.length === 0) {
            throw new Error('Keine Frames in der Episode');
        }

        if (!data.frames[0].agents) {
            throw new Error('Keine Agent-Daten gefunden');
        }

        replayData = data;

        if (data.metadata && data.metadata.tackle_cooldown) {
            tackle_cooldown = data.metadata.tackle_cooldown;
        }
        
        if (data.metadata && data.metadata.stun_duration) {
            stun_duration = data.metadata.stun_duration;
        }

        if (data.metadata && data.metadata.walls) {
            console.log(`🗺️ Lade Map-Layout aus Replay (${data.metadata.walls.length} Wände)`);
            setupWalls(data.metadata.walls);
        } else {
            console.log('🗺️ Keine Map-Info im Replay - verwende Standard-Arena-Layout');
            setupWalls();
        }

        clearAgents();
        createAgents();
        createFlags();

        currentFrame = 0;
        updateScene();

        document.getElementById('loading').style.display = 'none';
        
        // Metadaten im Kontext-Panel aktualisieren
        if (currentReplayInfo) {
            updateReplayContext(currentReplayInfo);
        }
        
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

            if (!data.frames || !Array.isArray(data.frames) || data.frames.length === 0) {
                throw new Error('Keine Frames gefunden');
            }

            if (!data.frames[0].agents) {
                throw new Error('Keine Agent-Daten gefunden');
            }

            replayData = data;

            if (data.metadata && data.metadata.tackle_cooldown) {
                tackle_cooldown = data.metadata.tackle_cooldown;
            }
            
            if (data.metadata && data.metadata.stun_duration) {
                stun_duration = data.metadata.stun_duration;
            }

            if (data.metadata && data.metadata.walls) {
                console.log(`🗺️ Lade Map-Layout aus Replay (${data.metadata.walls.length} Wände)`);
                setupWalls(data.metadata.walls);
            } else {
                console.log('🗺️ Keine Map-Info im Replay - verwende Standard-Arena-Layout');
                setupWalls();
            }

            clearAgents();
            createAgents();
            createFlags();

            currentFrame = 0;
            updateScene();

            document.getElementById('loading').style.display = 'none';

            const select = document.getElementById('episode-select');
            select.innerHTML = `<option value="">${file.name}</option>`;
            
            // Kontext für benutzerdefiniertes Replay
            currentReplayInfo = {
                id: 'custom',
                filename: file.name,
                title: file.name.replace('.json', '').replace(/_/g, ' '),
                description: '<p>Benutzerdefiniertes Replay aus lokaler Datei.</p>',
                tags: ['custom']
            };
            updateReplayContext(currentReplayInfo);

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

// =====================
// AGENT CREATION (VERBESSERT)
// =====================

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

        // Haupt-Container für den Agenten
        const agent = new THREE.Group();
        agent.userData = { 
            team: data.team, 
            originalColor: color,
            lastPosition: new THREE.Vector3(data.position[0], 0.8, data.position[1]),
            velocity: new THREE.Vector3()
        };

        // Body
        const bodyGeo = new THREE.CapsuleGeometry(0.4, 0.8, 8, 16);
        const bodyMat = new THREE.MeshStandardMaterial({ 
            color,
            metalness: 0.1,
            roughness: 0.8
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;
        body.name = 'body';
        agent.add(body);

        // Kopf-Container (für Augen und Effekte)
        const head = new THREE.Group();
        head.position.y = 0.3;
        head.name = 'head';
        body.add(head);

        // Normale Augen (weiß mit schwarzer Pupille)
        const eyeGroup = new THREE.Group();
        eyeGroup.name = 'normalEyes';
        
        // Linkes Auge
        const leftEyeWhite = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        leftEyeWhite.position.set(-0.15, 0, 0.35);
        eyeGroup.add(leftEyeWhite);

        const leftPupil = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x111111 })
        );
        leftPupil.position.set(-0.15, 0, 0.42);
        leftPupil.name = 'leftPupil';
        eyeGroup.add(leftPupil);

        // Rechtes Auge
        const rightEyeWhite = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        rightEyeWhite.position.set(0.15, 0, 0.35);
        eyeGroup.add(rightEyeWhite);

        const rightPupil = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x111111 })
        );
        rightPupil.position.set(0.15, 0, 0.42);
        rightPupil.name = 'rightPupil';
        eyeGroup.add(rightPupil);

        head.add(eyeGroup);

        // X-Augen für Betäubung (versteckt)
        const stunnedEyes = createXEyes();
        stunnedEyes.name = 'stunnedEyes';
        stunnedEyes.visible = false;
        head.add(stunnedEyes);

        // Kreisende Sterne für Betäubung
        const stars = createStunStars();
        stars.name = 'stunStars';
        stars.visible = false;
        stars.position.y = 0.5;
        head.add(stars);

        // Stun Cooldown Balken (kreisförmig um den Agenten)
        const stunCooldown = createStunCooldownRing();
        stunCooldown.name = 'stunCooldown';
        stunCooldown.visible = false;
        agent.add(stunCooldown);

        // Flaggen-Träger Aura (versteckt)
        const aura = createFlagCarrierAura(color);
        aura.name = 'flagAura';
        aura.visible = false;
        agent.add(aura);

        // Tackle Impact Ring (versteckt)
        const impactRing = createImpactRing();
        impactRing.name = 'impactRing';
        impactRing.visible = false;
        agent.add(impactRing);

        agent.position.set(data.position[0], 0.8, data.position[1]);

        scene.add(agent);
        agentMeshes[id] = agent;
    });
}

// X-förmige Augen für Betäubung
function createXEyes() {
    const group = new THREE.Group();
    
    const lineMat = new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 3 });
    
    // Linkes X
    const leftX = new THREE.Group();
    const l1 = createLine(-0.08, 0.08, -0.08, 0.08, lineMat);
    const l2 = createLine(-0.08, -0.08, 0.08, 0.08, lineMat);
    leftX.add(l1, l2);
    leftX.position.set(-0.15, 0, 0.4);
    group.add(leftX);

    // Rechtes X
    const rightX = new THREE.Group();
    const r1 = createLine(-0.08, 0.08, -0.08, 0.08, lineMat);
    const r2 = createLine(-0.08, -0.08, 0.08, 0.08, lineMat);
    rightX.add(r1, r2);
    rightX.position.set(0.15, 0, 0.4);
    group.add(rightX);

    return group;
}

function createLine(x1, x2, y1, y2, material) {
    const points = [
        new THREE.Vector3(x1, y1, 0),
        new THREE.Vector3(x2, y2, 0)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return new THREE.Line(geometry, material);
}

// Kreisende Sterne für Betäubung
function createStunStars() {
    const group = new THREE.Group();
    
    const starCount = 4;
    for (let i = 0; i < starCount; i++) {
        const star = createStar(0xffd43b);
        const angle = (i / starCount) * Math.PI * 2;
        star.position.set(
            Math.cos(angle) * 0.5,
            0,
            Math.sin(angle) * 0.5
        );
        star.userData.orbitAngle = angle;
        group.add(star);
    }
    
    return group;
}

// Stun Cooldown Ring - zeigt verbleibende Betäubungszeit
function createStunCooldownRing() {
    const group = new THREE.Group();
    
    // Hintergrund-Ring (dunkel)
    const bgRing = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 0.65, 32),
        new THREE.MeshBasicMaterial({ 
            color: 0x333333, 
            transparent: true, 
            opacity: 0.5,
            side: THREE.DoubleSide
        })
    );
    bgRing.rotation.x = -Math.PI / 2;
    bgRing.position.y = -0.75;
    bgRing.name = 'bgRing';
    group.add(bgRing);
    
    // Fortschritts-Ring (wird animiert) - wir nutzen mehrere Segmente
    const segments = 32;
    for (let i = 0; i < segments; i++) {
        const angle1 = (i / segments) * Math.PI * 2;
        const angle2 = ((i + 1) / segments) * Math.PI * 2;
        
        const shape = new THREE.Shape();
        shape.moveTo(Math.cos(angle1) * 0.55, Math.sin(angle1) * 0.55);
        shape.lineTo(Math.cos(angle1) * 0.65, Math.sin(angle1) * 0.65);
        shape.lineTo(Math.cos(angle2) * 0.65, Math.sin(angle2) * 0.65);
        shape.lineTo(Math.cos(angle2) * 0.55, Math.sin(angle2) * 0.55);
        shape.closePath();
        
        const segment = new THREE.Mesh(
            new THREE.ShapeGeometry(shape),
            new THREE.MeshBasicMaterial({ 
                color: 0xff6b6b, 
                transparent: true, 
                opacity: 0.9,
                side: THREE.DoubleSide
            })
        );
        segment.rotation.x = -Math.PI / 2;
        segment.position.y = -0.74;
        segment.name = `segment_${i}`;
        segment.userData.segmentIndex = i;
        group.add(segment);
    }
    
    // Cooldown Text (wird per CSS Sprite gemacht - hier nur Platzhalter)
    
    return group;
}

function createStar(color) {
    const shape = new THREE.Shape();
    const outerRadius = 0.08;
    const innerRadius = 0.03;
    const spikes = 5;
    
    for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    shape.closePath();
    
    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({ 
        color, 
        side: THREE.DoubleSide 
    });
    const star = new THREE.Mesh(geometry, material);
    star.rotation.x = -Math.PI / 2;
    
    return star;
}

// Flaggen-Träger Aura
function createFlagCarrierAura(teamColor) {
    const group = new THREE.Group();
    
    // Innerer Ring
    const innerRing = new THREE.Mesh(
        new THREE.RingGeometry(0.6, 0.8, 32),
        new THREE.MeshBasicMaterial({ 
            color: 0xffd43b, 
            transparent: true, 
            opacity: 0.6,
            side: THREE.DoubleSide
        })
    );
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = -0.7;
    innerRing.name = 'innerRing';
    group.add(innerRing);
    
    // Äußerer pulsierender Ring
    const outerRing = new THREE.Mesh(
        new THREE.RingGeometry(0.9, 1.1, 32),
        new THREE.MeshBasicMaterial({ 
            color: 0xffd43b, 
            transparent: true, 
            opacity: 0.3,
            side: THREE.DoubleSide
        })
    );
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.y = -0.7;
    outerRing.name = 'outerRing';
    group.add(outerRing);

    // Aufsteigender Partikel-Effekt (vertikale Linien)
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const particle = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.3, 0.05),
            new THREE.MeshBasicMaterial({ 
                color: 0xffd43b, 
                transparent: true, 
                opacity: 0.5 
            })
        );
        particle.position.set(
            Math.cos(angle) * 0.7,
            0,
            Math.sin(angle) * 0.7
        );
        particle.userData.baseAngle = angle;
        particle.name = `particle_${i}`;
        group.add(particle);
    }
    
    return group;
}

// Impact Ring für Tackle
function createImpactRing() {
    const group = new THREE.Group();
    
    // Mehrere Ringe für den Effekt
    for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.3 + i * 0.3, 0.4 + i * 0.3, 16),
            new THREE.MeshBasicMaterial({ 
                color: 0xff4444, 
                transparent: true, 
                opacity: 0.8 - i * 0.2,
                side: THREE.DoubleSide
            })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.name = `ring_${i}`;
        group.add(ring);
    }
    
    return group;
}

// =====================
// FLAG CREATION
// =====================

function createFlags() {
    ['blue', 'red'].forEach(team => {
        const isBlue = team === 'blue';
        const color = isBlue ? 0x4dabf7 : 0xff6b6b;

        const flagGroup = new THREE.Group();
        flagGroup.userData = { team, isCarried: false };

        // Pole
        const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.name = 'pole';
        flagGroup.add(pole);

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
        flag.name = 'cloth';
        pole.add(flag);

        // Glow-Effekt für die Flagge
        const glow = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 16, 16),
            new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.2
            })
        );
        glow.position.y = 0.5;
        glow.name = 'glow';
        flagGroup.add(glow);

        flagGroup.position.set(isBlue ? 2 : 22, 1, 12);

        scene.add(flagGroup);
        flagMeshes[team] = flagGroup;
    });
}

// =====================
// UPDATE & ANIMATION
// =====================

function updateScene() {
    if (!replayData || !replayData.frames[currentFrame]) return;

    const frame = replayData.frames[currentFrame];
    animationTime += 0.016;

    // Finde heraus, wer die Flagge trägt
    const flagCarriers = {};
    Object.entries(frame.flags).forEach(([team, data]) => {
        if (data.carried_by) {
            flagCarriers[data.carried_by] = team;
        }
    });

    // Update agents
    Object.entries(frame.agents).forEach(([id, data]) => {
        const agent = agentMeshes[id];
        if (!agent) return;

        const body = agent.getObjectByName('body');
        const head = body?.getObjectByName('head');
        const normalEyes = head?.getObjectByName('normalEyes');
        const stunnedEyes = head?.getObjectByName('stunnedEyes');
        const stunStars = head?.getObjectByName('stunStars');
        const stunCooldown = agent.getObjectByName('stunCooldown');
        const flagAura = agent.getObjectByName('flagAura');
        const impactRing = agent.getObjectByName('impactRing');

        // Zielposition
        const targetPos = new THREE.Vector3(data.position[0], 0.8, data.position[1]);
        
        // Velocity berechnen (für Animations-Richtung)
        const velocity = new THREE.Vector3().subVectors(targetPos, agent.userData.lastPosition);
        agent.userData.velocity.lerp(velocity, 0.3);
        agent.userData.lastPosition.copy(agent.position);

        // Sanfte Bewegung zur Zielposition
        agent.position.x += (targetPos.x - agent.position.x) * 0.15;
        agent.position.z += (targetPos.z - agent.position.z) * 0.15;

        const movementSpeed = agent.userData.velocity.length();

        // ============ BETÄUBUNG ============
        if (data.is_stunned) {
            // Grau färben
            body.material.color.setHex(0x555555);
            body.material.emissive = new THREE.Color(0x000000);
            
            // X-Augen zeigen, normale verstecken
            if (normalEyes) normalEyes.visible = false;
            if (stunnedEyes) stunnedEyes.visible = true;
            
            // Sterne kreisen lassen
            if (stunStars) {
                stunStars.visible = true;
                stunStars.children.forEach((star, i) => {
                    const baseAngle = star.userData.orbitAngle || 0;
                    const angle = baseAngle + animationTime * 3;
                    star.position.x = Math.cos(angle) * 0.5;
                    star.position.z = Math.sin(angle) * 0.5;
                    star.position.y = Math.sin(animationTime * 5 + i) * 0.1;
                    star.rotation.z = animationTime * 2;
                });
            }
            
            // Cooldown Ring anzeigen
            if (stunCooldown) {
                stunCooldown.visible = true;
                
                // Berechne Fortschritt (stun_timer geht von stun_duration runter zu 0)
                const stunTimer = data.stun_timer !== undefined ? data.stun_timer : stun_duration;
                const progress = 1 - (stunTimer / stun_duration); // 0 = gerade betäubt, 1 = gleich wieder frei
                
                // Segmente ein/ausblenden basierend auf Fortschritt
                const totalSegments = 32;
                const visibleSegments = Math.floor(progress * totalSegments);
                
                for (let i = 0; i < totalSegments; i++) {
                    const segment = stunCooldown.getObjectByName(`segment_${i}`);
                    if (segment) {
                        if (i < visibleSegments) {
                            // Grün für "erholt"
                            segment.material.color.setHex(0x51cf66);
                            segment.material.opacity = 0.9;
                        } else {
                            // Rot für "noch betäubt"
                            segment.material.color.setHex(0xff6b6b);
                            segment.material.opacity = 0.4;
                        }
                    }
                }
            }
            
            // Taumeln
            agent.rotation.z = Math.sin(animationTime * 4) * 0.15;
            agent.rotation.x = Math.cos(animationTime * 3) * 0.1;
            
            // Zusammengesunken
            if (body) {
                body.scale.set(1, 0.9, 1);
            }
        } else {
            // Normale Farbe
            body.material.color.setHex(agent.userData.originalColor);
            
            // Normale Augen zeigen
            if (normalEyes) normalEyes.visible = true;
            if (stunnedEyes) stunnedEyes.visible = false;
            if (stunStars) stunStars.visible = false;
            if (stunCooldown) stunCooldown.visible = false;
            
            // Rotation zurücksetzen
            agent.rotation.z = THREE.MathUtils.lerp(agent.rotation.z, 0, 0.1);
            agent.rotation.x = THREE.MathUtils.lerp(agent.rotation.x, 0, 0.1);

            // ============ BEWEGUNGS-ANIMATION ============
            if (movementSpeed > 0.01) {
                // Sanfter Bounce beim Laufen
                const bounceHeight = Math.sin(animationTime * 12) * 0.04 * Math.min(movementSpeed * 5, 1);
                agent.position.y = 0.8 + bounceHeight;
                
                // Leichter Squash & Stretch (subtiler)
                const stretch = 1 + movementSpeed * 0.3;
                const squash = 1 / Math.sqrt(stretch);
                if (body) {
                    body.scale.y = THREE.MathUtils.lerp(body.scale.y, stretch, 0.1);
                    body.scale.x = THREE.MathUtils.lerp(body.scale.x, squash, 0.1);
                    body.scale.z = THREE.MathUtils.lerp(body.scale.z, squash, 0.1);
                }
                
                // In Bewegungsrichtung schauen
                if (velocity.length() > 0.01) {
                    const targetRotation = Math.atan2(velocity.x, velocity.z);
                    agent.rotation.y = THREE.MathUtils.lerp(
                        agent.rotation.y,
                        targetRotation,
                        0.1
                    );
                }
            } else {
                // Zurück zur Ruheposition
                agent.position.y = THREE.MathUtils.lerp(agent.position.y, 0.8, 0.1);
                if (body) {
                    body.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
                }
            }
        }

        // ============ FLAGGEN-TRÄGER ============
        const carriedFlag = flagCarriers[id];
        if (carriedFlag && flagAura) {
            flagAura.visible = true;
            
            // Pulsierender Effekt
            const pulse = 1 + Math.sin(animationTime * 4) * 0.2;
            const innerRing = flagAura.getObjectByName('innerRing');
            const outerRing = flagAura.getObjectByName('outerRing');
            
            if (innerRing) {
                innerRing.scale.set(pulse, pulse, 1);
                innerRing.material.opacity = 0.4 + Math.sin(animationTime * 4) * 0.2;
            }
            if (outerRing) {
                outerRing.scale.set(pulse * 1.2, pulse * 1.2, 1);
                outerRing.rotation.z = animationTime * 0.5;
            }
            
            // Aufsteigende Partikel
            for (let i = 0; i < 8; i++) {
                const particle = flagAura.getObjectByName(`particle_${i}`);
                if (particle) {
                    const baseAngle = particle.userData.baseAngle;
                    const yOffset = ((animationTime * 2 + i * 0.5) % 2) - 1;
                    particle.position.y = yOffset;
                    particle.material.opacity = 0.5 - Math.abs(yOffset) * 0.3;
                    particle.position.x = Math.cos(baseAngle + animationTime) * 0.7;
                    particle.position.z = Math.sin(baseAngle + animationTime) * 0.7;
                }
            }
            
            // Glow um den Körper
            if (!data.is_stunned) {
                body.material.emissive = new THREE.Color(0xffd43b);
                body.material.emissiveIntensity = 0.2 + Math.sin(animationTime * 4) * 0.1;
            }
        } else if (flagAura) {
            flagAura.visible = false;
            if (!data.is_stunned) {
                body.material.emissive = new THREE.Color(0x000000);
                body.material.emissiveIntensity = 0;
            }
        }

        // ============ TACKLE ANIMATION ============
        if (data.tackle_cooldown > tackle_cooldown - 8) {
            // Gerade getackelt - Lunge Animation
            const tackleProgress = (tackle_cooldown - data.tackle_cooldown) / 8;
            
            // Impact Ring zeigen
            if (impactRing && tackleProgress < 0.5) {
                impactRing.visible = true;
                const ringScale = 1 + tackleProgress * 4;
                impactRing.scale.set(ringScale, ringScale, ringScale);
                impactRing.children.forEach((ring, i) => {
                    ring.material.opacity = (0.8 - i * 0.2) * (1 - tackleProgress * 2);
                });
            } else if (impactRing) {
                impactRing.visible = false;
            }
            
            // Vorwärts-Lunge
            const lungeAmount = Math.sin(tackleProgress * Math.PI) * 0.6;
            const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(agent.quaternion);
            agent.position.add(direction.multiplyScalar(lungeAmount * 0.1));
            
        } else if (impactRing) {
            impactRing.visible = false;
        }
    });

    // ============ UPDATE FLAGS ============
    Object.entries(frame.flags).forEach(([team, data]) => {
        const flagGroup = flagMeshes[team];
        if (!flagGroup) return;

        const carrierAgent = data.carried_by ? agentMeshes[data.carried_by] : null;
        
        if (carrierAgent) {
            // Flagge folgt dem Träger (über dem Kopf)
            flagGroup.position.x = carrierAgent.position.x;
            flagGroup.position.z = carrierAgent.position.z;
            flagGroup.position.y = 2.2 + Math.sin(animationTime * 3) * 0.1; // Schwebt über dem Kopf
            
            // Flagge weht stärker wenn getragen
            const cloth = flagGroup.getObjectByName('pole')?.getObjectByName('cloth');
            if (cloth) {
                cloth.rotation.y = Math.sin(animationTime * 5) * 0.3;
            }
            
            // Glow verstärken
            const glow = flagGroup.getObjectByName('glow');
            if (glow) {
                glow.scale.setScalar(1 + Math.sin(animationTime * 4) * 0.3);
                glow.material.opacity = 0.3 + Math.sin(animationTime * 4) * 0.1;
            }
        } else {
            // Flagge an normaler Position
            flagGroup.position.x += (data.position[0] - flagGroup.position.x) * 0.2;
            flagGroup.position.z += (data.position[1] - flagGroup.position.z) * 0.2;
            flagGroup.position.y = THREE.MathUtils.lerp(flagGroup.position.y, 1, 0.1);
            
            // Sanftes Wehen
            const cloth = flagGroup.getObjectByName('pole')?.getObjectByName('cloth');
            if (cloth) {
                cloth.rotation.y = Math.sin(animationTime * 2) * 0.15;
            }
            
            // Normaler Glow
            const glow = flagGroup.getObjectByName('glow');
            if (glow) {
                glow.scale.setScalar(1);
                glow.material.opacity = 0.2;
            }
        }
    });

    // Update UI
    document.getElementById('step-display').textContent = `Step: ${frame.step}`;
    document.getElementById('blue-score').textContent = frame.scores.blue;
    document.getElementById('red-score').textContent = frame.scores.red;
    
    // Update Flag Status UI
    updateFlagStatusUI(frame);
}

function updateFlagStatusUI(frame) {
    ['blue', 'red'].forEach(team => {
        const flagData = frame.flags[team];
        const statusEl = document.getElementById(`${team}-flag-status`);
        if (!statusEl || !flagData) return;
        
        const carrierName = statusEl.querySelector('.carrier-name');
        
        if (flagData.carried_by) {
            // Flagge wird getragen
            const carrierData = frame.agents[flagData.carried_by];
            const carrierTeam = carrierData ? carrierData.team : 'unknown';
            const teamEmoji = carrierTeam === 'blue' ? '🔵' : '🔴';
            
            statusEl.classList.remove('at-base');
            statusEl.classList.add('carried');
            carrierName.textContent = `${teamEmoji} ${flagData.carried_by}`;
        } else {
            // Flagge an der Basis oder auf dem Boden
            statusEl.classList.remove('carried');
            statusEl.classList.add('at-base');
            carrierName.textContent = 'An der Basis';
        }
    });
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
