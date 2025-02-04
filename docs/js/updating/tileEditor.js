let brush = 0;
let smartCursor = false;
let buildDelay = 0;
let tileBreak = {};
let buildGuide = {x: 0, y: 0, active: false};

const defaultInteractionRange = {
    building: {width: 5, height: 5},
    breaking: {width: 4, height: 4}
}

function updateEditorTiles() {
    buildGuide.active = false;
    if (uiOveride) {return;}
    if (creative) {
        creativeEditTiles();
        return;
    }
    editTiles();
}

function editTiles() {
    if (!keyPress.control) {
        m.m5 = true;
    }

    const tool = selectedSlot.item();
    const placeable = itemData[tool.id]?.blockPlaced ?? 0;
    const useTime = itemData[tool.id]?.useTime ?? 15;
    const toolSpeed = itemData[tool.id]?.toolSpeed ?? 0;

    if (keyPress.control && m.m5) {
        m.m5 = false;
        smartCursor = !smartCursor;
    }

    const tx = (mouseX - viewspaceWidth/2)/cam.zoom + cam.x;
    const ty = ((viewspaceHeight - mouseY) - viewspaceHeight/2)/cam.zoom + cam.y;
    let tileX = Math.floor(tx/16);
    let tileY = Math.floor(ty/16);
    let index = getIDX(tileX, tileY);

    if (placeable == 0 && toolSpeed == 0) {return;}

    const brush = placeable;

    let range = defaultInteractionRange.building;
    if (brush == 0) {
        range = defaultInteractionRange.breaking;
    }

    if (smartCursor && brush == 0) {
        let check;
        [tileX, tileY, check] = getClosestTile(brush, tool, range, 90, 10);
        if (!check) {return;}

        index = getIDX(tileX, tileY);
    } else {
        if (capSize(tileX * tilesheetSize, tileY * tilesheetSize, range)) {return;}
        buildGuide = {x: tileX, y: tileY, active: true};
        if (!canTransformTile(index, brush, tool)) {return;}
    }
    buildGuide = {x: tileX, y: tileY, active: true};

    if (buildDelay >= 1) {
        buildDelay--;
    }

    if (!mouseDown) {return;}
    
    if (brush == 0) {
        if (!useBreakingTool(index)) {return;}
    } else {
        if (!useBuildingBlock()) {return;}
    }

    adaptivePlaceTile(brush, index, tileData[brush]?.wall ?? false);
}

function useBreakingTool(idx) {
    const tool = selectedSlot.item();
    const tile = tileGrid[idx];
    const hardness = tileData[tile]?.hardness ?? 100;
    let toolPower;
    if ((itemData[tool.id]?.pickaxePower ?? 0) != 0) {
        toolPower = itemData[tool.id].pickaxePower;
    }
    if (buildDelay < 1) {
        buildDelay = itemData[tool.id]?.toolSpeed ?? 0;
        if (hardness == "grass") {
            adaptivePlaceTile(1, idx);
            playTileSound({name: "Grass", type: ".wav"});
            return false;
        }
        if (!tileBreak.hasOwnProperty(idx)) {
            tileBreak[idx] = hardness;
        }
        tileBreak[idx] -= toolPower;
        adaptivePlaceTile(tile, idx, false);
        playTileSound(tileData[tile]?.sound ?? {name: "Dig_", type: ".wav", amount: {start: 0, end: 2}});
        if (tileBreak[idx] > 0) {return false;}
        delete tileBreak[idx];
        return true;
    }
    return false;
}

function useBuildingBlock() {
    const tool = selectedSlot.item();
    if (buildDelay < 1) {
        buildDelay = 5;
        playTileSound({name: "Dig_", type: ".wav", amount: {start: 0, end: 2}});
        selectedSlot.setAmount(selectedSlot.item().amount - 1);
        if (selectedSlot.item().amount == 0) {
            selectedSlot.set(new item(0, 0));
        }
        return true;
    }
    return false;
}

async function playTileSound(sound) {
    const amount = sound?.amount ?? {start: 0, end: 0};
    let type = "";
    if (amount.start != 0 || amount.end != 0) {
        type = randomNumber(amount.start, amount.end);
    }
    const audio = await loadAudio(`audio/block/${sound.name}${type}${sound.type}`);
    playSoundAsync(audio, false, true);
}

function getClosestTile(brush, tool, range, offsetDir, offsetLength) {
    const dir = pointTowards(mouseX-viewspaceWidth/2 + cam.x, viewspaceHeight/2-mouseY + cam.y, player.pos.x, player.pos.y);
    let ol = offsetLength;
    if (dir < 20 || dir > 340 || (dir < 200 && dir > 160)) {
        ol = offsetLength/1.3;
    }

    let tx = player.pos.x;
    let ty = player.pos.y;
    let index = getIDX(getGridPos(tx), getGridPos(ty));

    while (true) {
        tx += sin(dir);
        ty += cos(dir);
        if (capSize(tx, ty, range)) {return [0, 0, false];}

        index = getIDX(getGridPos(tx), getGridPos(ty));
        if (canTransformTile(index, brush, tool, true)) {return [getGridPos(tx), getGridPos(ty), true];}

        tx += ol * sin(dir + offsetDir);
        ty += ol * cos(dir + offsetDir);
        if (capSize(tx, ty, range)) {return [0, 0, false];}

        index = getIDX(getGridPos(tx), getGridPos(ty));
        if (canTransformTile(index, brush, tool, true)) {return [getGridPos(tx), getGridPos(ty), true];}

        tx += ol*2 * sin(dir - offsetDir);
        ty += ol*2 * cos(dir - offsetDir);
        if (capSize(tx, ty, range)) {return [0, 0, false];}

        index = getIDX(getGridPos(tx), getGridPos(ty));
        if (canTransformTile(index, brush, tool, true)) {return [getGridPos(tx), getGridPos(ty), true];}

        tx += ol * sin(dir + offsetDir);
        ty += ol * cos(dir + offsetDir);
    }
}

function canTransformTile(idx, brush, tool, auto = false) {
    if (!canPlaceBlock(idx, tool, auto) && brush != 0) {return false;}
    if (!canBreakBlock(idx, tool, auto) && brush == 0) {return false;}
    return true;
}

function canBreakBlock(idx, tool, auto) {
    if (tileGrid[idx] == 0) {return false;}
    if (isOnEdge(idx)) {return false;}
    if ((tileData[tileGrid[idx]]?.breakType ?? 0) == 0) {return false;}
    if ((itemData[tool.id]?.pickaxePower ?? 0) != 0) {
        if ((tileData[tileGrid[idx]]?.breakType ?? 0) != 1) {return false;}
    }
    return true;
}

function canPlaceBlock(idx, tool, auto) {
    const tile = itemData[tool.id]?.blockPlaced ?? 0;
    if (isIdxAtPlayer(tile, idx)) {return false;}

    if (tileData[tile]?.wall ?? false) {
        if (auto && (tileData[tileGrid[idx]]?.collisionState ?? "none") == "solid") {return false;}
        if (wallGrid[idx] != 0) {return false;}

        if (wallGrid[idx+1] != 0) {return true;}
        if (wallGrid[idx+worldWidth] != 0) {return true;}
        if (wallGrid[idx-1] != 0) {return true;}
        if (wallGrid[idx-worldWidth] != 0) {return true;}

    } else {
        if (!(tileData[tileGrid[idx]]?.replaceable ?? false)) {return false;}
        if (wallGrid[idx] != 0 && !auto) {return true;}

    }

    if (!(tileData[tileGrid[idx+1]]?.replaceable ?? false)) {return true;}
    if (!(tileData[tileGrid[idx+worldWidth]]?.replaceable ?? false)) {return true;}
    if (!(tileData[tileGrid[idx-1]]?.replaceable ?? false)) {return true;}
    if (!(tileData[tileGrid[idx-worldWidth]]?.replaceable ?? false)) {return true;}
}

function isIdxAtPlayer(tile, idx) {
    const [tileX, tileY] = getXY(idx);
    const collisionState = tileData[tile]?.collisionState ?? "none";
    
    if (collisionState == "none" || collisionState == "passThrough") {return false;}
    if (tileX*tilesheetSize <= player.pos.x - (player.size.width + tilesheetSize)){return false;}
    if (tileX*tilesheetSize >= player.pos.x + player.size.width){return false;}
    if (tileY*tilesheetSize <= player.pos.y - (player.size.height + tilesheetSize)){return false;}
    if (tileY*tilesheetSize >= player.pos.y + player.size.height){return false;}
    return true;
}

function capSize(tx, ty, range) {
    if (tx >= player.pos.x + range.width*tilesheetSize) {return true;}
    if (tx <= player.pos.x - range.width*tilesheetSize) {return true;}
    if (ty >= player.pos.y + range.height*tilesheetSize) {return true;}
    if (ty <= player.pos.y - range.height*tilesheetSize) {return true;}
    return false;
}

function creativeEditTiles() {
    const tileX = Math.floor(((mouseX - viewspaceWidth/2)/cam.zoom + cam.x)/16);
    const tileY = Math.floor((((viewspaceHeight - mouseY) - viewspaceHeight/2)/cam.zoom + cam.y)/16);
    const index = getIDX(tileX, tileY);
    const tile = tileGrid[index];

    if (keyPress.c) {
        brush = tile;
    }
    if (mouseDown) {
        if (tileGrid[index] == brush && !(tileData[brush]?.wall ?? false)) {return;}
        if (wallGrid[index] == brush && (tileData[brush]?.wall ?? false)) {return;}
        adaptivePlaceTile(brush, index, tileData[brush]?.wall ?? false);
    }
}

function adaptivePlaceTile(tile, idx, wall = false) {
    if (isOnEdge(idx)) {return;}
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
    if (isOnEdge(idx)) {return;}

    let itemId;
    if (wall) {
        itemId = tileData[wallGrid[idx]]?.item ?? 0;
        wallGrid[idx] = 0;
    } else {
        itemId = tileData[tileGrid[idx]]?.item ?? 0;
        tileGrid[idx] = 0;
    }

    giveItem(new item(itemId, 1), "inventory");

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

function loadSmartCursor() {
    for (key in itemData) {
        smartCursor[key] = false;
    }
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