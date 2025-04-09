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
const MAX_SPEED = 0.50; // Aumentada ligeramente
const ACCELERATION = 0.020; // Aumentada ligeramente
const BRAKE_FORCE = 0.035; // Aumentada ligeramente
const FRICTION = 0.97; // Un poco más de fricción
const TURN_SPEED = 0.055; // Velocidad de giro

// --- Dimensiones PISTA FIGURA 8 ---
const TRACK_OUTER_W = 90; // Ancho total exterior
const TRACK_OUTER_H = 65; // Alto total exterior
const TRACK_THICKNESS = 18; // Ancho de la sección de pista (negra)
// Calculamos las dimensiones de los "agujeros" blancos internos
const HOLE_H = TRACK_OUTER_H - (2 * TRACK_THICKNESS); // Altura del agujero
const HOLE_W = (TRACK_OUTER_W - (3 * TRACK_THICKNESS)) / 2; // Ancho de cada agujero
const WALL_HEIGHT = 2; // Altura visual (o invisible) de los muros de colisión
const COLLISION_WALL_THICKNESS = 1.0; // Grosor aumentado para evitar traspasos

// --- Inicialización ---
function init() {
    try { // Añadir try-catch para depuración inicial
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xdcdcdc); // Gris claro (área fuera de pista)

        const canvas = document.getElementById('gameCanvas');
        if (!canvas) throw new Error("Canvas element with id 'gameCanvas' not found.");
        const container = document.getElementById('canvasContainer');
        if (!container) throw new Error("Container element with id 'canvasContainer' not found.");

        // Ajustar cámara para la nueva pista
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
        camera.position.set(0, 75, 5); // Un poco más arriba
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.shadowMap.enabled = true; // Habilitar sombras
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Sombras suaves

        // Iluminación
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Luz ambiental
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Luz direccional
        directionalLight.position.set(-40, 60, 30);
        directionalLight.castShadow = true;
        // Configuración de sombras de la luz direccional
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 200;
        directionalLight.shadow.camera.left = -TRACK_OUTER_W;
        directionalLight.shadow.camera.right = TRACK_OUTER_W;
        directionalLight.shadow.camera.top = TRACK_OUTER_H;
        directionalLight.shadow.camera.bottom = -TRACK_OUTER_H;
        scene.add(directionalLight);
        // const helper = new THREE.CameraHelper( directionalLight.shadow.camera ); // Descomentar para depurar sombras
        // scene.add( helper );

        // *** Crear Pista Figura 8 ***
        createFigureEightTrack();

        // --- Crear coches (posición inicial se define en resetGame) ---
        car1 = createCar(0xff0000, 0, 0); // Rojo
        car2 = createCar(0x0000ff, 0, 0); // Azul
        scene.add(car1);
        scene.add(car2);

        // --- Event Listeners ---
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        const restartButton = document.getElementById('restartButton');
        if (!restartButton) throw new Error("Button element with id 'restartButton' not found.");
        restartButton.addEventListener('click', resetGame);
        window.addEventListener('resize', onWindowResize, false);

        // --- Estado inicial y primer renderizado ---
        resetGame();
        onWindowResize(); // Llamar para ajustar tamaño inicial
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
    keysPressed[code] = true; // Usar code para flechas y teclas que varían con layout

    // Iniciar temporizador al presionar la primera tecla de movimiento válida
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
    if (!container || !camera || !renderer) return; // Verificar existencia

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

// --- Crear Pista (FIGURA 8) ---
function createFigureEightTrack() {
    // Limpiar elementos anteriores
    trackLimits.forEach(limit => {
        scene.remove(limit);
        if (limit.geometry) limit.geometry.dispose(); // Liberar memoria geometría
        if (limit.material) limit.material.dispose(); // Liberar memoria material
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

    // 1. Crear el plano VISUAL de la pista (negro)
    const trackMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a }); // Negro mate
    trackMaterial.polygonOffset = true; // Para evitar z-fighting con la línea de salida
    trackMaterial.polygonOffsetFactor = -0.1;
    const trackShape = new THREE.Shape();

    const halfW = TRACK_OUTER_W / 2;
    const halfH = TRACK_OUTER_H / 2;
    trackShape.moveTo(-halfW, -halfH);
    trackShape.lineTo(halfW, -halfH);
    trackShape.lineTo(halfW, halfH);
    trackShape.lineTo(-halfW, halfH);
    trackShape.closePath(); // Cerrar contorno exterior

    // Agujeros internos
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
    visualTrackMesh.position.y = 0; // A nivel del suelo
    visualTrackMesh.name = "visualTrack";
    visualTrackMesh.receiveShadow = true; // El suelo recibe sombras
    scene.add(visualTrackMesh);

    // 2. Crear los MUROS DE COLISIÓN (invisibles)
    const wallMaterialInvisible = new THREE.MeshBasicMaterial({ visible: false }); // Más eficiente que opacity 0
    const wallMaterialVisible = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    const useVisibleWalls = false; // Poner a true para depurar colisiones
    const collisionMaterial = useVisibleWalls ? wallMaterialVisible : wallMaterialInvisible;

    function createWall(width, height, depth, x, y, z) {
        const wallGeometry = new THREE.BoxGeometry(width, height, depth);
        const wallMesh = new THREE.Mesh(wallGeometry, collisionMaterial);
        wallMesh.position.set(x, y, z);
        scene.add(wallMesh);
        trackLimits.push(wallMesh);
    }

    // Muros Exteriores (Posicionados para contener la pista visual)
    createWall(TRACK_OUTER_W, WALL_HEIGHT, COLLISION_WALL_THICKNESS, 0, WALL_HEIGHT / 2, halfH + COLLISION_WALL_THICKNESS / 2);
    createWall(TRACK_OUTER_W, WALL_HEIGHT, COLLISION_WALL_THICKNESS, 0, WALL_HEIGHT / 2, -halfH - COLLISION_WALL_THICKNESS / 2);
    createWall(COLLISION_WALL_THICKNESS, WALL_HEIGHT, TRACK_OUTER_H + 2 * COLLISION_WALL_THICKNESS, halfW + COLLISION_WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0);
    createWall(COLLISION_WALL_THICKNESS, WALL_HEIGHT, TRACK_OUTER_H + 2 * COLLISION_WALL_THICKNESS, -halfW - COLLISION_WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0);

    // Muros del Agujero Izquierdo (Posicionados para rodear el agujero)
    const holeLeftX = -holeCenterX;
    createWall(HOLE_W + 2 * COLLISION_WALL_THICKNESS, WALL_HEIGHT, COLLISION_WALL_THICKNESS, holeLeftX, WALL_HEIGHT / 2, holeHalfH + COLLISION_WALL_THICKNESS / 2);
    createWall(HOLE_W + 2 * COLLISION_WALL_THICKNESS, WALL_HEIGHT, COLLISION_WALL_THICKNESS, holeLeftX, WALL_HEIGHT / 2, -holeHalfH - COLLISION_WALL_THICKNESS / 2);
    createWall(COLLISION_WALL_THICKNESS, WALL_HEIGHT, HOLE_H, holeLeftX + holeHalfW + COLLISION_WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0);
    createWall(COLLISION_WALL_THICKNESS, WALL_HEIGHT, HOLE_H, holeLeftX - holeHalfW - COLLISION_WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0);

    // Muros del Agujero Derecho
    const holeRightX = holeCenterX;
    createWall(HOLE_W + 2 * COLLISION_WALL_THICKNESS, WALL_HEIGHT, COLLISION_WALL_THICKNESS, holeRightX, WALL_HEIGHT / 2, holeHalfH + COLLISION_WALL_THICKNESS / 2);
    createWall(HOLE_W + 2 * COLLISION_WALL_THICKNESS, WALL_HEIGHT, COLLISION_WALL_THICKNESS, holeRightX, WALL_HEIGHT / 2, -holeHalfH - COLLISION_WALL_THICKNESS / 2);
    createWall(COLLISION_WALL_THICKNESS, WALL_HEIGHT, HOLE_H, holeRightX + holeHalfW + COLLISION_WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0);
    createWall(COLLISION_WALL_THICKNESS, WALL_HEIGHT, HOLE_H, holeRightX - holeHalfW - COLLISION_WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0);


    // 3. Crear la LÍNEA DE SALIDA VISUAL (Blanca)
    const startLineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    startLineMaterial.polygonOffset = true; // Evitar z-fighting con la pista
    startLineMaterial.polygonOffsetFactor = -0.2; // Empujar un poco más hacia la cámara
    const startLineWidth = TRACK_THICKNESS * 0.95; // Casi todo el ancho de la pista
    const startLineLength = 1.5;
    const startLineGeometry = new THREE.PlaneGeometry(startLineLength, startLineWidth); // Ancho y largo intercambiados por rotación
    const startLineMesh = new THREE.Mesh(startLineGeometry, startLineMaterial);
    startLineMesh.rotation.x = -Math.PI / 2; // Plana
    // No necesita rotación Z si intercambiamos ancho/largo en PlaneGeometry
    startLineMesh.position.set(-(TRACK_OUTER_W / 2 - TRACK_THICKNESS / 2), 0.01, 0); // Y un poquito elevado
    startLineMesh.name = "startLine";
    scene.add(startLineMesh);
}


// --- Crear Coche ---
function createCar(color, x, z) {
    const carGeometry = new THREE.BoxGeometry(CAR_WIDTH, 1, CAR_LENGTH);
    const carMaterial = new THREE.MeshLambertMaterial({ color: color });
    const carMesh = new THREE.Mesh(carGeometry, carMaterial);
    carMesh.castShadow = true; // El coche proyecta sombras
    carMesh.receiveShadow = false;
    carMesh.position.set(x, 0.5, z); // Altura base sobre el suelo (Y=0)
    carMesh.userData = {
        speed: 0,
        angle: 0 // Se define en resetGame
    };
    return carMesh;
}

// --- Reiniciar Juego ---
function resetGame() {
    stopGameTimer();

    const startX = -(TRACK_OUTER_W / 2 - TRACK_THICKNESS / 2); // Centro X del carril izquierdo
    const carSpacing = CAR_WIDTH * 0.6;
    const startZ_car1 = 0 + carSpacing; // Rojo arriba
    const startZ_car2 = 0 - carSpacing; // Azul abajo
    const initialAngle = 0; // Apuntando a la derecha (+X)

    car1.position.set(startX, 0.5, startZ_car1);
    car1.rotation.y = initialAngle;
    car1.userData.speed = 0;
    car1.userData.angle = initialAngle;

    car2.position.set(startX, 0.5, startZ_car2);
    car2.rotation.y = initialAngle;
    car2.userData.speed = 0;
    car2.userData.angle = initialAngle;

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
    updateTimerDisplay(); // Mostrar 0.00 inmediatamente
    if (!timerInterval) {
       timerInterval = setInterval(updateTimerDisplay, 50); // Actualizar display frecuentemente
    }
}

function stopGameTimer() {
    gameRunning = false;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    // Actualizar una última vez para mostrar el tiempo final exacto (si ya empezó)
    if (startTime > 0) {
        elapsedTime = performance.now() - startTime;
         document.getElementById('timerDisplay').textContent = `Tiempo: ${(elapsedTime / 1000).toFixed(2)}s`;
    } else {
        document.getElementById('timerDisplay').textContent = `Tiempo: 0.00s`;
    }
    startTime = 0; // Reiniciar startTime para la próxima vez
}

function updateTimerDisplay() {
    if (!gameRunning) return;
    const currentElapsedTime = performance.now() - startTime;
    document.getElementById('timerDisplay').textContent = `Tiempo: ${(currentElapsedTime / 1000).toFixed(2)}s`;
    // No actualizamos la variable global 'elapsedTime' aquí para que stopGameTimer tenga el valor final preciso
}


// --- Actualizar Movimiento del Coche ---
function updateCarMovement(car, controls) {
    // No procesar input si el juego no ha empezado
    if (!gameRunning && !keysPressed[controls.accelerate] && !keysPressed[controls.brake] && !keysPressed[controls.left] && !keysPressed[controls.right]) {
        // Permitir que la fricción actúe si el coche se quedó con velocidad residual antes de reiniciar
         if (car.userData.speed !== 0) {
             car.userData.speed *= FRICTION;
             if (Math.abs(car.userData.speed) < 0.005) car.userData.speed = 0;
         }
        return;
    }

    const carData = car.userData;
    let accelerationInput = 0;
    let turnInput = 0;
    let isTurning = false;

    // Aceleración y Freno (solo si el juego está corriendo)
    if (gameRunning) {
        if (keysPressed[controls.accelerate]) accelerationInput = ACCELERATION;
        if (keysPressed[controls.brake]) {
            if (carData.speed > 0.01) accelerationInput = -BRAKE_FORCE; // Freno
            else if (carData.speed > -MAX_SPEED / 2) accelerationInput = -ACCELERATION / 1.5; // Reversa
        }
    }

    // Aplicar aceleración/freno y luego fricción
    carData.speed += accelerationInput;
    carData.speed *= FRICTION;

    // Limitar velocidad y detener si es muy baja
    carData.speed = Math.max(-MAX_SPEED / 2, Math.min(MAX_SPEED, carData.speed));
    if (Math.abs(carData.speed) < 0.005) carData.speed = 0;

    // Giro (solo si el juego está corriendo y hay velocidad)
    if (gameRunning && Math.abs(carData.speed) > 0.01) {
        if (keysPressed[controls.left]) {
            turnInput = TURN_SPEED;
            isTurning = true;
        }
        if (keysPressed[controls.right]) {
            turnInput = -TURN_SPEED;
             isTurning = true;
        }
        if (carData.speed < 0) turnInput *= -1; // Invertir giro en reversa
    }

    // Aplicar giro si corresponde
    if (isTurning) {
        carData.angle += turnInput;
        car.rotation.y = carData.angle;
    }

    // Actualizar Posición solo si hay velocidad
    if (carData.speed !== 0) {
        const deltaX = Math.sin(carData.angle) * carData.speed;
        const deltaZ = Math.cos(carData.angle) * carData.speed;
        const previousPosition = car.position.clone(); // Guardar posición antes de mover

        car.position.x -= deltaX;
        car.position.z -= deltaZ;

        // --- Detección de Colisiones ---
        // Crear Bounding Box actualizado del coche
        // Usar un Box3 ayuda a manejar la rotación implícitamente
        const carBox = new THREE.Box3().setFromObject(car);

        let collisionWall = false;
        let collisionCar = false;

        // Colisión con muros de la pista
        for (const limit of trackLimits) {
            const limitBox = new THREE.Box3().setFromObject(limit);
            if (carBox.intersectsBox(limitBox)) {
                collisionWall = true;
                break; // Salir si ya chocó con un muro
            }
        }

        // Colisión entre coches
        const otherCar = (car === car1) ? car2 : car1;
        const otherCarBox = new THREE.Box3().setFromObject(otherCar);
        if (carBox.intersectsBox(otherCarBox)) {
            collisionCar = true;
        }

        // --- Respuesta a Colisiones ---
        if (collisionWall) {
            car.position.copy(previousPosition); // Revertir posición al chocar con muro
            carData.speed *= -0.3; // Rebote más fuerte
            // Evitar rebotes infinitos a baja velocidad
            if (Math.abs(carData.speed) < ACCELERATION) carData.speed = 0;
        } else if (collisionCar) {
            // Respuesta simple a colisión entre coches: revertir posición y frenar ambos
            car.position.copy(previousPosition);
            carData.speed *= 0.4; // Frenar al chocar
            // Frenar también al otro coche de forma simple
            if(Math.abs(otherCar.userData.speed) > 0.1) { // Evitar frenar si está quieto
                 otherCar.userData.speed *= 0.6;
            }
        }
    } // Fin if (carData.speed !== 0)
}


// --- Bucle de Animación ---
function animate() {
    requestAnimationFrame(animate); // Bucle continuo

    // Actualizar movimiento de los coches (la lógica interna decide si se mueven)
    updateCarMovement(car1, { accelerate: 'w', brake: 's', left: 'a', right: 'd' });
    updateCarMovement(car2, { accelerate: 'ArrowUp', brake: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' });

    // Renderizar la escena
    renderer.render(scene, camera);
}

// --- Iniciar ---
// Usar DOMContentLoaded para asegurar que el HTML está listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init(); // Si ya está cargado, iniciar directamente
}
