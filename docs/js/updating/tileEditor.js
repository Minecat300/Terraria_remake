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
        buildGuide.active = true;
        buildGuide.x = tileX;
        buildGuide.y = tileY;
        if (!canTransformTile(index, brush, tool)) {return;}
    }
    buildGuide.active = true;
    buildGuide.x = tileX;
    buildGuide.y = tileY;

    if (buildDelay >= 1) {
        buildDelay--;
    }

    if (!mouseDown) {return;}

    if (player.handAnimation < 0) {
        player.handAnimation = 0;
    }


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
    const breakType = tileData[tile]?.breakType ?? 0;

    let pickaxePower;
    let axePower;
    let hammerPower;

    if ((itemData[tool.id]?.pickaxePower ?? 0) != 0) {
        pickaxePower = itemData[tool.id].pickaxePower;
    }
    if ((itemData[tool.id]?.axePower ?? 0) != 0) {
        axePower = itemData[tool.id].axePower;
    }
    if ((itemData[tool.id]?.hammerPower ?? 0) != 0) {
        hammerPower = itemData[tool.id].hammerPower;
    }
    if (buildDelay < 1) {
        if (buildAni.delay == 0) {
            buildAni.maxDelay = itemData[tool.id]?.useTime ?? 15;
            buildAni.delay = itemData[tool.id]?.useTime ?? 15;
            buildAni.item = tool;
        }
        
        buildDelay = itemData[tool.id]?.toolSpeed ?? 0;
        if (hardness == "grass") {
            adaptivePlaceTile(1, idx);
            playTileSound({name: "Grass", type: ".wav"});
            return false;
        }
        if (!tileBreak.hasOwnProperty(idx)) {
            tileBreak[idx] = hardness;
        }

        let toolPower = 0;
        switch (breakType) {
            case 1:
                toolPower = pickaxePower;
                break;
            case 2:
                toolPower = axePower;
                break;
            case 3:
                toolPower = hammerPower;
                break;
        }
        
        tileBreak[idx] -= toolPower;

        if ((tileData[tile]?.tileSolver ?? "none") != "none") {
            adaptivePlaceTile(tile, idx, false);
        }

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
        if (buildAni.delay == 0) {
            buildAni.maxDelay = itemData[item.id]?.useTime ?? 15;
            buildAni.delay = itemData[item.id]?.useTime ?? 15;
            buildAni.item = tool;
        }

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
        const underBreak = tileData[tileGrid[idx+worldWidth]]?.underBreak ?? "yes";
        if (underBreak == "no") {return false;}
    }
    if ((itemData[tool.id]?.axePower ?? 0) != 0) {
        if ((tileData[tileGrid[idx]]?.breakType ?? 0) != 2) {return false;}
    }
    return true;
}

function canPlaceBlock(idx, tool, auto) {
    const tile = itemData[tool.id]?.blockPlaced ?? 0;
    if (isIdxAtPlayer(tile, idx)) {return false;}
    if ((tileData[tile]?.multiblockSize ?? "none") != "none") {
        return canPlaceMutliblock(idx, tile);
    }

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

function canPlaceMutliblock(idx, tile) {
    const multiblockSize = tileData[tile].multiblockSize;
    if ((tileData[tile]?.placementRestriction ?? "none") == "breakOnFloat") {
        for (let x = 0; x < multiblockSize.width; x++) {
            if (tileData[tileGrid[idx+x-worldWidth]]?.replaceable ?? false) {return false;}
        }
    }
    for (let x = 0; x < multiblockSize.width; x++) {
        for (let y = 0; y < multiblockSize.height; y++) {
            if (!(tileData[tileGrid[idx + getIDX(x, y)]]?.replaceable ?? false)) {return false;}
        }
    }
    return true;
}

function isIdxAtPlayer(tile, idx) {
    const [tileX, tileY] = getXY(idx);
    const collisionState = tileData[tile]?.collisionState ?? "none";
    
    if (collisionState == "none" || collisionState == "passThrough" || collisionState == "platform") {return false;}
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
    if (tile == 0) {breakBlock(idx, wall); return;}
    if ((tileData[tile]?.multiblockSize ?? "none") != "none") {placeMultiblock(tile, idx); return;}

    if (wall) {
        wallGrid[idx] = tile;
    } else {
        tileGrid[idx] = tile;
    }
    updateTileSolving(idx, wall);
    requestChunkUpdate(idx);
    updateSkyLight(idx);
}

function placeMultiblock(tile, idx) {
    const multiblockSize = tileData[tile].multiblockSize;
    const startIDX = tileData[tile]?.startIDX ?? {x: 0, y: 0};
    for (let x = 0; x < multiblockSize.width; x++) {
        for (let y = 0; y < multiblockSize.height; y++) {
            const index = idx + getIDX(x, y);
            tileGrid[index] = tile;
            offsetTileGrid[index] = packSignedXY(startIDX.x + x, startIDX.y + (multiblockSize.height - y));
            requestChunkUpdate(index);
            updateSkyLight(index);
        }
    }
}

function breakBlock(idx, wall = false, secoundaryUpdates = true) {
    if (isOnEdge(idx)) {return;}
    if ((tileData[tileGrid[idx]]?.multiblockSize ?? "none") != "none") {breakMultiblock(tileGrid[idx], idx); return;}

    const prevTile = tileGrid[idx];

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

    if (secoundaryUpdates) {
        updateTreeBreak(idx, prevTile);
    }
}

function breakMultiblock(tile, idx) {
    const multiblockSize = tileData[tile].multiblockSize;
    const startIDX = tileData[tile]?.startIDX ?? {x: 0, y: 0};
    let [xOffset, yOffset] = unpackSignedXY(offsetTileGrid[idx]);
    yOffset = multiblockSize.height - yOffset;
    xOffset -= startIDX.x;
    yOffset -= startIDX.y;
    let offsetIdx = idx - getIDX(xOffset, yOffset);

    for (let x = 0; x < multiblockSize.width; x++) {
        for (let y = 0; y < multiblockSize.height; y++) {
            const index = offsetIdx + getIDX(x, y);
            tileGrid[index] = 0;
            requestChunkUpdate(index);
            updateSkyLight(index);
        }
    }

    itemId = tileData[tile]?.item ?? 0;
    giveItem(new item(itemId, 1), "inventory");
}

function updateTreeBreak(idx, tile) {
    if (!(tileData[tile]?.tree ?? false)) {return;}
    if ((tileData[tile]?.treeType ?? "none") == "sec") {return;}
    if ((tileData[tileGrid[idx+worldWidth]]?.treeType ?? "none") == "top") {
        tileGrid[idx + worldWidth*1 + 2] = 0;
        tileGrid[idx + worldWidth*1 - 2] = 0;
        tileGrid[idx + worldWidth*5 + 2] = 0;
        tileGrid[idx + worldWidth*5 - 2] = 0;
        requestChunkUpdate(idx + worldWidth*1 + 2);
        requestChunkUpdate(idx + worldWidth*1 - 2);
        requestChunkUpdate(idx + worldWidth*5 + 2);
        requestChunkUpdate(idx + worldWidth*5 - 2);
    }
    if ((tileData[tileGrid[idx-1]]?.treeType ?? "none") == "branch") {
        tileGrid[idx + worldWidth*1 - 2] = 0;
        tileGrid[idx - worldWidth*1 - 2] = 0;
        requestChunkUpdate(idx + worldWidth*1 - 2);
        requestChunkUpdate(idx - worldWidth*1 - 2);
    }
    if ((tileData[tileGrid[idx+1]]?.treeType ?? "none") == "branch") {
        tileGrid[idx + worldWidth*1 + 2] = 0;
        tileGrid[idx - worldWidth*1 + 2] = 0;
        requestChunkUpdate(idx + worldWidth*1 + 2);
        requestChunkUpdate(idx - worldWidth*1 + 2);
    }
    if (tileData[tileGrid[idx-1]]?.tree ?? false) {
        breakBlock(idx-1, false, false);
    }
    if (tileData[tileGrid[idx+1]]?.tree ?? false) {
        breakBlock(idx+1, false, false);
    }
    if (tileData[tileGrid[idx+worldWidth]]?.tree ?? false) {
        breakBlock(idx+worldWidth);
    }
}

function updateTileSolving(idx, wall = false) {
    solveTile(idx, true, false, wall);
    solveTile(idx + worldWidth, false, false, wall);
    solveTile(idx + 1, false, false, wall);
    solveTile(idx - worldWidth, false, false, wall);
    solveTile(idx - 1, false, false, wall);
    solveTile(idx + worldWidth + 1, false, false, wall);
    solveTile(idx - worldWidth + 1, false, false, wall);
    solveTile(idx + worldWidth - 1, false, false, wall);
    solveTile(idx - worldWidth - 1, false, false, wall);
    requestChunkUpdate(idx);
    requestChunkUpdate(idx + worldWidth);
    requestChunkUpdate(idx + 1);
    requestChunkUpdate(idx - worldWidth);
    requestChunkUpdate(idx - 1);
    requestChunkUpdate(idx + worldWidth + 1);
    requestChunkUpdate(idx - worldWidth + 1);
    requestChunkUpdate(idx + worldWidth - 1);
    requestChunkUpdate(idx - worldWidth - 1);
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