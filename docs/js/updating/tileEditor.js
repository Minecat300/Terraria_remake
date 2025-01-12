let brush = 0;

function creativeEditTiles() {
    const tileX = Math.floor(((mouseX - viewspaceWidth/2)/cam.zoom + cam.x)/16);
    const tileY = Math.floor((((viewspaceHeight - mouseY) - viewspaceHeight/2)/cam.zoom + cam.y)/16);
    const index = getIDX(tileX, tileY);
    const tile = tileGrid[index];

    if (keyPress.c) {
        brush = tile;
    }
    if (mouseDown) {
        placeTile(brush, index, tileData[brush].wall);
    }
}

function placeTile(tile, idx, wall = false) {
    if (tile == 0) {breakBlock(idx, wall);}

    if (wall) {
        wallGrid[idx] = tile;
    } else {
        tileGrid[idx] = tile;
    }
    updateTileSolving(idx, wall);
    requestChunkUpdate(idx);
    updateSkyLight(idx);
}

function breakBlock(idx, wall = false) {
    if (wall) {
        wallGrid[idx] = 0;
    } else {
        tileGrid[idx] = 0;
    }
    updateTileSolving(idx, wall);
    requestChunkUpdate(idx);
    updateSkyLight(idx);
}

function updateTileSolving(idx, wall = false) {
    solveTile(idx, true, false, wall);
    solveTile(idx + worldWidth, false, false, wall);
    solveTile(idx + 1, false, false, wall);
    solveTile(idx - worldWidth, false, false, wall);
    solveTile(idx - 1, false, false, wall);
    requestChunkUpdate(idx);
    requestChunkUpdate(idx + worldWidth);
    requestChunkUpdate(idx + 1);
    requestChunkUpdate(idx - worldWidth);
    requestChunkUpdate(idx - 1);
}

function requestChunkUpdate(idx) {

    let [chunkX, chunkY] = getXY(idx);

    chunkX = Math.floor(chunkX/chunkSize.width)*chunkSize.width;
    chunkY = Math.floor(chunkY/chunkSize.height)*chunkSize.height;

    const chunckIdx = chunkX + "," + chunkY;

    if (!requestedChunks.includes(chunckIdx)) {
        requestedChunks.push(chunckIdx);
    }
}