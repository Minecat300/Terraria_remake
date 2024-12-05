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
    const tmp = packSignedXY(0, 0);
    for (let x = 0; x < worldWidth; x++) {
        for (let y = 0; y < worldHeight; y++) {
            const idx = getIDX(x, y);

            offsetTileGrid[idx] = tmp;
            offsetWallGrid[idx] = tmp;

            wallGrid[idx] = 0;
            //tileGrid[idx] = (y >= worldGTCH) + 1;
            tileGrid[idx] = randomNumber(1, 2);

        }
    }
}

function randomNumber(min, max) {
    return Math.round(Math.random()*(max-min))+min
}

function packSignedXY(x, y) {
    if (x < -128 || x > 127 || y < -128 || y > 127) {
      throw new Error("x and y must be in the range -128 to 127.");
    }
  
    const xOffset = x + 128;
    const yOffset = y + 128; 
  
    return (yOffset << 8) | xOffset;
}

function unpackSignedXY(value) {
    if (value < 0 || value > 65535) {
      throw new Error("Value must be in the range 0-65535.");
    }
  
    const xOffset = value & 0xFF;        
    const yOffset = (value >> 8) & 0xFF;
  
    const x = xOffset - 128; 
    const y = yOffset - 128;
  
    return [x, y];
}

createWorld(4200, 1200);