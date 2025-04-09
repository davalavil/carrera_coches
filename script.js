// --- Variables Globales ---
let scene, camera, renderer;
let car1, car2;
let trackLimits = []; // Array para guardar TODOS los límites (muros)
const keysPressed = {};
let startTime = 0;
let elapsedTime = 0;
let gameRunning = false;
let timerInterval = null; // Para el intervalo del temporizador

// --- Constantes ---
const CAR_WIDTH = 2; // Un poco más anchos quizás
const CAR_LENGTH = 4;
const MAX_SPEED = 0.4; // Un poco más rápido
const ACCELERATION = 0.015;
const BRAKE_FORCE = 0.025;
const FRICTION = 0.98;
const TURN_SPEED = 0.055;

// Dimensiones de la PISTA NUEVA (basado en la imagen)
const TRACK_WIDTH = 55;   // Ancho total del área interior
const TRACK_HEIGHT = 75;  // Alto total del área interior
const BORDER_THICKNESS = 2; // Grosor de los muros exteriores y central
const CENTER_WALL_WIDTH = 6; // Ancho del muro central
const TURN_GAP = 15; // Espacio arriba y abajo del muro central para girar

// --- Inicialización ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x404040); // Un gris más oscuro para el fondo

    const frustumSize = 90; // Ajustar zoom para ver la nueva pista más grande
    const canvas = document.getElementById('gameCanvas');
    const container = document.getElementById('canvasContainer');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    const aspect = canvas.clientWidth / canvas.clientHeight;

    camera = new THREE.OrthographicCamera(
        frustumSize * aspect / -2,
        frustumSize * aspect / 2,
        frustumSize / 2,
        frustumSize / -2,
        1,
        1000
    );
    camera.position.set(0, 60, 0); // Un poco más arriba
    camera.lookAt(scene.position);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(15, 30, 10);
    scene.add(directionalLight);

    // *** Crear Pista Nueva ***
    createDoubleObstacleTrack();

    // --- Posición inicial de los coches ---
    // Colocarlos abajo, uno en cada "carril"
    const startZ = TRACK_HEIGHT / 2 - CAR_LENGTH * 1.5; // Más cerca del borde inferior
    const startXOffset = (TRACK_WIDTH / 2 + CENTER_WALL_WIDTH / 2) / 2; // Punto medio de un carril

    car1 = createCar(0xff0000, -startXOffset, startZ); // Coche rojo a la izquierda
    car2 = createCar(0x0000ff, startXOffset, startZ);  // Coche azul a la derecha
    scene.add(car1);
    scene.add(car2);

    // --- Event Listeners ---
    document.addEventListener('keydown', (event) => {
        keysPressed[event.key.toLowerCase()] = true;
        keysPressed[event.code] = true; // Usar code para flechas
    });
    document.addEventListener('keyup', (event) => {
        keysPressed[event.key.toLowerCase()] = false;
        keysPressed[event.code] = false;
    });

    document.getElementById('restartButton').addEventListener('click', resetGame);
    window.addEventListener('resize', onWindowResize, false);

    // --- Estado inicial y primer renderizado ---
    resetGame(); // Posiciona coches y reinicia temporizador
    onWindowResize(); // Ajusta tamaño inicial
    animate(); // Inicia el bucle
}

function onWindowResize() {
    const container = document.getElementById('canvasContainer');
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height);

    const aspect = width / height;
    const frustumSize = 90; // Mantener consistente
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
}

// --- Crear Pista (NUEVA FORMA) ---
function createDoubleObstacleTrack() {
    trackLimits.forEach(limit => scene.remove(limit)); // Limpiar pista anterior
    trackLimits = [];

    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 }); // Muros muy oscuros
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x5a4d41 }); // Suelo tierra
    const wallHeight = 2; // Altura visual de los muros

    // --- Suelo (opcional, pero ayuda visualmente) ---
    const floorGeometry = new THREE.PlaneGeometry(TRACK_WIDTH + BORDER_THICKNESS * 2, TRACK_HEIGHT + BORDER_THICKNESS * 2);
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.1; // Ligeramente debajo de los coches
    scene.add(floorMesh);

    // --- Muros Exteriores ---
    // Izquierdo
    const outerLeft = new THREE.Mesh(new THREE.BoxGeometry(BORDER_THICKNESS, wallHeight, TRACK_HEIGHT + BORDER_THICKNESS*2), wallMaterial);
    outerLeft.position.set(-(TRACK_WIDTH / 2 + BORDER_THICKNESS / 2), wallHeight / 2, 0);
    scene.add(outerLeft);
    trackLimits.push(outerLeft);
    // Derecho
    const outerRight = new THREE.Mesh(new THREE.BoxGeometry(BORDER_THICKNESS, wallHeight, TRACK_HEIGHT + BORDER_THICKNESS*2), wallMaterial);
    outerRight.position.set(TRACK_WIDTH / 2 + BORDER_THICKNESS / 2, wallHeight / 2, 0);
    scene.add(outerRight);
    trackLimits.push(outerRight);
    // Superior
    const outerTop = new THREE.Mesh(new THREE.BoxGeometry(TRACK_WIDTH + BORDER_THICKNESS*2, wallHeight, BORDER_THICKNESS), wallMaterial);
    outerTop.position.set(0, wallHeight / 2, -(TRACK_HEIGHT / 2 + BORDER_THICKNESS / 2));
    scene.add(outerTop);
    trackLimits.push(outerTop);
    // Inferior
    const outerBottom = new THREE.Mesh(new THREE.BoxGeometry(TRACK_WIDTH + BORDER_THICKNESS*2, wallHeight, BORDER_THICKNESS), wallMaterial);
    outerBottom.position.set(0, wallHeight / 2, TRACK_HEIGHT / 2 + BORDER_THICKNESS / 2);
    scene.add(outerBottom);
    trackLimits.push(outerBottom);

    // --- Muro Central ---
    const centerWallLength = TRACK_HEIGHT - (TURN_GAP * 2); // Largo del muro dejando huecos
    const centerWall = new THREE.Mesh(new THREE.BoxGeometry(CENTER_WALL_WIDTH, wallHeight, centerWallLength), wallMaterial);
    centerWall.position.set(0, wallHeight / 2, 0); // Centrado en X y Z
    scene.add(centerWall);
    trackLimits.push(centerWall); // ¡IMPORTANTE AÑADIRLO A LOS LÍMITES!

    // --- Línea de salida/meta ---
    const finishLineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const finishLineWidth = TRACK_WIDTH; // Que cruce toda la parte inferior
    const finishLineGeometry = new THREE.PlaneGeometry(finishLineWidth, 2); // Un poco más gruesa
    const finishLine = new THREE.Mesh(finishLineGeometry, finishLineMaterial);
    finishLine.rotation.x = -Math.PI / 2;
    finishLine.position.set(0, 0.05, TRACK_HEIGHT / 2 - 5); // Cerca del borde inferior
    scene.add(finishLine);
}

// --- Crear Coche (Sin cambios) ---
function createCar(color, x, z) {
    const carGeometry = new THREE.BoxGeometry(CAR_WIDTH, 1, CAR_LENGTH); // Un poco más alto
    const carMaterial = new THREE.MeshLambertMaterial({ color: color });
    const carMesh = new THREE.Mesh(carGeometry, carMaterial);
    carMesh.position.set(x, 0.5, z); // Posición Y sobre el suelo (ajustada a la nueva altura)
    carMesh.userData = {
        speed: 0,
        angle: Math.PI // Ángulo inicial hacia arriba (-Z)
    };
    carMesh.rotation.y = carMesh.userData.angle;
    return carMesh;
}

// --- Reiniciar Juego ---
function resetGame() {
    gameRunning = false; // Detener el contador lógico
    if (timerInterval) {
        clearInterval(timerInterval); // Detener el intervalo si existe
        timerInterval = null;
    }
    elapsedTime = 0; // Reiniciar tiempo transcurrido
    startTime = performance.now(); // Establecer nueva hora de inicio
    document.getElementById('timerDisplay').textContent = "Tiempo: 0.00s"; // Mostrar 0

    // Reposicionar coches
    const startZ = TRACK_HEIGHT / 2 - CAR_LENGTH * 1.5;
    const startXOffset = (TRACK_WIDTH / 2 - CENTER_WALL_WIDTH / 2) / 2 + CENTER_WALL_WIDTH / 2; // Ajustado para centrar en carril

    car1.position.set(-startXOffset, 0.5, startZ);
    car1.rotation.y = Math.PI;
    car1.userData.speed = 0;
    car1.userData.angle = Math.PI;

    car2.position.set(startXOffset, 0.5, startZ);
    car2.rotation.y = Math.PI;
    car2.userData.speed = 0;
    car2.userData.angle = Math.PI;

    // Limpiar teclas presionadas
    for (const key in keysPressed) {
        keysPressed[key] = false;
    }

    // Iniciar el juego y el temporizador después de un breve retraso (opcional)
    // setTimeout(() => { gameRunning = true; }, 100); // Pequeña pausa antes de empezar
    gameRunning = true; // O iniciar inmediatamente
}

// --- Actualizar Temporizador ---
function updateTimer() {
    if (!gameRunning) return; // No actualizar si el juego no está corriendo

    elapsedTime = performance.now() - startTime;
    const formattedTime = (elapsedTime / 1000).toFixed(2);
    document.getElementById('timerDisplay').textContent = `Tiempo: ${formattedTime}s`;
}


// --- Actualizar Movimiento del Coche (Sin cambios lógicos importantes) ---
function updateCarMovement(car, controls) {
    const carData = car.userData;
    let accelerationInput = 0;
    let turnInput = 0;

    // Aceleración y Freno
    if (keysPressed[controls.accelerate]) accelerationInput = ACCELERATION;
    if (keysPressed[controls.brake]) {
        if (carData.speed > 0.01) accelerationInput = -BRAKE_FORCE;
        else if (carData.speed > -MAX_SPEED / 2) accelerationInput = -ACCELERATION / 1.5;
    }

    carData.speed += accelerationInput;
    carData.speed *= FRICTION;
    carData.speed = Math.max(-MAX_SPEED / 2, Math.min(MAX_SPEED, carData.speed));
    if (Math.abs(carData.speed) < 0.005) carData.speed = 0;

    // Giro
    if (Math.abs(carData.speed) > 0.01) {
        if (keysPressed[controls.left]) turnInput = TURN_SPEED;
        if (keysPressed[controls.right]) turnInput = -TURN_SPEED;
        if (carData.speed < 0) turnInput *= -1; // Invertir giro en reversa
    }

    carData.angle += turnInput;
    car.rotation.y = carData.angle;

    // Actualizar Posición
    const deltaX = Math.sin(carData.angle) * carData.speed;
    const deltaZ = Math.cos(carData.angle) * carData.speed;
    const previousPosition = car.position.clone();
    car.position.x -= deltaX;
    car.position.z -= deltaZ;

    // --- Detección de Colisiones ---
    const carBox = new THREE.Box3().setFromObject(car);
    let collision = false;

    // Colisión con límites de la pista (incluye muro central)
    for (const limit of trackLimits) {
        const limitBox = new THREE.Box3().setFromObject(limit);
        if (carBox.intersectsBox(limitBox)) {
            collision = true;
            break;
        }
    }

    // Colisión entre coches
    const otherCar = (car === car1) ? car2 : car1;
    const otherCarBox = new THREE.Box3().setFromObject(otherCar);
    if (carBox.intersectsBox(otherCarBox)) {
        collision = true;
        // Podríamos añadir un pequeño "empuje" aquí, pero por ahora solo frenamos
    }

    // Revertir si hay colisión
    if (collision) {
        car.position.copy(previousPosition);
        carData.speed *= 0.1; // Frenazo más brusco en colisión
         if (Math.abs(carData.speed) < 0.01) carData.speed = 0;
    }
}

// --- Bucle de Animación ---
function animate() {
    requestAnimationFrame(animate); // Llamada recursiva para el siguiente frame

    // Actualizar movimiento de los coches
    updateCarMovement(car1, { accelerate: 'w', brake: 's', left: 'a', right: 'd' });
    updateCarMovement(car2, { accelerate: 'ArrowUp', brake: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' });

    // Actualizar el temporizador
    updateTimer();

    // Renderizar la escena
    renderer.render(scene, camera);
}

// --- Iniciar ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
