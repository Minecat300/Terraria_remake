let worldWidth;
let worldHeight;
let worldSize;
let worldGTCH;
let tileGrid;
let wallGrid;
let offsetTileGrid;
let offsetWallGrid;

let genPreviousTime = 0;
let genCurrentTime = 0;

let maxGroundHeight;
let minGroundHeight;
const maxGroundMove = 0.03;
const groundChance = 10;

const worldBoarders = 10;

function getIDX(x, y) {
    return x + worldWidth * y;
}

function sin(r) {
    return Math.sin(r*Math.PI/180);
}

let genData = {
    tag: "",
    maxMain: 0,
    currentMain: 0,
    maxSec: 0,
    currentSec: 0
}

async function createWorld(width, height) {
    genData.tag = "Setting Up";
    genData.maxMain = 9;
    genData.currentMain = 0;
    genData.maxSec = 0;
    genData.currentSec = 0;
    updateGenBar(1, true);

    worldWidth = width;
    worldHeight = height;
    worldSize = width * height;
    worldGTCH = Math.ceil(height / 1.5217391304338754);

    maxGroundHeight = Math.floor((worldHeight-worldGTCH)/2)+30;
    minGroundHeight = Math.floor((worldHeight-worldGTCH)/2)-30;

    tileGrid = new Uint16Array(worldSize);
    wallGrid = new Uint16Array(worldSize);
    offsetTileGrid = new Uint16Array(worldSize);
    offsetWallGrid = new Uint16Array(worldSize);

    skyLightGrid = new Uint8Array(worldSize);
    lightGrid = new Uint8Array(worldSize);

    generateWorldBase();
    generateStoneAndDirtVerity();
    generateOres();
    generateCaves();
    generateSky();
    generateGrass();
    generateTrees();
    generateWorldBorders();
    await solveTileOffsets();
}

function generateWorldBase() {
    genData.tag = "Adding dirt and stone";
    genData.maxSec = worldSize;
    genData.currentSec = 0;

    const tmp = packSignedXY(1, 1);
    for (let x = 0; x < worldWidth; x++) {
        for (let y = 0; y < worldHeight; y++) {
            const idx = getIDX(x, y);

            offsetTileGrid[idx] = tmp;
            offsetWallGrid[idx] = tmp;

            wallGrid[idx] = 6;
            tileGrid[idx] = (y < worldGTCH) + 1;
            //tileGrid[idx] = randomNumber(1, 2);
            //tileGrid[idx] = ((y % 2) && (x % 2)) +1;
            genData.currentSec++;
            updateGenBar(100);
        }
    }
    genData.currentMain++;
}

function generateSky() {
    genData.tag = "Generating sky";
    genData.maxSec = worldWidth;
    genData.currentSec = 0;

    let groundOffset = Math.floor((minGroundHeight + maxGroundHeight)/2);
    const groundSpace = maxGroundHeight - minGroundHeight;

    let tmp;

    for (let x = 0; x < worldWidth; x++) {
        const tY = worldGTCH + groundOffset + Math.floor(Math.floor((Math.sin(x*Math.PI/180) + 1.1*Math.sin(2*x*Math.PI/180))*3));
        for (let y = tY; y < worldHeight; y++) {
            placeTile(getIDX(x, y), 0, 0);
            placeTile(getIDX(x+1, y), undefined, 0);
            placeTile(getIDX(x-1, y), undefined, 0);
        }
        placeTile(getIDX(x, tY-1), undefined, 0)
        placeTile(getIDX(x+1, tY-1), undefined, 0)
        placeTile(getIDX(x-1, tY-1), undefined, 0)
        genData.currentSec++;
        updateGenBar(10);
        
        if (randomNumber(1, ((groundOffset-minGroundHeight)/groundSpace)*100) < groundChance && groundOffset < maxGroundHeight) {
            groundOffset += Math.max(0, Math.min(5, randomNumber(1, Math.round((groundSpace-(maxGroundHeight-groundOffset))*maxGroundMove))));
        }
        if (randomNumber(1, ((maxGroundHeight-groundOffset)/groundSpace)*100) < groundChance && groundOffset > minGroundHeight) {
            groundOffset -= Math.max(0, Math.min(5, randomNumber(1, Math.round((groundSpace-(groundOffset-minGroundHeight))*maxGroundMove))));
        }
        if (true) {
            if (randomNumber(1, 20) == 1 && maxGroundHeight < Math.floor(250/1200*worldHeight)) {
                if (randomNumber(1, 6) == 1) {
                    tmp = randomNumber(60, 70);
                } else {
                    tmp = randomNumber(1, 5);
                    tmp = randomNumber(1, tmp);
                }
                maxGroundHeight += tmp;
                minGroundHeight += tmp;
            }
            if (randomNumber(1, 20) == 1 && minGroundHeight > Math.floor(worldHeight-worldGTCH)-30) {
                if (randomNumber(1, 6) == 1) {
                    tmp = randomNumber(60, 70);
                } else {
                    tmp = randomNumber(1, 5);
                    tmp = randomNumber(1, tmp);
                }
                maxGroundHeight -= tmp;
                minGroundHeight -= tmp;
            }
        }
    }
    genData.currentMain++;
}

function generateGrass() {
    genData.tag = "Generating grass";
    genData.maxSec = worldWidth;
    genData.currentSec = 0;

    for (let x = 0; x < worldWidth; x++) {
        let y = worldHeight - 1;
        while (tileGrid[getIDX(x, y)] == 0 && y >= 0) {
            y--
        }
        if (tileGrid[getIDX(x, y)] == 1 || tileGrid[getIDX(x, y)] == 3) {
            tileGrid[getIDX(x, y)] = 3;
            if (tileGrid[getIDX(x+1, y)] == 1) {
                tileGrid[getIDX(x+1, y)] = 3;
            }
            if (tileGrid[getIDX(x-1, y)] == 1) {
                tileGrid[getIDX(x-1, y)] = 3;
            }
        }
        genData.currentSec++;
        updateGenBar(10);
    }
    genData.currentMain++;
}

function generateStoneAndDirtVerity() {
    genData.tag = "Generating stone and dirt verity";
    genData.maxSec = 400+700+450+1000;
    genData.currentSec = 0;

    makeDirtInStone(400, 200);
    makeDirtInStone(700, 50);
    makeStoneInDirt(450, 100, worldGTCH + Math.floor((worldHeight - worldGTCH)/2), 10);
    makeStoneInDirt(1000, 20, worldHeight, 5);
    genData.currentMain++;
}

function makeDirtInStone(amount, maxLength){
    for (let i = 0; i < amount; i++) {
        makeSlither(randomNumber(0, worldWidth), randomNumber(0, worldGTCH), randomNumber(2, 5), 1, undefined, 10, maxLength, randomNumber(-2, -0.5, true), randomNumber(0.5, 2, true), randomNumber(-1, -0.5, true), randomNumber(0, 1));
        genData.currentSec++;
        updateGenBar(10);
    }
}

function makeStoneInDirt(amount, maxLength, maxHeight, maxSize) {
    for (let i = 0; i < amount; i++) {
        makeSlither(randomNumber(0, worldWidth), randomNumber(worldGTCH, randomNumber(worldGTCH, maxHeight)), randomNumber(2, maxSize), 2, undefined, 5, maxLength, randomNumber(-2, -0.5, true), randomNumber(0.5, 2, true), randomNumber(-1, -0.5, true), randomNumber(0, 1));
        genData.currentSec++;
        updateGenBar(10);
    }
}

function generateCaves() {
    genData.tag = "Generating caves";
    genData.maxSec = 1000*2+300*2+100*2;
    genData.currentSec = 0;

    placeCave(1000*2, 50, 6, 0);
    placeCave(300*2, 300, 5, 3);
    placeCave(100*2, 25, 7, 0);
    genData.currentMain++;
}

function placeCave(amount, maxLength, maxSize, extended) {
    for (let i = 0; i < amount; i++) {
        makeSlither(randomNumber(0, worldWidth), randomNumber(0, worldGTCH + Math.floor((worldHeight - worldGTCH)/2)), randomNumber(2, maxSize), 0, undefined, 10, maxLength, randomNumber(-2, -0.5, true), randomNumber(0.5, 2, true), randomNumber(-1, -0.1, true), randomNumber(0.1, 1, true));
        for (let i2 = 0; i2 < randomNumber(0, extended); i2++) {
            makeSlither(undefined, undefined, randomNumber(2, maxSize), 0, undefined, 10, maxLength, randomNumber(-2, -0.5, true), randomNumber(0.5, 2, true), randomNumber(-1, -0.1, true), randomNumber(0.1, 1, true));
        }
        genData.currentSec++;
        updateGenBar(10);
    }
}

function generateOres() {
    genData.tag = "Generating ores";
    genData.maxSec = 500+600;
    genData.currentSec = 0;

    placeOre(5, 3, 500, 0, worldHeight, worldGTCH);
    placeOre(4, 3, 600, 0, worldHeight, worldGTCH);
    genData.currentMain++;
}

function placeOre(tile, size, amount, min, max, mid) {
    for (let i = 0; i < amount; i++) {
        makeSlither(randomNumber(0, worldWidth), randomNumber(min, randomNumber(mid, max)), randomNumber(1, randomNumber(1, size)), tile, undefined, 5, randomNumber(5, 15), randomNumber(-2, -0.5, true), randomNumber(0.5, 2, true), randomNumber(-1, -0.5, true), randomNumber(0, 1));
        genData.currentSec++;
        updateGenBar(10);
    }
}

function generateTrees() {
    genData.tag = "Adding Trees";
    genData.maxSec = worldWidth;
    genData.currentSec = 0;
    generateAllTreesOfType(8, 9, 10, 11, 3, 3, randomNumber(0, 5));
    genData.currentMain++;
}

function generateAllTreesOfType(mainStemId, secStemId, topId, branchId, underBlock, varityLength, varity) {
    const random = randomNumber(0, 100);
    for (let x = 0; x < worldWidth; x++) {
        let y = worldHeight-(1+worldBoarders)
        while (y > 1 && (tileData[tileGrid[getIDX(x, y)]]?.replaceable ?? false)) {
            y--;
        }
        if (tileGrid[getIDX(x, y)] != underBlock) {continue;}
        if (wallGrid[getIDX(x, y+1)] != 0) {continue;}

        const height = randomNumber(4, randomNumber(6, 20));
        if (!checkIfCanPlaceTree(getIDX(x, y+1), height)) {continue;}

        const rand = randomNumber(1, Math.ceil(25*sin(57.2957549575*sin(57.2957549575*(1+sin(57.2957549575*0.1*(x+random)))))));
        if (rand == 1) {
            placeTree(mainStemId, secStemId, topId, branchId, getIDX(x, y+1), height, underBlock, varityLength, varity);
        }
        genData.currentSec++;
        updateGenBar(10);
    }
}

function checkIfCanPlaceTree(idx, height) {
    if (!(tileData[tileGrid[idx+1]]?.replaceable ?? false)) {return false;}
    if (!(tileData[tileGrid[idx]]?.replaceable ?? false)) {return false;}
    if (!(tileData[tileGrid[idx-1]]?.replaceable ?? false)) {return false;}

    for (let x = 0; x < 5; x++) {
        for (let y = 0; y < height+4; y++) {
            if (!(tileData[tileGrid[idx+getIDX(x-3,y+1)]]?.replaceable ?? false)) {return false;}
        }
    }

    return true;
}

function placeTree(mainStemId, secStemId, topId, branchId, idx, height, underBlock, varityLength, varity) {
    placeTile(idx, mainStemId);
    if (tileGrid[idx-worldWidth+1] == underBlock) {
        placeTile(idx+1, secStemId);
    }
    if (tileGrid[idx-worldWidth-1] == underBlock) {
        placeTile(idx-1, secStemId);
    }

    for (let i = 0; i < height; i++) {
        placeTile(idx + worldWidth*(i+1), mainStemId);
        if (randomNumber(1, 7) == 1) {
            placeTile(idx + worldWidth*(i+1) + 1, secStemId);
        }
        if (randomNumber(1, 7) == 1) {
            placeTile(idx + worldWidth*(i+1) - 1, secStemId);
        }
    }

    if (randomNumber(1, 5) == 1) {
        placeTile(idx + worldWidth*(height+1), secStemId);
    } else {
        placeTreeTop(topId, idx + worldWidth*(height+1), randomNumber(0, varityLength-1), varity);
    }

    for (let i = 0; i < height-1; i++) {
        checkTreeBranch(idx+worldWidth*(i+2), branchId, varityLength, varity);
    }
}

function checkTreeBranch(idx, branchId, varityLength, varity) {
    if (randomNumber(1, 3) == 1) {
        if (checkBranchSpace(idx-1)) {
            placeTreeBranch(idx-1, false, branchId, varityLength, varity);
        }
    }
    if (randomNumber(1, 3) == 1) {
        if (checkBranchSpace(idx+2)) {
            placeTreeBranch(idx+1, true, branchId, varityLength, varity);
        }
    }
}

function placeTreeBranch(idx, leftRight, branchId, varityLength, varity) {
    const costumeOffset = randomNumber(0, varityLength-1);
    if (leftRight) {
        placeTile(idx, branchId);
        offsetTileGrid[idx] = packSignedXY(1, costumeOffset+varity*varityLength);
        placeTile(idx+1 + worldWidth, branchId);
        offsetTileGrid[idx+1 + worldWidth] = packSignedXY(1+2*1, costumeOffset+varity*varityLength);
        placeTile(idx+1 - worldWidth, branchId);
        offsetTileGrid[idx+1 - worldWidth] = packSignedXY(1+2*2, costumeOffset+varity*varityLength);
    } else {
        placeTile(idx, branchId);
        offsetTileGrid[idx] = packSignedXY(0, costumeOffset+varity*varityLength);
        placeTile(idx-1 + worldWidth, branchId);
        offsetTileGrid[idx-1 + worldWidth] = packSignedXY(2*1, costumeOffset+varity*varityLength);
        placeTile(idx-1 - worldWidth, branchId);
        offsetTileGrid[idx-1 - worldWidth] = packSignedXY(2*2, costumeOffset+varity*varityLength);
    }
}

function checkBranchSpace(idx) {
    if (tileGrid[idx] != 0) {return false;}
    if (tileGrid[idx + worldWidth] != 0) {return false;}
    if (tileGrid[idx - worldWidth] != 0) {return false;}
    if (tileGrid[idx-1] != 0) {return false;}
    if (tileGrid[idx-1 + worldWidth] != 0) {return false;}
    if (tileGrid[idx-1 - worldWidth] != 0) {return false;}
    return true;
}

function placeTreeTop(tile, idx, varityX, varityY) {
    placeTile(idx, tile);
    offsetTileGrid[idx] = packSignedXY(varityX, varityY);
    placeTile(idx-2, tile);
    offsetTileGrid[idx-2] = packSignedXY(varityX+3*1, varityY);
    placeTile(idx+2, tile);
    offsetTileGrid[idx+2] = packSignedXY(varityX+3*2, varityY);
    placeTile(idx-2 + worldWidth*4, tile);
    offsetTileGrid[idx-2 + worldWidth*4] = packSignedXY(varityX+3*3, varityY);
    placeTile(idx+2 + worldWidth*4, tile);
    offsetTileGrid[idx+2 + worldWidth*4] = packSignedXY(varityX+3*4, varityY);
}

async function solveTileOffsets() {
    genData.tag = "Solving tile offsets";
    genData.maxSec = worldSize*2;
    genData.currentSec = 0;

    tmpAdvTilesolverRecipes = [];
    tmpTileSolverArray = [];
    tmpTileSolverPreRecipe = -1;
    tmpTileSolverPreTileGroup = -1;

    for (let i = 0; i < worldSize; i++) {
        solveTile(i, true, true, false);
        genData.currentSec++;
        updateGenBar(100);
    }

    tmpAdvTilesolverRecipes = [];
    tmpTileSolverArray = [];
    tmpTileSolverPreRecipe = -1;
    tmpTileSolverPreTileGroup = -1;

    for (let i = 0; i < worldSize; i++) {
        solveTile(i, true, true, true);
        genData.currentSec++;
        updateGenBar(100);
    }
}

function generateWorldBorders() {
    for (let y = 0; y < worldHeight; y++) {
        let slice = tileGrid.subarray(y*worldWidth, y*worldWidth + worldBoarders);
        slice.fill(2);
        slice = tileGrid.subarray((y+1)*worldWidth-(worldBoarders+1) + 1, (y+1)*worldWidth);
        slice.fill(2);
    }
    for (let y = 0; y < worldBoarders; y++) {
        let slice = tileGrid.subarray(y*worldWidth, (y+1)*worldWidth-1);
        slice.fill(2);
        slice = tileGrid.subarray((y + worldHeight - worldBoarders)*worldWidth, ((y+1 + worldHeight - worldBoarders))*worldWidth-1);
        slice.fill(2);
    }
}

let grid;
let offsetGrid;

function solveTile(idx, center, all, wall) {

    if (wall) {
        grid = wallGrid;
        offsetGrid = offsetWallGrid;
    } else {
        grid = tileGrid;
        offsetGrid = offsetTileGrid;
    }


    const tileGroup = grid[idx];
    const cos = offsetGrid[idx];

    let tileSolver = tileData[tileGroup]?.tileSolver ?? "none";
    const tileSolverFallback = tileData[tileGroup]?.tileSolverFallback ?? "none";

    if (tileSolver === "none") {return;}
    if (tileSolver.includes("adv_")) {
        solveAdvancedTile(idx, center, all, wall);
        if (tmpTileSolverArray.length > 0 || tileSolverFallback == "none") {
            return;
        }
        tileSolver = tileSolverFallback;
    }

    let recipe = buildRecipe(idx + worldWidth, idx);
    recipe += buildRecipe(idx + 1, idx);
    recipe += buildRecipe(idx - worldWidth, idx);
    recipe += buildRecipe(idx - 1, idx);

    if (!(all && (recipe === tmpTileSolverPreRecipe && tileGroup === tmpTileSolverPreTileGroup))) {

        tmpTileSolverPreRecipe = recipe;
        tmpTileSolverPreTileGroup = tileGroup;
        tmpTileSolverArray = [];

        const tmpSolverData = tileSolverData[tileSolver];

        for (const key in tmpSolverData) {
            const value = tmpSolverData[key];
            if (value.includes(recipe)) {
                if (center || !(tmpSolverData[cos]?.includes(recipe) ?? false)) {
                    tmpTileSolverArray.push(key);
                }
            }
        }
    }
    if (tmpTileSolverArray.length > 0) {
        const rand = randomNumber(0, tmpTileSolverArray.length-1)
        offsetGrid[idx] = tmpTileSolverArray[rand];
    }
}

function buildRecipe(edgeIDX, mainIDX) {
    const edgeTileID = grid?.[edgeIDX] !== undefined ? grid[edgeIDX] : 0;
    const mainTileID = grid?.[mainIDX] !== undefined ? grid[mainIDX] : 0;

    const edgeTileData = tileData[edgeTileID];
    const mainTileData = tileData[mainTileID];

    return Number(edgeTileData.collisionState === mainTileData.collisionState).toString();
}

function solveAdvancedTile(idx, center, all, wall) {

    const tileGroup = grid[idx];
    const cos = offsetGrid[idx];

    const tileSolver = tileData[tileGroup]?.tileSolver ?? "none";

    let recipe = [];
    recipe.push(buildAdvancedRecipe(idx + worldWidth));
    recipe.push(buildAdvancedRecipe(idx + worldWidth + 1));
    recipe.push(buildAdvancedRecipe(idx + 1));
    recipe.push(buildAdvancedRecipe(idx - worldWidth + 1));
    recipe.push(buildAdvancedRecipe(idx - worldWidth));
    recipe.push(buildAdvancedRecipe(idx - worldWidth - 1));
    recipe.push(buildAdvancedRecipe(idx - 1));
    recipe.push(buildAdvancedRecipe(idx + worldWidth - 1));

    tmpTileSolverArray = [];
    tmpTileSolverPreRecipe = -1;
    tmpTileSolverPreTileGroup = -1;

    const tmpSolverData = tileSolverData[tileSolver];
    const solverMetadata = tileData[tileGroup]?.tileSolverMetadata ?? "none";

    if (solverMetadata == "none") {return;}

    if (tmpAdvTilesolverRecipes.hasOwnProperty(tileGroup) && all) {
        if (tmpAdvTilesolverRecipes[tileGroup].hasOwnProperty(recipe)) {
            tmpTileSolverArray = tmpAdvTilesolverRecipes[tileGroup][recipe];
        }
    }

    if (tmpTileSolverArray.length == 0 || !all) {

        let sameIdCheck = false;
        if (tmpSolverData.hasOwnProperty(cos)) {
            sameIdCheck = compareFullAdvancedID(recipe, tmpSolverData[cos], solverMetadata);
        }

        for (const key in tmpSolverData) {
            const value = tmpSolverData[key];
            if (compareFullAdvancedID(recipe, value, solverMetadata)) {
                if (center || !sameIdCheck) {
                    tmpTileSolverArray.push(key);
                } else {
                    tmpTileSolverArray.push("skip");
                    return;
                }
            }
        }

        if (tmpTileSolverArray.length > 0 && all) {
            if (!tmpAdvTilesolverRecipes.hasOwnProperty(tileGroup)) {
                tmpAdvTilesolverRecipes[tileGroup] = {};
            }
            tmpAdvTilesolverRecipes[tileGroup][recipe] = tmpTileSolverArray;
        }
    }

    if (tmpTileSolverArray.length > 0) {
        const rand = randomNumber(0, tmpTileSolverArray.length-1);
        offsetGrid[idx] = tmpTileSolverArray[rand];
    }
}

function compareFullAdvancedID(checkId, recipeId, solverMetadata) {
    for (let i = 0; i < recipeId.length; i++) {
        if (compareSingleAdvancedID(checkId, recipeId[i], solverMetadata)) {
            return true;
        }
    }
    return false;
}

function compareSingleAdvancedID(checkId, recipeId, solverMetadata) {
    for (let i = 0; i < 8; i++) {
        const currentRecipe = recipeId.substr(i*2 + 1, 1);
        const currentCheckId = checkId[i];
        if (currentRecipe == 0) {continue;}

        const metaId = solverMetadata[currentRecipe];

        let correctId = false;

        for (let i2 = 0; i2 < metaId.length; i2++) {
            const subId = metaId[i2];

            if (subId.type == "id") {
                for (let i3 = 0; i3 < subId.data.length; i3++) {
                    if (correctId) {break;}
                    correctId = subId.data[i3] == currentCheckId;
                }
            }
            if (subId.type == "custom") {
                const dataValue = tileData[currentCheckId]?.[subId.cType] ?? subId.cDefault;
                correctId = dataValue == subId.data;
            }

            if (subId?.reversed ?? false) {
                correctId = !correctId;
            }

            if (correctId) {break;}
        }
        
        if (recipeId.substr(i*2, 1) == "!") {
            correctId = !correctId;
        }
        
        if (!correctId) {
            return false;
        }
    }
    return true;
}

function buildAdvancedRecipe(edgeIDX) {
    return edgeTileID = grid?.[edgeIDX] !== undefined ? grid[edgeIDX] : 0;
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
var tileData;

let tmpTileSolverArray = [];
let tmpTileSolverPreRecipe = -1;
let tmpTileSolverPreTileGroup = -1;

let tmpAdvTilesolverRecipes = {};

let sx = 0;
let sy = 0;

this.onmessage = function (e) {
    (async () => {
        tileData = e.data.tileData;
        tileSolverData = e.data.tileSolverData;
        await createWorld(4200, 1200);
    
        self.postMessage({
            type: "world",
            worldWidth: worldWidth, worldHeight: worldHeight, worldSize: worldSize, worldGTCH: worldGTCH,
            tileGrid: tileGrid, wallGrid: wallGrid, offsetTileGrid: offsetTileGrid, offsetWallGrid: offsetWallGrid 
        });
    })();
}

function updateGenBar(perTick, force = false) {

    if (genData.currentSec % perTick === 0) {

        const d = new Date();
        genCurrentTime = d.getTime();

        if (genCurrentTime > genPreviousTime+20 || force) {

            genPreviousTime = genCurrentTime;
            self.postMessage({
                type: "genUpdate", genData: genData
            });
        }
    }
}
