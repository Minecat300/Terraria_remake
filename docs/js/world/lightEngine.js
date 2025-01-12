let skyLightGrid;
let lightGrid;

let lucIdx;

let _LtileData;
let _LtileGrid;
let _LwallGrid;
let _LgenData;
let _LworldWidth;
let _LworldHeight;
let _LworldSize;

let _LgenPreviousTime = 0;
let _LgenCurrentTime = 0;

this.onmessage = function (e) {
    const data = e.data;

    _LtileData = data.tileData;
    _LtileGrid = new Uint16Array(data.tileGrid);
    _LwallGrid = new Uint16Array(data.wallGrid);
    _LgenData = data.genData;
    _LworldWidth = data.worldSize.width;
    _LworldHeight = data.worldSize.height;
    _LworldSize = _LworldWidth * _LworldHeight;

    skyLightGrid = new Uint8Array(_LworldSize);
    lightGrid = new Uint8Array(_LworldSize);

    (async () => {
        await generateSkyLight();
        self.postMessage({
            type: "world",
            skyLightGrid: skyLightGrid,
            lightGrid: lightGrid
        });
    })();
}

async function generateSkyLight() {
    _LgenData.tag = "Generating Light";
    _LgenData.maxSec = _LworldHeight - 2;
    _LgenData.currentSec = 0;
    updateGenBar(1, true);

    for (let x = 1; x < _LworldWidth - 2; x++) {
        skyLightGrid[1+x + _LworldWidth*(_LworldHeight-1)] = 200;
    }

    for (let y = 2; y < _LworldHeight/2 - 1; y++) {
        const ty = _LworldHeight - y;
        spreadLightStripe(ty);
        _LgenData.currentSec++;
        updateGenBar(10);
    }

    for (let y = 1; y < _LworldHeight/2 - 1; y++) {
        const ty = y + _LworldHeight/2;
        spreadLightStripe(ty);
        _LgenData.currentSec++;
        updateGenBar(10);
    }

    _LgenData.currentMain++;
    _LgenData.tag = "Done!";
    updateGenBar(1, true);
}

async function spreadLightStripe(y) {
    let lumen = [];
    let idx = [];

    for (let x = 1; x < _LworldWidth-1; x++) {
        lumen.push(skyLightGrid[y*_LworldWidth + _LworldWidth + x]);
        idx.push(y*_LworldWidth + x);
    }

    idx = sortLightArrays(lumen, idx);

    for (let index in idx) {
        spreadLightTo(idx[index]);
    }
}

function sortLightArrays(lumenArray, idxArray) {
    const combined = lumenArray.map((lumen, index) => ({ lumen, idx: idxArray[index] }));

    combined.sort((a, b) => b.lumen - a.lumen);

    const sortedLumen = combined.map(item => item.lumen);
    const sortedIdx = combined.map(item => item.idx);

    return sortedIdx;
}

function spreadLightTo(idx) {
    let currentLumens = Math.max(
        _LgetSkyLightAfterBlock(idx + _LworldWidth),
        _LgetSkyLightAfterBlock(idx + 1),
        _LgetSkyLightAfterBlock(idx - 1),
        _LgetSkyLightAfterBlock(idx - _LworldWidth)
    );

    if (currentLumens < 1) {currentLumens = 0;}
    if (currentLumens > skyLightGrid[idx]) {
        skyLightGrid[idx] = currentLumens;
    }
}

function _LgetSkyLightAfterBlock(idx) {
    return Math.floor(skyLightGrid[idx] * _LgetLightBlock(idx));
}

function _LgetLightBlock(idx) {
    const tileId = _LtileGrid?.[idx] !== undefined ? _LtileGrid[idx] : 0;
    const wallId = _LwallGrid?.[idx] !== undefined ? _LwallGrid[idx] : 0;

    let tmp = 1 - _LtileData[tileId].lightBlock/100;
    if (tileId == 0) {
        tmp = 1 - _LtileData[wallId].lightBlock/100;
        if (wallId == 0) {
            tmp = 1;
        }
    }
    return tmp;
}

function getSkyLightAfterBlock(idx) {
    return Math.floor(skyLightGrid[idx] * getLightBlock(idx));
}

function getLightBlock(idx) {
    const tileId = tileGrid?.[idx] !== undefined ? tileGrid[idx] : 0;
    const wallId = wallGrid?.[idx] !== undefined ? wallGrid[idx] : 0;

    let tmp = 1 - tileData[tileId].lightBlock/100;
    if (tileId == 0) {
        tmp = 1 - tileData[wallId].lightBlock/100;
        if (wallId == 0) {
            tmp = 1;
        }
    }
    return tmp;
}

function updateGenBar(perTick, force = false) {

    if (_LgenData.currentSec % perTick === 0) {

        const d = new Date();
        _LgenCurrentTime = d.getTime();

        if (_LgenCurrentTime > _LgenPreviousTime+20 || force) {

            _LgenPreviousTime = _LgenCurrentTime;
            self.postMessage({
                type: "genUpdate", genData: _LgenData
            });
        }
    }
}

function updateSkyLight(idx) {
    lucIdx = [];
    updateSingleSkyLight(idx);

    for (let i = 0; i < lucIdx.length; i++) {
        updateSingleSkyLight(lucIdx[i]);
    }
}

function updateSingleSkyLight(idx) {
    checkSkyLight(idx + worldWidth);
    checkSkyLight(idx + 1);
    checkSkyLight(idx - worldWidth);
    checkSkyLight(idx - 1);
}

function checkSkyLight(idx) {
    if (lucIdx.includes(idx)) {return;}

    let currentLumens = Math.max(
        getSkyLightAfterBlock(idx + worldWidth),
        getSkyLightAfterBlock(idx + 1),
        getSkyLightAfterBlock(idx - worldWidth),
        getSkyLightAfterBlock(idx - 1)
    );

    if (currentLumens < 1) {currentLumens = 0;}

    if (skyLightGrid[idx] == currentLumens) {return;}

    lucIdx.push(idx);
    skyLightGrid[idx] = currentLumens;
    requestLightChunkUpdate(idx);
}

function requestLightChunkUpdate(idx) {

    let [chunkX, chunkY] = getXY(idx);

    chunkX = Math.floor(chunkX/chunkSize.width)*chunkSize.width;
    chunkY = Math.floor(chunkY/chunkSize.height)*chunkSize.height;

    const chunckIdx = chunkX + "," + chunkY;

    if (!requestedLightChunks.includes(chunckIdx)) {
        requestedLightChunks.push(chunckIdx);
    }
}