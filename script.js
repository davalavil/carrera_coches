// --- Variables Globales ---
let scene, camera, renderer;
let car1, car2;
let trackLimits = []; // Array para guardar los límites (visibles)
const keysPressed = {};

// --- Constantes ---
const CAR_WIDTH = 1.5; // Ajustar tamaño si se desea
const CAR_LENGTH = 3;
const MAX_SPEED = 0.35; // Ajustar velocidad si se desea
const ACCELERATION = 0.012;
const BRAKE_FORCE = 0.022;
const FRICTION = 0.98;
const TURN_SPEED = 0.05;

// Dimensiones de la pista rectangular
const TRACK_OUTER_WIDTH = 40; // Ancho exterior
const TRACK_OUTER_HEIGHT = 65; // Alto exterior
const TRACK_INNER_WIDTH = 25; // Ancho interior
const TRACK_INNER_HEIGHT = 50; // Alto interior
const BORDER_THICKNESS = 1; // Grosor visual de los muros

// --- Inicialización ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x5a4d41); // Color tierra

    const frustumSize = 75; // Ajustar zoom para ver bien la pista
    const canvas = document.getElementById('gameCanvas');
    // Asegurarse de que el canvas tenga tamaño inicial antes de calcular aspect
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
    camera.position.set(0, 50, 0);
    camera.lookAt(scene.position);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 5);
    scene.add(directionalLight);

    // *** Crear Pista Rectangular Simple ***
    createTrack();

    // Posición inicial Z en la recta inferior
    const startZ = TRACK_OUTER_HEIGHT / 2 - 5;
    // Calcular X inicial para que estén dentro del carril
    const laneWidth = (TRACK_OUTER_WIDTH - TRACK_INNER_WIDTH) / 2; // Ancho de un carril
    const carSpacing = laneWidth / 2; // Espacio entre coches relativo al carril

    // Ajuste para centrar los coches en sus respectivos "carriles" imaginarios
    const outerEdge = TRACK_OUTER_WIDTH / 2;
    const innerEdge = TRACK_INNER_WIDTH / 2;
    const laneCenter1 = -(outerEdge + innerEdge) / 2 + laneWidth / 2; // Centro del carril izquierdo
    const laneCenter2 = (outerEdge + innerEdge) / 2 - laneWidth / 2;  // Centro del carril derecho

    // Corrección: Posicionar los coches más separados al inicio
    car1 = createCar(0xff0000, -laneWidth / 1.5, startZ); // Mover coche 1 más a la izquierda
    car2 = createCar(0x0000ff, laneWidth / 1.5, startZ);  // Mover coche 2 más a la derecha

    scene.add(car1);
    scene.add(car2);

    resetGame(); // Llama a resetGame para posicionar correctamente

    document.addEventListener('keydown', (event) => {
        keysPressed[event.key.toLowerCase()] = true;
        // Usar event.code para teclas especiales como las flechas
        keysPressed[event.code] = true;
    });
    document.addEventListener('keyup', (event) => {
        keysPressed[event.key.toLowerCase()] = false;
        keysPressed[event.code] = false;
    });

    document.getElementById('restartButton').addEventListener('click', resetGame);
    window.addEventListener('resize', onWindowResize, false);
    onWindowResize(); // Llamar una vez para establecer tamaño inicial
    animate();
}

function onWindowResize() {
    const container = document.getElementById('canvasContainer');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Actualizar tamaño del canvas del renderer
    renderer.setSize(width, height);

    // Actualizar aspect ratio de la cámara
    const aspect = width / height;
    const frustumSize = 75; // Mantener consistente con init
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix(); // Muy importante!
}

// --- Crear Pista (RECTANGULAR SIMPLE) ---
function createTrack() {
    // Limpiar límites anteriores si se recrea la pista
    trackLimits.forEach(limit => scene.remove(limit));
    trackLimits = [];

    const borderMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc }); // Color bordes
    const wallHeight = 1; // Altura visual de los muros

    // --- Límites Exteriores (Ajustados para grosor) ---
    const outerLeft = new THREE.Mesh(new THREE.BoxGeometry(BORDER_THICKNESS, wallHeight, TRACK_OUTER_HEIGHT + BORDER_THICKNESS), borderMaterial);
    outerLeft.position.set(-(TRACK_OUTER_WIDTH / 2 + BORDER_THICKNESS / 2), wallHeight / 2, 0);
    scene.add(outerLeft);
    trackLimits.push(outerLeft);

    const outerRight = new THREE.Mesh(new THREE.BoxGeometry(BORDER_THICKNESS, wallHeight, TRACK_OUTER_HEIGHT + BORDER_THICKNESS), borderMaterial);
    outerRight.position.set(TRACK_OUTER_WIDTH / 2 + BORDER_THICKNESS / 2, wallHeight / 2, 0);
    scene.add(outerRight);
    trackLimits.push(outerRight);

    const outerTop = new THREE.Mesh(new THREE.BoxGeometry(TRACK_OUTER_WIDTH + BORDER_THICKNESS, wallHeight, BORDER_THICKNESS), borderMaterial);
    outerTop.position.set(0, wallHeight / 2, -(TRACK_OUTER_HEIGHT / 2 + BORDER_THICKNESS / 2));
    scene.add(outerTop);
    trackLimits.push(outerTop);

    const outerBottom = new THREE.Mesh(new THREE.BoxGeometry(TRACK_OUTER_WIDTH + BORDER_THICKNESS, wallHeight, BORDER_THICKNESS), borderMaterial);
    outerBottom.position.set(0, wallHeight / 2, TRACK_OUTER_HEIGHT / 2 + BORDER_THICKNESS / 2);
    scene.add(outerBottom);
    trackLimits.push(outerBottom);

    // --- Límites Interiores (Ajustados para grosor) ---
    const innerLeft = new THREE.Mesh(new THREE.BoxGeometry(BORDER_THICKNESS, wallHeight, TRACK_INNER_HEIGHT), borderMaterial);
    innerLeft.position.set(-(TRACK_INNER_WIDTH / 2 - BORDER_THICKNESS / 2), wallHeight / 2, 0);
    scene.add(innerLeft);
    trackLimits.push(innerLeft);

    const innerRight = new THREE.Mesh(new THREE.BoxGeometry(BORDER_THICKNESS, wallHeight, TRACK_INNER_HEIGHT), borderMaterial);
    innerRight.position.set(TRACK_INNER_WIDTH / 2 - BORDER_THICKNESS / 2, wallHeight / 2, 0);
    scene.add(innerRight);
    trackLimits.push(innerRight);

    const innerTop = new THREE.Mesh(new THREE.BoxGeometry(TRACK_INNER_WIDTH, wallHeight, BORDER_THICKNESS), borderMaterial);
    innerTop.position.set(0, wallHeight / 2, -(TRACK_INNER_HEIGHT / 2 - BORDER_THICKNESS / 2));
    scene.add(innerTop);
    trackLimits.push(innerTop);

    const innerBottom = new THREE.Mesh(new THREE.BoxGeometry(TRACK_INNER_WIDTH, wallHeight, BORDER_THICKNESS), borderMaterial);
    innerBottom.position.set(0, wallHeight / 2, TRACK_INNER_HEIGHT / 2 - BORDER_THICKNESS / 2);
    scene.add(innerBottom);
    trackLimits.push(innerBottom);


    // --- Línea de salida/meta ---
    const finishLineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    // Ancho de la línea = ancho del carril total
    const finishLineWidth = TRACK_OUTER_WIDTH - TRACK_INNER_WIDTH - (BORDER_THICKNESS * 2); // Restar grosor de muros internos/externos
    const finishLineGeometry = new THREE.PlaneGeometry(finishLineWidth, 1.5); // Ajustar ancho
    const finishLine = new THREE.Mesh(finishLineGeometry, finishLineMaterial);
    finishLine.rotation.x = -Math.PI / 2;
    // Posicionar en la recta inferior, centrada entre los muros interior y exterior
    finishLine.position.set(0, 0.05, TRACK_OUTER_HEIGHT / 2 - 2); // Un poco antes del borde
    scene.add(finishLine);
}

// --- Crear Coche ---
function createCar(color, x, z) {
    const carGeometry = new THREE.BoxGeometry(CAR_WIDTH, 0.5, CAR_LENGTH);
    const carMaterial = new THREE.MeshLambertMaterial({ color: color });
    const carMesh = new THREE.Mesh(carGeometry, carMaterial);
    carMesh.position.set(x, 0.25, z); // Posición Y sobre el suelo
    carMesh.userData = {
        speed: 0,
        angle: Math.PI // Ángulo inicial hacia arriba (-Z)
    };
     carMesh.rotation.y = carMesh.userData.angle;
    return carMesh;
}

// --- Reiniciar Juego ---
function resetGame() {
    // Reposicionar coches en la nueva línea de salida
    const startZ = TRACK_OUTER_HEIGHT / 2 - 5;
    const laneWidth = (TRACK_OUTER_WIDTH - TRACK_INNER_WIDTH) / 2; // Ancho de un carril
    // const carSpacing = laneWidth / 2; // Espacio entre coches relativo al carril

    // Recalcular posiciones iniciales para que estén más separados y centrados en carriles imaginarios
    const car1StartX = -laneWidth / 1.5; // Ajustar según sea necesario
    const car2StartX = laneWidth / 1.5;

    car1.position.set(car1StartX, 0.25, startZ);
    car1.rotation.y = Math.PI;
    car1.userData.speed = 0;
    car1.userData.angle = Math.PI;

    car2.position.set(car2StartX, 0.25, startZ);
    car2.rotation.y = Math.PI;
    car2.userData.speed = 0;
    car2.userData.angle = Math.PI;

    // Limpiar teclas presionadas
    for (const key in keysPressed) {
        keysPressed[key] = false;
    }
}

// --- Actualizar Movimiento del Coche ---
function updateCarMovement(car, controls) {
    const carData = car.userData;
    let accelerationInput = 0;
    let turnInput = 0;

    // Aceleración y Freno
    if (keysPressed[controls.accelerate]) accelerationInput = ACCELERATION;
    if (keysPressed[controls.brake]) {
        // Frenado más efectivo si va hacia adelante
        if (carData.speed > 0.01) accelerationInput = -BRAKE_FORCE;
        // Aceleración en reversa si está frenado o yendo despacio hacia atrás
        else if (carData.speed > -MAX_SPEED / 2) accelerationInput = -ACCELERATION / 1.5; // Reversa más lenta
    }

    carData.speed += accelerationInput;
    carData.speed *= FRICTION; // Aplicar fricción siempre

    // Limitar velocidad
    carData.speed = Math.max(-MAX_SPEED / 2, Math.min(MAX_SPEED, carData.speed)); // Limita ambos extremos

    // Detener completamente si la velocidad es muy baja
    if (Math.abs(carData.speed) < 0.005) carData.speed = 0;

    // Giro (Solo si hay velocidad)
    if (Math.abs(carData.speed) > 0.01) {
        if (keysPressed[controls.left]) turnInput = TURN_SPEED;
        if (keysPressed[controls.right]) turnInput = -TURN_SPEED;
        // Invertir giro si va en reversa
        if (carData.speed < 0) turnInput *= -1;
    }

    carData.angle += turnInput;
    car.rotation.y = carData.angle;

    // Actualizar Posición basada en el ángulo y velocidad
    const deltaX = Math.sin(carData.angle) * carData.speed;
    const deltaZ = Math.cos(carData.angle) * carData.speed;

    // Guardar posición anterior por si hay colisión
    const previousPosition = car.position.clone();

    // Calcular nueva posición tentativa
    car.position.x -= deltaX;
    car.position.z -= deltaZ;

    // --- Detección de Colisiones Simple (AABB contra límites VISIBLES) ---
    // Crear un Bounding Box para la *nueva* posición del coche
    const carBox = new THREE.Box3().setFromObject(car); // Actualizar la caja a la nueva posición

    let collision = false;
    for (const limit of trackLimits) {
        const limitBox = new THREE.Box3().setFromObject(limit);
        if (carBox.intersectsBox(limitBox)) {
            collision = true;
            break; // Salir del bucle si ya colisionó con un límite
        }
    }

    // --- Detección de Colisión entre Coches ---
    const otherCar = (car === car1) ? car2 : car1;
    const otherCarBox = new THREE.Box3().setFromObject(otherCar);
    if (carBox.intersectsBox(otherCarBox)) {
        collision = true;
        // (Opcional) Podrías añadir un pequeño rebote o efecto aquí
    }


    // Si hubo colisión, revertir a la posición anterior y reducir velocidad
    if (collision) {
        car.position.copy(previousPosition);
        carData.speed *= 0.2; // Frenar bruscamente en colisión
        if (Math.abs(carData.speed) < 0.01) carData.speed = 0; // Detener si casi no se mueve
    }
}

// --- Bucle de Animación ---
function animate() {
    requestAnimationFrame(animate);

    // Actualizar movimiento usando event.code para las flechas
    updateCarMovement(car1, { accelerate: 'w', brake: 's', left: 'a', right: 'd' });
    updateCarMovement(car2, { accelerate: 'ArrowUp', brake: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' });

    renderer.render(scene, camera);
}

// --- Iniciar ---
// Asegurarse de que el DOM esté cargado antes de iniciar Three.js
if (document.readyState === 'loading') { // Si el DOM aún no está listo
    document.addEventListener('DOMContentLoaded', init);
} else { // Si el DOM ya está listo
    init();
}
