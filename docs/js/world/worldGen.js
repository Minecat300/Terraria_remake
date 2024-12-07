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

async function createWorld(width, height) {
    worldWidth = width;
    worldHeight = height;
    worldSize = width * height;
    worldGTCH = Math.ceil(height / 1.5217391304338754);

    tileGrid = new Uint16Array(worldSize);
    wallGrid = new Uint16Array(worldSize);
    offsetTileGrid = new Uint16Array(worldSize);
    offsetWallGrid = new Uint16Array(worldSize);

    generateWorldBase();
    generateStoneAndDirtVerity();
    generateOres();
    generateCaves();
    generateSky();
    generateGrass();
    await solveTileOffsets();
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
}

function generateSky() {
    for (let x = 0; x < worldWidth; x++) {
        const tY = worldGTCH + (Math.floor((worldHeight-worldGTCH)/2) + Math.floor((Math.sin(x*Math.PI/180) + 1.1*Math.sin(2*x*Math.PI/180))*3))
        for (let y = tY; y < worldHeight; y++) {
            tileGrid[getIDX(x, y)] = 0;
        }
    }
}

function generateGrass() {
    for (let x = 0; x < worldWidth; x++) {
        let y = worldHeight - 1;
        while (tileGrid[getIDX(x, y)] == 0 && y >= 0) {
            y--
        }
        if (tileGrid[getIDX(x, y)] == 1) {
            tileGrid[getIDX(x, y)] = 3;
        }
    }
}

function generateStoneAndDirtVerity() {
    makeDirtInStone(400, 200);
    makeDirtInStone(700, 50);
    makeStoneInDirt(450, 100, worldGTCH + Math.floor((worldHeight - worldGTCH)/2), 10);
    makeStoneInDirt(1000, 20, worldHeight, 5);
}

function makeDirtInStone(amount, maxLength){
    for(let i = 0; i < amount; i++) {
        makeSlither(randomNumber(0, worldWidth), randomNumber(0, worldGTCH), randomNumber(2, 5), 1, undefined, 10, maxLength, randomNumber(-2, -0.5, true), randomNumber(0.5, 2, true), randomNumber(-1, -0.5, true), randomNumber(0, 1));
    }
}

function makeStoneInDirt(amount, maxLength, maxHeight, maxSize) {
    for(let i = 0; i < amount; i++) {
        makeSlither(randomNumber(0, worldWidth), randomNumber(worldGTCH, randomNumber(worldGTCH, maxHeight)), randomNumber(2, maxSize), 2, undefined, 5, maxLength, randomNumber(-2, -0.5, true), randomNumber(0.5, 2, true), randomNumber(-1, -0.5, true), randomNumber(0, 1));
    }
}

function generateCaves() {
    placeCave(1000, 50, 6, 0);
    placeCave(300, 300, 5, 3);
    placeCave(100, 25, 7, 0);
}

function placeCave(amount, maxLength, maxSize, extended) {
    for(let i = 0; i < amount; i++) {
        makeSlither(randomNumber(0, worldWidth), randomNumber(0, worldGTCH + Math.floor((worldHeight - worldGTCH)/2)), randomNumber(2, maxSize), 0, undefined, 10, maxLength, randomNumber(-2, -0.5, true), randomNumber(0.5, 2, true), randomNumber(-1, -0.1, true), randomNumber(0.1, 1, true));
        for(let i2 = 0; i2 < randomNumber(0, extended); i2++) {
            makeSlither(undefined, undefined, randomNumber(2, maxSize), 0, undefined, 10, maxLength, randomNumber(-2, -0.5, true), randomNumber(0.5, 2, true), randomNumber(-1, -0.1, true), randomNumber(0.1, 1, true));
        }
    }
}

function generateOres() {
    placeOre(5, 3, 500, 0, worldHeight, worldGTCH);
    placeOre(4, 3, 600, 0, worldHeight, worldGTCH);
}

function placeOre(tile, size, amount, min, max, mid) {
    for(let i = 0; i < amount; i++) {
        makeSlither(randomNumber(0, worldWidth), randomNumber(min, randomNumber(mid, max)), randomNumber(1, randomNumber(1, size)), tile, undefined, 5, randomNumber(5, 15), randomNumber(-2, -0.5, true), randomNumber(0.5, 2, true), randomNumber(-1, -0.5, true), randomNumber(0, 1));
    }
}

async function solveTileOffsets() {

    tmpTileSolverArray = [];
    tmpTileSolverPreRecipe = -1;
    tmpTileSolverPreTileGroup = -1;

    for (let i = 0; i < worldSize; i++) {
        solveTile(i, true, true);
    }
}

function solveTile(idx, center, all) {
    const tileGroup = tileGrid[idx];
    const cos = offsetTileGrid[idx];

    if (tileData[tileGroup].tileSolver === "none") {return;}

    let recipe = buildRecipe(idx + worldWidth, idx);
    recipe += buildRecipe(idx + 1, idx);
    recipe += buildRecipe(idx - worldWidth, idx);
    recipe += buildRecipe(idx - 1, idx);

    if (!(all && (recipe === tmpTileSolverPreRecipe && tileGrid === tmpTileSolverPreTileGroup))) {

        tmpTileSolverPreRecipe = recipe;
        tmpTileSolverPreTileGroup = tileGroup;
        tmpTileSolverArray = [];

        const tmpSolverData = tileSolverData[tileData[tileGroup].tileSolver];

        for (const key in tmpSolverData) {
            const value = tmpSolverData[key];
            if (value.includes(recipe)) {
                if (center || !tmpSolverData[cos].includes(recipe)) {
                    tmpTileSolverArray.push(key);
                }
            }
        }
    }
    if (tmpTileSolverArray.length > 0) {
        const rand = randomNumber(0, tmpTileSolverArray.length-1)
        offsetTileGrid[idx] = tmpTileSolverArray[rand];
    }
}

function buildRecipe(edgeIDX, mainIDX) {
    const edgeTileID = tileGrid?.[edgeIDX] !== undefined ? tileGrid[edgeIDX] : 0;
    const mainTileID = tileGrid?.[mainIDX] !== undefined ? tileGrid[mainIDX] : 0;

    const edgeTileData = tileData[edgeTileID];
    const mainTileData = tileData[mainTileID];

    return Number(edgeTileData.collisionState === mainTileData.collisionState).toString();
}

function placeTile(idx, tile, wallTile) {
    if (tile != undefined) {
        tileGrid[idx] = tile;
        offsetTileGrid[idx] = 32896;
    }
    if (wallTile != undefined) {
        wallGrid[idx] = wallTile;
        offsetWallGrid[idx] = 32896;
    }
}

function circlePoints(cx, cy, x, y, tile, wallTile) {
    if (x == 0) {
        placeTile(getIDX(cx, cy + y), tile, wallTile);
        placeTile(getIDX(cx, cy - y), tile, wallTile);
        placeTile(getIDX(cx + y, cy), tile, wallTile);
        placeTile(getIDX(cx - y, cy), tile, wallTile);
    } else {
        if (x == y) {
            placeTile(getIDX(cx + x, cy + y), tile, wallTile);
            placeTile(getIDX(cx + x, cy - y), tile, wallTile);
            placeTile(getIDX(cx - x, cy + y), tile, wallTile);
            placeTile(getIDX(cx - x, cy - y), tile, wallTile);
        } else {
            if (x < y) {
                placeTile(getIDX(cx + x, cy + y), tile, wallTile);
                placeTile(getIDX(cx + x, cy - y), tile, wallTile);
                placeTile(getIDX(cx - x, cy + y), tile, wallTile);
                placeTile(getIDX(cx - x, cy - y), tile, wallTile);
                placeTile(getIDX(cx + y, cy + x), tile, wallTile);
                placeTile(getIDX(cx + y, cy - x), tile, wallTile);
                placeTile(getIDX(cx - y, cy + x), tile, wallTile);
                placeTile(getIDX(cx - y, cy - x), tile, wallTile);
            }
        }
    }
}

function makeCircle(xc, yc, r, tile, wallTile) {
    let x = 0;
    let y = r;
    let p = (5-(r*4))/4;
    circlePoints(xc, yc, x, y, tile, wallTile);
    while (x < y) {
        x++;
        if (p < 0) {
            p += 2*x + 1;
        } else {
            y--;
            p += 2*(x-y) + 1;
        }
        circlePoints(xc, yc, x, y, tile, wallTile);
    }
}

function fixFillCircle(x, y, byX, byY, tile, wallTile) {
    placeTile(getIDX(x + byX, y + byY), tile, wallTile);
    placeTile(getIDX(x + byY, y + byX), tile, wallTile);
    placeTile(getIDX(x - byX, y + byY), tile, wallTile);
    placeTile(getIDX(x - byY, y + byX), tile, wallTile);
    placeTile(getIDX(x + byX, y - byY), tile, wallTile);
    placeTile(getIDX(x + byY, y - byX), tile, wallTile);
    placeTile(getIDX(x - byX, y - byY), tile, wallTile);
    placeTile(getIDX(x - byY, y - byX), tile, wallTile);
}

function fillCircle(x, y, size, tile, wallTile) {
    placeTile(getIDX(x, y), tile, wallTile);
    
    for (let r = Math.floor(size); r > 0; r--) {
        makeCircle(x, y, r, tile, wallTile);
    }
    if (size >= 2) {
        fixFillCircle(x, y, 1, 1, tile, wallTile);
    }
    if (size >= 5) {
        fixFillCircle(x, y, 4, 2, tile, wallTile);
    }
    if (size >= 7) {
        fixFillCircle(x, y, 5, 4, tile, wallTile);
    }
    if (size >= 9) {
        fixFillCircle(x, y, 6, 6, tile, wallTile);
    }
    if (size >= 10) {
        fixFillCircle(x, y, 9, 3, tile, wallTile);
        fixFillCircle(x, y, 8, 5, tile, wallTile);
    }
}

function makeSlither(x, y, size, tile, wallTile, minLength, maxLength, minMoveX, maxMoveX, minMoveY, maxMoveY) {
    if (x != undefined) {
        sx = x;
    }
    if (y != undefined) {
        sy = y;
    }
    const length = randomNumber(minLength, maxLength);
    for (let i = 0; i < length; i++) {
        fillCircle(Math.floor(sx), Math.floor(sy), size, tile, wallTile);
        sx += randomNumber(minMoveX, maxMoveX, true);
        sy += randomNumber(minMoveY, maxMoveY, true);
    }
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

function randomNumber(min, max, decimal = false) {
    if(decimal) {
        return Math.random()*(max-min)+min
    } else {
        return Math.round(Math.random()*(max-min))+min
    }
    
}

async function loadJSON(path) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${path}: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error loading JSON:', error);
      throw error;
    }
}

let tileSolverData;
let tileData;

let tmpTileSolverArray = [];
let tmpTileSolverPreRecipe = -1;
let tmpTileSolverPreTileGroup = -1;

let sx = 0;
let sy = 0;

this.onmessage = function (e) {
    (async () => {
        tileData = e.data.tileData;
        tileSolverData = e.data.tileSolverData;
        await createWorld(4200, 1200);
    
        self.postMessage({
            worldWidth: worldWidth, worldHeight: worldHeight, worldSize: worldSize, worldGTCH: worldGTCH,
            tileGrid: tileGrid, wallGrid: wallGrid, offsetTileGrid: offsetTileGrid, offsetWallGrid: offsetWallGrid 
        });
    })();
}


