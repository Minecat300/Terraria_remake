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
        tileGrid[index] = brush;
        updateTileSolving(index);
        requestChunkUpdate(index);
    }
}

function updateTileSolving(idx, wall = false) {
    solveTile(idx, true, false, wall);
    solveTile(idx + worldWidth, false, false, wall);
    solveTile(idx + 1, false, false, wall);
    solveTile(idx - worldWidth, false, false, wall);
    solveTile(idx - 1, false, false, wall);
    requestChunkUpdate(idx, wall);
    requestChunkUpdate(idx + worldWidth, wall);
    requestChunkUpdate(idx + 1, wall);
    requestChunkUpdate(idx - worldWidth, wall);
    requestChunkUpdate(idx - 1, wall);
}

function requestChunkUpdate(idx) {

    let [chunkX, chunkY] = getXY(idx);

    chunkX = Math.floor(chunkX/chunkSize.width)*chunkSize.width;
    chunkY = Math.floor(chunkY/chunkSize.height)*chunkSize.height;

    const chunckIdx = chunkX + "," + chunkY;

    if (!requestedChuncks.includes(chunckIdx)) {
        requestedChuncks.push(chunckIdx);
    }
}