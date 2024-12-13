const TPU = 1000/60;
const TPF = 1000/60;
let frames = 0;
let updates = 0;
let d = new Date();
let previousTime = d.getTime();
let currentTime = 0;
let timeElapsed = 0;
let deltaUpdates = 0;
let deltaFrames = 0;
let deltaChecks = 0;

showLoadingScreen();

const worldGenWorker = new Worker("js/world/worldGen.js");

setupWorld();

async function setupWorld() {
    tileData = await loadJSON('./js/json/tileData.json');
    tileSolverData = await loadJSON('./js/json/tileSolver.json');
    console.log(tileData);
    console.log(tileSolverData);

    worldGenWorker.postMessage({
        tileData: tileData,
        tileSolverData: tileSolverData
    });
}


worldGenWorker.onmessage = (e) => {
    const data = e.data

    worldWidth = data.worldWidth;
    worldHeight = data.worldHeight;
    worldSize = data.worldSize;
    worldGTCH = data.worldGTCH;
    tileGrid = new Uint16Array(data.tileGrid);
    wallGrid = new Uint16Array(data.wallGrid);
    offsetTileGrid = new Uint16Array(data.offsetTileGrid);
    offsetWallGrid = new Uint16Array(data.offsetWallGrid);
    
    worldGenWorker.terminate();

    startGame();
}

const gameLoop = async () => {
    await sleep(50);
    d = new Date();
    previousTime = d.getTime();
    while (true) {    
        d = new Date();
        if (!document.hasFocus()) {previousTime = d.getTime();}
        currentTime = d.getTime();
        time = currentTime;
        timeElapsed = currentTime - previousTime;
        deltaUpdates += timeElapsed / TPU;
        deltaFrames += timeElapsed / TPF;
        deltaChecks += timeElapsed / 1000;
        previousTime = currentTime;

        if (deltaUpdates >= 1) {
            updateMain();
            deltaUpdates--;
            updates++;
        }
        if (deltaFrames >= 1) {
            renderMain();
            deltaFrames--;
            frames++;
        }
        if (deltaChecks >= 1) {
            console.log("FPS: " + frames + "\nUPS: " + updates);
            updates = 0;
            frames = 0;
            deltaChecks--;
        }
        await sleep(1);
        if (!document.hasFocus()) {previousTime = new Date().getTime();}
    }
}

function showLoadingScreen() {
    ctx.font = "30px Arial";
    ctx.fillText("Loading Please Wait", 10, 50);
}
