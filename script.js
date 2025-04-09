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
const MAX_SPEED = 0.45; // Un poco más de velocidad
const ACCELERATION = 0.018;
const BRAKE_FORCE = 0.03;
const FRICTION = 0.975; // Un poco menos de fricción
const TURN_SPEED = 0.055;

// --- Dimensiones PISTA FIGURA 8 ---
const TRACK_OUTER_W = 90; // Ancho total exterior
const TRACK_OUTER_H = 65; // Alto total exterior
const TRACK_THICKNESS = 18; // Ancho de la sección de pista (negra)
// Calculamos las dimensiones de los "agujeros" blancos internos
const HOLE_H = TRACK_OUTER_H - (2 * TRACK_THICKNESS); // Altura del agujero
const HOLE_W = (TRACK_OUTER_W - (3 * TRACK_THICKNESS)) / 2; // Ancho de cada agujero
const WALL_HEIGHT = 2; // Altura visual (o invisible) de los muros de colisión
const COLLISION_WALL_THICKNESS = 0.5; // Grosor para las cajas de colisión invisibles

// --- Inicialización ---
function init() {
    scene = new THREE.Scene();
    // Cambiar el color de fondo para que represente el área "fuera de pista" (blanco o gris claro)
    scene.background = new THREE.Color(0xdcdcdc); // Gris claro

    // Ajustar cámara para la nueva pista
    const frustumSize = 100;
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
    // Ajustar posición y mirada de la cámara
    camera.position.set(0, 70, 10); // Un poco más arriba y ángulo ligero
    camera.lookAt(0, 0, 0); // Mirar al centro de la pista

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    // Iluminación
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(-30, 50, 20); // Ajustar posición de la luz
    directionalLight.castShadow = true; // Opcional: sombras
    scene.add(directionalLight);

    // *** Crear Pista Figura 8 ***
    createFigureEightTrack();

    // --- Posición inicial de los coches (EN LA LÍNEA DE SALIDA IZQUIERDA) ---
    // Calcular la posición X de la línea de salida (centro del carril izquierdo)
    const startX = -(TRACK_OUTER_W / 2 - TRACK_THICKNESS / 2);
    // Calcular posiciones Z iniciales (uno detrás del otro)
    const startZ_car1 = 0 + CAR_LENGTH; // Coche 1 un poco más adelante
    const startZ_car2 = 0 - CAR_LENGTH; // Coche 2 un poco más atrás

    car1 = createCar(0xff0000, startX, startZ_car1); // Rojo
    car2 = createCar(0x0000ff, startX, startZ_car2); // Azul
    scene.add(car1);
    scene.add(car2);

    // --- Event Listeners ---
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.getElementById('restartButton').addEventListener('click', resetGame);
    window.addEventListener('resize', onWindowResize, false);

    // --- Estado inicial y primer renderizado ---
    resetGame(); // Posiciona coches, ajusta ángulo y reinicia temporizador
    onWindowResize();
    animate();
}

function handleKeyDown(event) {
    keysPressed[event.key.toLowerCase()] = true;
    keysPressed[event.code] = true;
    // Iniciar temporizador al presionar la primera tecla de movimiento (si no ha empezado)
    if (!gameRunning && ['w', 's', 'a', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(event.key.toLowerCase())) {
        startGameTimer();
    }
}

function handleKeyUp(event) {
    keysPressed[event.key.toLowerCase()] = false;
    keysPressed[event.code] = false;
}


function onWindowResize() {
    const container = document.getElementById('canvasContainer');
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height);

    const aspect = width / height;
    const frustumSize = 100; // Mantener consistente
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
}

// --- Crear Pista (FIGURA 8) ---
function createFigureEightTrack() {
    trackLimits.forEach(limit => scene.remove(limit)); // Limpiar pista anterior
    trackLimits = [];
    // Remover también la pista visual anterior si existe (por si acaso)
    const oldTrack = scene.getObjectByName("visualTrack");
    if (oldTrack) scene.remove(oldTrack);
    const oldStartLine = scene.getObjectByName("startLine");
    if (oldStartLine) scene.remove(oldStartLine);


    // 1. Crear el plano VISUAL de la pista (negro)
    const trackMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a, side: THREE.DoubleSide }); // Negro o gris muy oscuro
    const trackShape = new THREE.Shape();

    // Definir contorno exterior
    const halfW = TRACK_OUTER_W / 2;
    const halfH = TRACK_OUTER_H / 2;
    trackShape.moveTo(-halfW, -halfH);
    trackShape.lineTo(halfW, -halfH);
    trackShape.lineTo(halfW, halfH);
    trackShape.lineTo(-halfW, halfH);
    trackShape.lineTo(-halfW, -halfH);

    // Definir los agujeros (paths internos)
    const holeHalfW = HOLE_W / 2;
    const holeHalfH = HOLE_H / 2;
    const holeCenterX = HOLE_W / 2 + TRACK_THICKNESS / 2; // Distancia del centro al centro del agujero

    // Agujero izquierdo
    const holePathLeft = new THREE.Path();
    holePathLeft.moveTo(-holeCenterX - holeHalfW, -holeHalfH);
    holePathLeft.lineTo(-holeCenterX + holeHalfW, -holeHalfH);
    holePathLeft.lineTo(-holeCenterX + holeHalfW, holeHalfH);
    holePathLeft.lineTo(-holeCenterX - holeHalfW, holeHalfH);
    holePathLeft.lineTo(-holeCenterX - holeHalfW, -holeHalfH);
    trackShape.holes.push(holePathLeft);

    // Agujero derecho
    const holePathRight = new THREE.Path();
    holePathRight.moveTo(holeCenterX - holeHalfW, -holeHalfH);
    holePathRight.lineTo(holeCenterX + holeHalfW, -holeHalfH);
    holePathRight.lineTo(holeCenterX + holeHalfW, holeHalfH);
    holePathRight.lineTo(holeCenterX - holeHalfW, holeHalfH);
    holePathRight.lineTo(holeCenterX - holeHalfW, -holeHalfH);
    trackShape.holes.push(holePathRight);

    // Crear geometría y mesh para la pista visual
    const trackGeometry = new THREE.ShapeGeometry(trackShape);
    const visualTrackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
    visualTrackMesh.rotation.x = -Math.PI / 2; // Rotar para que quede plano en XZ
    visualTrackMesh.name = "visualTrack"; // Para poder quitarla si se resetea
    scene.add(visualTrackMesh);


    // 2. Crear los MUROS DE COLISIÓN (invisibles)
    const wallMaterialInvisible = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }); // Completamente invisible
    const wallMaterialVisible = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true }); // Para debug (rojo)
    const useVisibleWalls = false; // Poner a true para ver los límites de colisión
    const collisionMaterial = useVisibleWalls ? wallMaterialVisible : wallMaterialInvisible;

    // Función auxiliar para crear muros
    function createWall(width, height, depth, x, y, z) {
        const wallGeometry = new THREE.BoxGeometry(width, height, depth);
        const wallMesh = new THREE.Mesh(wallGeometry, collisionMaterial);
        wallMesh.position.set(x, y, z);
        scene.add(wallMesh);
        trackLimits.push(wallMesh); // Añadir a la lista de colisiones
    }

    // Muros Exteriores (4)
    createWall(TRACK_OUTER_W, WALL_HEIGHT, COLLISION_WALL_THICKNESS, 0, WALL_HEIGHT / 2, halfH); // Arriba
    createWall(TRACK_OUTER_W, WALL_HEIGHT, COLLISION_WALL_THICKNESS, 0, WALL_HEIGHT / 2, -halfH); // Abajo
    createWall(COLLISION_WALL_THICKNESS, WALL_HEIGHT, TRACK_OUTER_H, halfW, WALL_HEIGHT / 2, 0); // Derecha
    createWall(COLLISION_WALL_THICKNESS, WALL_HEIGHT, TRACK_OUTER_H, -halfW, WALL_HEIGHT / 2, 0); // Izquierda

    // Muros del Agujero Izquierdo (4)
    const holeLeftX = -holeCenterX;
    createWall(HOLE_W, WALL_HEIGHT, COLLISION_WALL_THICKNESS, holeLeftX, WALL_HEIGHT / 2, holeHalfH); // Arriba del hueco izq
    createWall(HOLE_W, WALL_HEIGHT, COLLISION_WALL_THICKNESS, holeLeftX, WALL_HEIGHT / 2, -holeHalfH); // Abajo del hueco izq
    createWall(COLLISION_WALL_THICKNESS, WALL_HEIGHT, HOLE_H, holeLeftX + holeHalfW, WALL_HEIGHT / 2, 0); // Derecha del hueco izq
    createWall(COLLISION_WALL_THICKNESS, WALL_HEIGHT, HOLE_H, holeLeftX - holeHalfW, WALL_HEIGHT / 2, 0); // Izquierda del hueco izq

    // Muros del Agujero Derecho (4)
    const holeRightX = holeCenterX;
    createWall(HOLE_W, WALL_HEIGHT, COLLISION_WALL_THICKNESS, holeRightX, WALL_HEIGHT / 2, holeHalfH); // Arriba del hueco der
    createWall(HOLE_W, WALL_HEIGHT, COLLISION_WALL_THICKNESS, holeRightX, WALL_HEIGHT / 2, -holeHalfH); // Abajo del hueco der
    createWall(COLLISION_WALL_THICKNESS, WALL_HEIGHT, HOLE_H, holeRightX + holeHalfW, WALL_HEIGHT / 2, 0); // Derecha del hueco der
    createWall(COLLISION_WALL_THICKNESS, WALL_HEIGHT, HOLE_H, holeRightX - holeHalfW, WALL_HEIGHT / 2, 0); // Izquierda del hueco der


    // 3. Crear la LÍNEA DE SALIDA VISUAL (Blanca)
    const startLineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    // Ancho = Grosor de la pista, Largo = pequeño
    const startLineGeometry = new THREE.PlaneGeometry(TRACK_THICKNESS * 0.8, 2); // Un poco menos ancha que la pista
    const startLineMesh = new THREE.Mesh(startLineGeometry, startLineMaterial);
    startLineMesh.rotation.x = -Math.PI / 2; // Plana en el suelo
    startLineMesh.rotation.z = Math.PI / 2; // Girarla para que sea horizontal
    // Posición: en el centro X del carril izquierdo, en Z = 0
    startLineMesh.position.set(-(TRACK_OUTER_W / 2 - TRACK_THICKNESS / 2), 0.1, 0); // En X del carril izq, Z=0, Y un poco elevado
    startLineMesh.name = "startLine";
    scene.add(startLineMesh);
}


// --- Crear Coche (Sin cambios) ---
function createCar(color, x, z) {
    const carGeometry = new THREE.BoxGeometry(CAR_WIDTH, 1, CAR_LENGTH);
    const carMaterial = new THREE.MeshLambertMaterial({ color: color });
    const carMesh = new THREE.Mesh(carGeometry, carMaterial);
    carMesh.position.set(x, 0.5, z);
    carMesh.userData = {
        speed: 0,
        angle: 0 // Ángulo inicial se establecerá en resetGame
    };
    // La rotación inicial se aplica en resetGame
    return carMesh;
}

// --- Reiniciar Juego ---
function resetGame() {
    stopGameTimer(); // Detiene y limpia el temporizador anterior

    // Reposicionar coches en la línea de salida IZQUIERDA, apuntando hacia ARRIBA (-Z)
    const startX = -(TRACK_OUTER_W / 2 - TRACK_THICKNESS / 2);
    const startZ_car1 = 0 + CAR_LENGTH / 2 + 1; // Coche 1 justo delante de la línea
    const startZ_car2 = 0 - CAR_LENGTH / 2 - 1; // Coche 2 justo detrás de la línea

    // Ángulo para ir hacia arriba (-Z) desde la izquierda
    const initialAngle = Math.PI / 2;

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
    // No iniciar el temporizador aquí, se inicia con el primer movimiento
}

// --- Funciones del Temporizador ---
function startGameTimer() {
    if (gameRunning) return; // Ya está corriendo
    startTime = performance.now();
    elapsedTime = 0;
    gameRunning = true;
    // Actualizar inmediatamente y luego cada cierto intervalo
    updateTimerDisplay();
    if (!timerInterval) { // Evitar múltiples intervalos
       timerInterval = setInterval(updateTimerDisplay, 50); // Actualizar cada 50ms (más fluido)
    }
}

function stopGameTimer() {
    gameRunning = false;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
     // Podrías querer mostrar el tiempo final aquí o dejarlo como está
     document.getElementById('timerDisplay').textContent = `Tiempo: ${(elapsedTime / 1000).toFixed(2)}s`;

}

function updateTimerDisplay() {
    if (!gameRunning) return;
    // Calculamos el tiempo basado en el inicio y el momento actual
    const currentTime = performance.now();
    elapsedTime = currentTime - startTime;
    document.getElementById('timerDisplay').textContent = `Tiempo: ${(elapsedTime / 1000).toFixed(2)}s`;
}


// --- Actualizar Movimiento del Coche (Lógica sin cambios) ---
function updateCarMovement(car, controls) {
    if (!gameRunning && car.userData.speed === 0 && !Object.values(keysPressed).some(k => k)) {
       // No hacer nada si el juego no ha empezado y no se está moviendo/pulsando tecla
       // return; // Cuidado: esto podría impedir el primer movimiento
    }

    const carData = car.userData;
    let accelerationInput = 0;
    let turnInput = 0;

    // Aceleración y Freno
    if (keysPressed[controls.accelerate]) accelerationInput = ACCELERATION;
    if (keysPressed[controls.brake]) {
        if (carData.speed > 0.01) accelerationInput = -BRAKE_FORCE;
        else if (carData.speed > -MAX_SPEED / 2) accelerationInput = -ACCELERATION / 1.5;
    }

    // Solo aplicar aceleración si el juego está activo
    if (gameRunning || accelerationInput !== 0) {
         carData.speed += accelerationInput;
    }

    carData.speed *= FRICTION;
    carData.speed = Math.max(-MAX_SPEED / 2, Math.min(MAX_SPEED, carData.speed));
    if (Math.abs(carData.speed) < 0.005) carData.speed = 0;

    // Giro (Solo si hay velocidad y el juego está activo)
     if (gameRunning && Math.abs(carData.speed) > 0.01) {
        if (keysPressed[controls.left]) turnInput = TURN_SPEED;
        if (keysPressed[controls.right]) turnInput = -TURN_SPEED;
        if (carData.speed < 0) turnInput *= -1;
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

    // Colisión con límites de la pista (exteriores e interiores de los agujeros)
    for (const limit of trackLimits) {
        // Es importante que los muros de colisión tengan un Box3 asociado
        // THREE.Box3().setFromObject(limit) funciona bien si limit es un Mesh
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
        // Simple "rebote" o frenado al chocar entre ellos
         carData.speed *= -0.1; // Pequeño rebote inverso
         otherCar.userData.speed *= -0.1;
    }

    // Revertir si hay colisión con muros
    if (collision && !carBox.intersectsBox(otherCarBox)) { // Solo revertir por muros
        car.position.copy(previousPosition);
        carData.speed *= 0.1; // Frenazo
        if (Math.abs(carData.speed) < 0.01) carData.speed = 0;
    } else if (collision && carBox.intersectsBox(otherCarBox)) {
        // Si choca con otro coche, no revertimos posición completamente, dejamos el rebote
         car.position.x -= deltaX * -0.5; // Permitir un pequeño ajuste por el rebote
         car.position.z -= deltaZ * -0.5;
    }
}


// --- Bucle de Animación ---
function animate() {
    requestAnimationFrame(animate);

    // Actualizar movimiento de los coches
    updateCarMovement(car1, { accelerate: 'w', brake: 's', left: 'a', right: 'd' });
    updateCarMovement(car2, { accelerate: 'ArrowUp', brake: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' });

    // El temporizador se actualiza mediante setInterval ahora, no es necesario aquí
    // updateTimerDisplay(); // Opcional: podrías llamarlo aquí para máxima precisión visual si quitas el setInterval

    renderer.render(scene, camera);
}

// --- Iniciar ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
