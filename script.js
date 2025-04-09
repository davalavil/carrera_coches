// --- Variables Globales ---
let scene, camera, renderer;
let car1, car2;
let trackLimits = []; // Array para guardar TODOS los límites (muros invisibles)
const keysPressed = {};
let startTime = 0;
let elapsedTime = 0;
let gameRunning = false;
let timerInterval = null;

// --- Constantes ---
const CAR_WIDTH = 2;
const CAR_LENGTH = 4;
const MAX_SPEED = 0.50;
const ACCELERATION = 0.020;
const BRAKE_FORCE = 0.035;
const FRICTION = 0.97;
const TURN_SPEED = 0.055;

// --- Dimensiones PISTA FIGURA 8 ---
const TRACK_OUTER_W = 90;
const TRACK_OUTER_H = 65;
const TRACK_THICKNESS = 18;
const HOLE_H = TRACK_OUTER_H - (2 * TRACK_THICKNESS);
const HOLE_W = (TRACK_OUTER_W - (3 * TRACK_THICKNESS)) / 2;
const WALL_HEIGHT = 2;
const COLLISION_WALL_THICKNESS = 1.0;

// --- Inicialización ---
function init() {
    try {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xdcdcdc);

        const canvas = document.getElementById('gameCanvas');
        if (!canvas) throw new Error("Canvas element with id 'gameCanvas' not found.");
        const container = document.getElementById('canvasContainer');
        if (!container) throw new Error("Container element with id 'canvasContainer' not found.");

        const frustumSize = 100;
        const aspect = container.clientWidth / container.clientHeight;

        camera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / -2,
            1,
            1000
        );
        camera.position.set(0, 75, 5);
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(-40, 60, 30);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 200;
        directionalLight.shadow.camera.left = -TRACK_OUTER_W;
        directionalLight.shadow.camera.right = TRACK_OUTER_W;
        directionalLight.shadow.camera.top = TRACK_OUTER_H;
        directionalLight.shadow.camera.bottom = -TRACK_OUTER_H;
        scene.add(directionalLight);

        createFigureEightTrack();

        car1 = createCar(0xff0000, 0, 0); // Rojo
        car2 = createCar(0x0000ff, 0, 0); // Azul
        scene.add(car1);
        scene.add(car2);

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        const restartButton = document.getElementById('restartButton');
        if (!restartButton) throw new Error("Button element with id 'restartButton' not found.");
        restartButton.addEventListener('click', resetGame);
        window.addEventListener('resize', onWindowResize, false);

        resetGame();
        onWindowResize();
        animate();

    } catch (error) {
        console.error("Error during initialization:", error);
        alert("Error initializing the game. Check the console (F12) for details.");
    }
}

function handleKeyDown(event) {
    const key = event.key.toLowerCase();
    const code = event.code;
    keysPressed[key] = true;
    keysPressed[code] = true;

    const movementKeys = ['w', 's', 'a', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
    if (!gameRunning && movementKeys.includes(key)) {
        startGameTimer();
    }
}

function handleKeyUp(event) {
    const key = event.key.toLowerCase();
    const code = event.code;
    keysPressed[key] = false;
    keysPressed[code] = false;
}

function onWindowResize() {
    const container = document.getElementById('canvasContainer');
    if (!container || !camera || !renderer) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height);

    const aspect = width / height;
    const frustumSize = 100;
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
}

function createFigureEightTrack() {
    trackLimits.forEach(limit => {
        scene.remove(limit);
        if (limit.geometry) limit.geometry.dispose();
        if (limit.material) limit.material.dispose();
    });
    trackLimits = [];
    const oldVisualTrack = scene.getObjectByName("visualTrack");
    if (oldVisualTrack) {
        scene.remove(oldVisualTrack);
        if (oldVisualTrack.geometry) oldVisualTrack.geometry.dispose();
        if (oldVisualTrack.material) oldVisualTrack.material.dispose();
    }
     const oldStartLine = scene.getObjectByName("startLine");
    if (oldStartLine) {
        scene.remove(oldStartLine);
        if (oldStartLine.geometry) oldStartLine.geometry.dispose();
        if (oldStartLine.material) oldStartLine.material.dispose();
    }

    // Pista visual
    const trackMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    trackMaterial.polygonOffset = true;
    trackMaterial.polygonOffsetFactor = -0.1;
    const trackShape = new THREE.Shape();
    const halfW = TRACK_OUTER_W / 2;
    const halfH = TRACK_OUTER_H / 2;
    trackShape.moveTo(-halfW, -halfH);
    trackShape.lineTo(halfW, -halfH);
    trackShape.lineTo(halfW, halfH);
    trackShape.lineTo(-halfW, halfH);
    trackShape.closePath();
    const holeHalfW = HOLE_W / 2;
    const holeHalfH = HOLE_H / 2;
    const holeCenterX = HOLE_W / 2 + TRACK_THICKNESS / 2;
    const holePathLeft = new THREE.Path();
    holePathLeft.moveTo(-holeCenterX - holeHalfW, -holeHalfH);
    holePathLeft.lineTo(-holeCenterX + holeHalfW, -holeHalfH);
    holePathLeft.lineTo(-holeCenterX + holeHalfW, holeHalfH);
    holePathLeft.lineTo(-holeCenterX - holeHalfW, holeHalfH);
    holePathLeft.closePath();
    trackShape.holes.push(holePathLeft);
    const holePathRight = new THREE.Path();
    holePathRight.moveTo(holeCenterX - holeHalfW, -holeHalfH);
    holePathRight.lineTo(holeCenterX + holeHalfW, -holeHalfH);
    holePathRight.lineTo(holeCenterX + holeHalfW, holeHalfH);
    holePathRight.lineTo(holeCenterX - holeHalfW, holeHalfH);
    holePathRight.closePath();
    trackShape.holes.push(holePathRight);
    const trackGeometry = new THREE.ShapeGeometry(trackShape);
    const visualTrackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
    visualTrackMesh.rotation.x = -Math.PI / 2;
    visualTrackMesh.position.y = 0;
    visualTrackMesh.name = "visualTrack";
    visualTrackMesh.receiveShadow = true;
    scene.add(visualTrackMesh);

    // Muros de colisión
    const wallMaterialInvisible = new THREE.MeshBasicMaterial({ visible: false });
    const wallMaterialVisible = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    const useVisibleWalls = false;
    const collisionMaterial = useVisibleWalls ? wallMaterialVisible : wallMaterialInvisible;

    function createWall(width, height, depth, x, y, z) {
        const wallGeometry = new THREE.BoxGeometry(width, height, depth);
        const wallMesh = new THREE.Mesh(wallGeometry, collisionMaterial);
        wallMesh.position.set(x, y, z);
        scene.add(wallMesh);
        trackLimits.push(wallMesh);
    }
    // Exteriores
    createWall(TRACK_OUTER_W, WALL_HEIGHT, COLLISION_WALL_THICKNESS, 0, WALL_HEIGHT / 2, halfH + COLLISION_WALL_THICKNESS / 2);
    createWall(TRACK_OUTER_W, WALL_HEIGHT, COLLISION_WALL_THICKNESS, 0, WALL_HEIGHT / 2, -halfH - COLLISION_WALL_THICKNESS / 2);
    createWall(COLLISION_WALL_THICKNESS, WALL_HEIGHT, TRACK_OUTER_H + 2 * COLLISION_WALL_THICKNESS, halfW + COLLISION_WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0);
    createWall(COLLISION_WALL_THICKNESS, WALL_HEIGHT, TRACK_OUTER_H + 2 * COLLISION_WALL_THICKNESS, -halfW - COLLISION_WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0);
    // Hueco Izquierdo
    const holeLeftX = -holeCenterX;
    createWall(HOLE_W + 2 * COLLISION_WALL_THICKNESS, WALL_HEIGHT, COLLISION_WALL_THICKNESS, holeLeftX, WALL_HEIGHT / 2, holeHalfH + COLLISION_WALL_THICKNESS / 2);
    createWall(HOLE_W + 2 * COLLISION_WALL_THICKNESS, WALL_HEIGHT, COLLISION_WALL_THICKNESS, holeLeftX, WALL_HEIGHT / 2, -holeHalfH - COLLISION_WALL_THICKNESS / 2);
    createWall(COLLISION_WALL_THICKNESS, WALL_HEIGHT, HOLE_H, holeLeftX + holeHalfW + COLLISION_WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0);
    createWall(COLLISION_WALL_THICKNESS, WALL_HEIGHT, HOLE_H, holeLeftX - holeHalfW - COLLISION_WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0);
    // Hueco Derecho
    const holeRightX = holeCenterX;
    createWall(HOLE_W + 2 * COLLISION_WALL_THICKNESS, WALL_HEIGHT, COLLISION_WALL_THICKNESS, holeRightX, WALL_HEIGHT / 2, holeHalfH + COLLISION_WALL_THICKNESS / 2);
    createWall(HOLE_W + 2 * COLLISION_WALL_THICKNESS, WALL_HEIGHT, COLLISION_WALL_THICKNESS, holeRightX, WALL_HEIGHT / 2, -holeHalfH - COLLISION_WALL_THICKNESS / 2);
    createWall(COLLISION_WALL_THICKNESS, WALL_HEIGHT, HOLE_H, holeRightX + holeHalfW + COLLISION_WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0);
    createWall(COLLISION_WALL_THICKNESS, WALL_HEIGHT, HOLE_H, holeRightX - holeHalfW - COLLISION_WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0);

    // Línea de salida
    const startLineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    startLineMaterial.polygonOffset = true;
    startLineMaterial.polygonOffsetFactor = -0.2;
    const startLineWidth = TRACK_THICKNESS * 0.95;
    const startLineLength = 1.5;
    const startLineGeometry = new THREE.PlaneGeometry(startLineLength, startLineWidth);
    const startLineMesh = new THREE.Mesh(startLineGeometry, startLineMaterial);
    startLineMesh.rotation.x = -Math.PI / 2;
    startLineMesh.position.set(-(TRACK_OUTER_W / 2 - TRACK_THICKNESS / 2), 0.01, 0);
    startLineMesh.name = "startLine";
    scene.add(startLineMesh);
}

function createCar(color, x, z) {
    const carGeometry = new THREE.BoxGeometry(CAR_WIDTH, 1, CAR_LENGTH); // Width (X), Height (Y), Length (Z)
    const carMaterial = new THREE.MeshLambertMaterial({ color: color });
    const carMesh = new THREE.Mesh(carGeometry, carMaterial);
    carMesh.castShadow = true;
    carMesh.position.set(x, 0.5, z);
    carMesh.userData = {
        speed: 0,
        angle: 0 // Se define en resetGame
    };
    return carMesh;
}

// --- Reiniciar Juego --- (VERSIÓN CORREGIDA PARA IMAGEN 2)
function resetGame() {
    stopGameTimer();

    // Posición Z común para ambos coches (centrada en la línea)
    const startZ = 0;
    // Posición X central de la línea de salida (carril izquierdo)
    const lineCenterX = -(TRACK_OUTER_W / 2 - TRACK_THICKNESS / 2);

    // Calcular separación horizontal
    // Queremos que quepan lado a lado. El ancho total es CAR_LENGTH cuando están girados 90 grados.
    const carSeparationX = CAR_LENGTH / 2 + 0.5; // Mitad del largo del coche + pequeño espacio

    // Posición X para cada coche
    const startX_car1 = lineCenterX - carSeparationX; // Rojo a la izquierda
    const startX_car2 = lineCenterX + carSeparationX; // Azul a la derecha

    // Ángulo inicial para apuntar a la DERECHA (a lo largo del eje +X global)
    // El ángulo 0 apunta a lo largo de -Z (según la lógica de movimiento)
    // Para apuntar a +X, necesitamos rotar -90 grados (-PI/2)
    const initialAngle = -Math.PI / 2;

    // --- Aplicar a Coche 1 (Rojo) ---
    if (car1) { // Comprobar si ya existe
        car1.position.set(startX_car1, 0.5, startZ);
        car1.rotation.y = initialAngle;
        car1.userData.speed = 0;
        car1.userData.angle = initialAngle;
    }

    // --- Aplicar a Coche 2 (Azul) ---
     if (car2) { // Comprobar si ya existe
        car2.position.set(startX_car2, 0.5, startZ);
        car2.rotation.y = initialAngle;
        car2.userData.speed = 0;
        car2.userData.angle = initialAngle;
    }

    // Limpiar teclas presionadas
    for (const key in keysPressed) {
        keysPressed[key] = false;
    }
}


// --- Funciones del Temporizador ---
function startGameTimer() {
    if (gameRunning) return;
    startTime = performance.now();
    elapsedTime = 0;
    gameRunning = true;
    updateTimerDisplay();
    if (!timerInterval) {
       timerInterval = setInterval(updateTimerDisplay, 50);
    }
}

function stopGameTimer() {
    gameRunning = false;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    if (startTime > 0) {
        elapsedTime = performance.now() - startTime;
         document.getElementById('timerDisplay').textContent = `Tiempo: ${(elapsedTime / 1000).toFixed(2)}s`;
    } else {
        document.getElementById('timerDisplay').textContent = `Tiempo: 0.00s`;
    }
    startTime = 0;
}

function updateTimerDisplay() {
    if (!gameRunning || startTime === 0) return; // Añadida comprobación startTime
    const currentElapsedTime = performance.now() - startTime;
    const displayElement = document.getElementById('timerDisplay');
    if (displayElement) { // Comprobar si el elemento existe
        displayElement.textContent = `Tiempo: ${(currentElapsedTime / 1000).toFixed(2)}s`;
    }
}

// --- Actualizar Movimiento del Coche ---
function updateCarMovement(car, controls) {
    if (!car) return; // Seguridad por si el coche no se ha creado

    if (!gameRunning && car.userData.speed === 0 && !keysPressed[controls.accelerate] && !keysPressed[controls.brake] && !keysPressed[controls.left] && !keysPressed[controls.right]) {
        return;
    }

    const carData = car.userData;
    let accelerationInput = 0;
    let turnInput = 0;
    let isTurning = false;

    if (gameRunning) {
        if (keysPressed[controls.accelerate]) accelerationInput = ACCELERATION;
        if (keysPressed[controls.brake]) {
            if (carData.speed > 0.01) accelerationInput = -BRAKE_FORCE;
            else if (carData.speed > -MAX_SPEED / 2) accelerationInput = -ACCELERATION / 1.5;
        }
    }

    carData.speed += accelerationInput;
    carData.speed *= FRICTION;
    carData.speed = Math.max(-MAX_SPEED / 2, Math.min(MAX_SPEED, carData.speed));
    if (Math.abs(carData.speed) < 0.005) carData.speed = 0;

    if (gameRunning && Math.abs(carData.speed) > 0.01) {
        if (keysPressed[controls.left]) {
            turnInput = TURN_SPEED;
            isTurning = true;
        }
        if (keysPressed[controls.right]) {
            turnInput = -TURN_SPEED;
            isTurning = true;
        }
        if (carData.speed < 0) turnInput *= -1;
    }

    if (isTurning) {
        carData.angle += turnInput;
        car.rotation.y = carData.angle;
    }

    if (carData.speed !== 0) {
        const deltaX = Math.sin(carData.angle) * carData.speed;
        const deltaZ = Math.cos(carData.angle) * carData.speed;
        const previousPosition = car.position.clone();

        car.position.x -= deltaX;
        car.position.z -= deltaZ;

        const carBox = new THREE.Box3().setFromObject(car);
        let collisionWall = false;
        let collisionCar = false;

        for (const limit of trackLimits) {
            const limitBox = new THREE.Box3().setFromObject(limit);
            if (carBox.intersectsBox(limitBox)) {
                collisionWall = true;
                break;
            }
        }

        const otherCar = (car === car1) ? car2 : car1;
        // Comprobar si otherCar existe antes de usarlo
        if (otherCar) {
             const otherCarBox = new THREE.Box3().setFromObject(otherCar);
             if (carBox.intersectsBox(otherCarBox)) {
                 collisionCar = true;
             }
        }


        if (collisionWall) {
            car.position.copy(previousPosition);
            carData.speed *= -0.3;
            if (Math.abs(carData.speed) < ACCELERATION) carData.speed = 0;
        } else if (collisionCar) {
            car.position.copy(previousPosition);
            carData.speed *= 0.4;
            if (otherCar && Math.abs(otherCar.userData.speed) > 0.1) {
                 otherCar.userData.speed *= 0.6;
            }
        }
    }
}

// --- Bucle de Animación ---
function animate() {
    requestAnimationFrame(animate);

    updateCarMovement(car1, { accelerate: 'w', brake: 's', left: 'a', right: 'd' });
    updateCarMovement(car2, { accelerate: 'ArrowUp', brake: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' });

    renderer.render(scene, camera);
}

// --- Iniciar ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
