let worldWidth;
let worldHeight;
let worldSize;
let worldGTCH;
let tileGrid;
let wallGrid;
let offsetTileGrid;
let offsetWallGrid;

function getIDX(x, y) {
    return x + worldWidth * y;
}

function createWorld(width, height) {
    worldWidth = width;
    worldHeight = height;
    worldSize = width * height;
    worldGTCH = Math.ceil(height / 1.5217391304338754)

    tileGrid = new Uint16Array(worldSize);
    wallGrid = new Uint16Array(worldSize);
    offsetTileGrid = new Uint16Array(worldSize);
    offsetWallGrid = new Uint16Array(worldSize);

    generateWorldBase()
}

function generateWorldBase() {
    for (let x = 0; x < worldWidth; x++) {
        for (let y = 0; y < worldHeight; y++) {
            const idx = getIDX(x, y);
            if (1 == Math.round(Math.random())) { // y < worldGTCH
                tileGrid[idx] = 1;
            } else {
                tileGrid[idx] = 2;
            }
        }
    }
}

createWorld(4200, 1200);