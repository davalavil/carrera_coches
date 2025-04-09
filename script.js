body {
    margin: 0;
    overflow: hidden;
    background-color: #222;
    font-family: 'Press Start 2P', cursive;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    color: white;
}
 /* Ajuste para el contenedor del canvas */
#canvasContainer {
     width: 90vw;
     max-width: 1000px; /* Ajustar si es necesario */
     height: 70vh; /* Un poco más de altura */
     max-height: 650px;
     display: flex;
     justify-content: center;
     align-items: center;
     margin-bottom: 10px;
     border-radius: 8px;
     box-shadow: 0 0 15px rgba(0,0,0,0.5);
     background-color: #5a4d41; /* Color tierra */
}
#gameCanvas {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 8px;
     /* El fondo lo da el contenedor o la escena */
}
/* Estilo para el temporizador (puedes ajustar) */
#timerDisplay {
    color: #FFD700; /* Color dorado */
    background-color: rgba(0, 0, 0, 0.5);
    padding: 5px 10px;
    border-radius: 5px;
}

button {
    font-family: 'Press Start 2P', cursive;
    background-color: #4CAF50;
    border: none;
    color: white;
    padding: 15px 32px;
    text-align: center;
    text-decoration: none;
    display: inline-block;
    font-size: 16px;
    margin-top: 15px; /* Un poco más de margen */
    cursor: pointer;
    border-radius: 8px;
    box-shadow: 0 4px #999;
    transition: all 0.1s ease;
}
button:hover {
    background-color: #45a049;
}
button:active {
    background-color: #3e8e41;
    box-shadow: 0 2px #666;
    transform: translateY(2px);
}
.controls-info {
    margin-top: 15px;
    font-size: 10px;
    text-align: center;
    line-height: 1.5;
}
