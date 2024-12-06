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
    generateSky()
    generateGrass()
}

function generateWorldBase() {
    const tmp = packSignedXY(1, 1);
    for (let x = 0; x < worldWidth; x++) {
        for (let y = 0; y < worldHeight; y++) {
            const idx = getIDX(x, y);

            offsetTileGrid[idx] = tmp;
            offsetWallGrid[idx] = tmp;

            wallGrid[idx] = 0;
            tileGrid[idx] = (y < worldGTCH) + 1;
            //tileGrid[idx] = randomNumber(1, 2);
            //tileGrid[idx] = ((y % 2) && (x % 2)) +1;
        }
    }
    tileGrid[0] = 3
    tileGrid[worldWidth] = 0 
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

function generateSky() {
    for (let x = 0; x < worldWidth; x++) {
        const tY = worldGTCH + (Math.floor((worldHeight-worldGTCH)/2) + Math.floor((Math.sin(x*Math.PI/180) + 1.1*Math.sin(2*x*Math.PI/180))*3))
        for (let y = tY; y < worldHeight - 1; y++) {
            tileGrid[getIDX(x, y)] = 0;
        }
    }
}

function generateGrass() {
    for (let x = 0; x < worldWidth; x++) {
        let y = worldHeight - 2;
        while (tileGrid[getIDX(x, y)] == 0 && y >= 0) {
            y--
        }
        if (tileGrid[getIDX(x, y)] == 1) {
            tileGrid[getIDX(x, y)] = 3;
        }
    }
}

createWorld(4200, 1200);