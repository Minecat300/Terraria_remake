async function stitchImages(folderPath, wall) {
    const imagePaths = [];
    const imageSubPaths = [];

    for (let i in tileData) {
        const value = tileData[i]?.imageSheet ?? "none";
        const isWall = tileData[i]?.wall ?? false;
        if (value == "none") {continue;}
        if (isWall != wall) {continue;}
        for (let i2 = 0; i2 < value.length; i2++) {
            imagePaths.push(`${folderPath}/${value[i2]}`);
            imageSubPaths.push(i);
        }
    }

    console.log("Generated image paths: ", imagePaths);

    const imageSheetData = {};

    const images = await Promise.all(imagePaths.map(loadImage));

    const totalHeight = images.reduce((sum, img) => sum + img.height, 0);
    const maxWidth = Math.max(...images.map(img => img.width));

    const canvas = new OffscreenCanvas(maxWidth, totalHeight);
    const ctx = canvas.getContext("2d");

    let currentY = 0;
    let i = 0;
    for (const img of images) {
        ctx.drawImage(img, 0, currentY, img.width, img.height);
        if (!imageSheetData.hasOwnProperty(imageSubPaths[i])) {
            imageSheetData[imageSubPaths[i]] = currentY;
        }
        currentY += img.height;
        i++;
    }

    const blob = await canvas.convertToBlob();
    //download(blob, "tilesheet.png", "png");
    const img = await createImageBitmap(blob);

    console.log(imageSheetData);
    return {img: img, data: imageSheetData};
}

function turnImageRed(imageData) {
    if (!imageData || !imageData.data) {
        throw new Error('Invalid imageData provided to turnImageRed.');
    }

    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        data[i] = 255;
        data[i + 1] = 0;
        data[i + 2] = 0;
    }

    return imageData;
}

async function loadMultiblockPreview() {
    for (let key in tileData) {
        let value = tileData[key];
        let multiblockSize = value?.multiblockSize ?? "none";
        if (multiblockSize == "none") {continue;}
        multiblockPreviewImages[key] = await getMultiblockPreviewImage(key, value, multiblockSize);
    }
}

async function getMultiblockPreviewImage(key, value, multiblockSize) {
    const imageCollection = {};

    const canvasPadding = 2;
    const tileSpaceing = 2;

    const canvasWidth = tilesheetSize*multiblockSize.width + canvasPadding*2;
    const canvasHeight = tilesheetSize*multiblockSize.height + canvasPadding*2;

    const oc = new OffscreenCanvas(canvasWidth, canvasHeight);
    const octx = oc.getContext("2d");

    const tilesheetSubSet = tilesImg.data[value.id];
    const tileAssetSize = value?.tileAssetSize ?? {width: 16, height: 16};
    const tileAssetOffsetX = tileAssetSize?.offsetX ?? 0;
    const tileAssetOffsetY = tileAssetSize?.offsetY ?? 0;
    const startIDX = value?.startIDX ?? {x: 0, y: 0};

    for (let x = 0; x < multiblockSize.width; x++) {
        for (let y = 0; y < multiblockSize.height; y++) {
            octx.drawImage(
                tilesImg.img,
                (x + startIDX.x) * (tileAssetSize.width + tileSpaceing), (y + startIDX.y) * (tileAssetSize.height + tileSpaceing) + tilesheetSubSet,
                tileAssetSize.width, tileAssetSize.height,
                x * tilesheetSize + canvasPadding + tileAssetOffsetX, y * tilesheetSize + canvasPadding + tileAssetOffsetY,
                tileAssetSize.width, tileAssetSize.height
            );
        }
    }

    const imageData = octx.getImageData(0, 0, canvasWidth, canvasHeight);

    imageCollection.data = oc.transferToImageBitmap();

    const redImage = turnImageRed(imageData);

    octx.putImageData(redImage, 0, 0);
    imageCollection.red = oc.transferToImageBitmap();

    return imageCollection;
}

async function loadAnimatedTiles() {
    for (let key in tileData) {
        const value = tileData[key];
        if ((value?.blockAnimation ?? "none") != "none") {
            animatedTilesList.push(key);
        }
    }
}

async function loadPlayerAssets() {

    playerImages.beepsHelmet = await loadImage('images/player/armor/Armor_Head_54.png');
    playerImages.beepsBody = await loadImage('images/player/armor/Armor_34.png');
    playerImages.beepsLegs = await loadImage('images/player/armor/Armor_Legs_33.png');

    const oc = new OffscreenCanvas(1, 1);
    const octx = oc.getContext("2d", { willReadFrequently: true });

    if (!octx) {
        throw new Error('Failed to get OffscreenCanvas 2D context.');
    }

    playerImages.eye1 = await loadImage('images/player/Player_0_1.png');

    for (const [key, path] of Object.entries({
        head: 'images/player/Player_0_0.png',
        eye2: 'images/player/Player_0_2.png',
        body: 'images/player/Player_0_6.png',
        arms: 'images/player/Player_0_8.png',
        hands: 'images/player/Player_0_5.png',
        pants: 'images/player/Player_0_11.png',
        shoes: 'images/player/Player_0_12.png',
        hair: 'images/player/Player_Hair_1.png'
    })) {

        const img = await loadImage(path);

        oc.width = img.width;
        oc.height = img.height;

        octx.clearRect(0, 0, img.width, img.height);
        octx.drawImage(img, 0, 0);

        const imageData = octx.getImageData(0, 0, img.width, img.height);

        const redscaleData = grayscaleToRedscale(imageData);

        octx.putImageData(redscaleData, 0, 0);

        playerImages[key] = oc.transferToImageBitmap();
    }
    
}

function preloadPlayerColors(key, skinColor, eyeColor, hairColor, pantsColor, shoeColor, shirtColor, sweaterColor) {
    playerLoadedAssets[key].eye1 = playerImages.eye1;
    loadBodypartColor(key, "head", skinColor);
    loadBodypartColor(key, "hands", skinColor);
    loadBodypartColor(key, "eye2", eyeColor);
    loadBodypartColor(key, "hair", hairColor);
    loadBodypartColor(key, "pants", pantsColor);
    loadBodypartColor(key, "shoes", shoeColor);
    loadBodypartColor(key, "arms", shirtColor);
    loadBodypartColor(key, "body", sweaterColor);
}

function loadBodypartColor(key, part, color) {
    const img = playerImages[part];

    const oc = new OffscreenCanvas(img.width, img.height);
    const octx = oc.getContext("2d", { willReadFrequently: true });

    const h = color.h;
    const s = color.s;
    const l = color.l * 2;

    octx.filter = `hue-rotate(${h}deg) saturate(${s}%) brightness(${l}%)`;
    octx.drawImage(img, 0, 0);
    octx.filter = 'none';

    playerLoadedAssets[key][part] = oc.transferToImageBitmap();
}

function updateViewspace(worker, grid, offsetGrid, tileSize, force = false) {

    const viewspaceGridWidth = Math.ceil(viewspaceWidth/(tilesheetSize*cam.zoom*chunkSize.width))+2;
    const viewspaceGridHeight = Math.ceil(viewspaceHeight/(tilesheetSize*cam.zoom*chunkSize.height))+2;

    const viewspaceGridX = Math.floor(cam.x/tilesheetSize + chunkSize.width/2) - Math.ceil(viewspaceGridWidth*chunkSize.width/2);
    const viewspaceGridY = Math.floor(cam.y/tilesheetSize + chunkSize.height/2) - Math.ceil(viewspaceGridHeight*chunkSize.height/2);

    for(let x = 0; x < viewspaceGridWidth; x++) {
        let chunkX = x*chunkSize.width + viewspaceGridX;
        chunkX = Math.floor(chunkX/chunkSize.width)*chunkSize.width;
        for(let y = 0; y < viewspaceGridHeight; y++) {
            let chunkY = y*chunkSize.height + viewspaceGridY;
            chunkY = Math.floor(chunkY/chunkSize.height)*chunkSize.height;
            const key = chunkX + "," + chunkY;
            if (tileBitmap[key] === undefined || force) {
                requestChunk(worker, grid, offsetGrid, viewspaceGridX + x*chunkSize.width, viewspaceGridY + y*chunkSize.height, tileSize);
            }
        }
    }
}

function updateLightViewspace(worker, skyGrid, grid, settings, force = false) {

    const viewspaceGridWidth = Math.ceil(viewspaceWidth/(tilesheetSize*cam.zoom*chunkSize.width))+2;
    const viewspaceGridHeight = Math.ceil(viewspaceHeight/(tilesheetSize*cam.zoom*chunkSize.height))+2;

    const viewspaceGridX = Math.floor(cam.x/tilesheetSize + chunkSize.width/2) - Math.ceil(viewspaceGridWidth*chunkSize.width/2);
    const viewspaceGridY = Math.floor(cam.y/tilesheetSize + chunkSize.height/2) - Math.ceil(viewspaceGridHeight*chunkSize.height/2);

    for(let x = 0; x < viewspaceGridWidth; x++) {
        let chunkX = x*chunkSize.width + viewspaceGridX;
        chunkX = Math.floor(chunkX/chunkSize.width)*chunkSize.width;
        for(let y = 0; y < viewspaceGridHeight; y++) {
            let chunkY = y*chunkSize.height + viewspaceGridY;
            chunkY = Math.floor(chunkY/chunkSize.height)*chunkSize.height;
            const key = chunkX + "," + chunkY;
            if (tileBitmap[key] === undefined || force) {
                requestLightChunk(worker, skyGrid, grid, viewspaceGridX + x*chunkSize.width, viewspaceGridY + y*chunkSize.height, settings);
            }
        }
    }
}

function requestLightChunk(worker, skyGrid, grid, x, y, settings) {
    
    const chunkX = Math.floor(x/chunkSize.width)*chunkSize.width;
    const chunkY = Math.floor(y/chunkSize.height)*chunkSize.height;

    let skyChunkGrid = extractViewspace(skyGrid, chunkX-1, chunkY-1, chunkSize.width+2, chunkSize.height+2);
    let chunkGrid = extractViewspace(grid, chunkX-1, chunkY-1, chunkSize.width+2, chunkSize.height+2);

    if (chunkGrid === undefined) {
        return;
    }

    createLightMap(worker, skyChunkGrid, chunkGrid, chunkSize.width, chunkSize.height, settings, { x: chunkX, y: chunkY, time: new Date().getTime() });
}

function requestChunk(worker, grid, offsetGrid, x, y, tileSize) {

    const chunkX = Math.floor(x/chunkSize.width)*chunkSize.width;
    const chunkY = Math.floor(y/chunkSize.height)*chunkSize.height;

    let [chunkGrid, includedAnimatedTiles] = extractViewspace(grid, chunkX, chunkY, chunkSize.width, chunkSize.height, true);
    let chunkOffsetGrid = extractViewspace(offsetGrid, chunkX, chunkY, chunkSize.width, chunkSize.height);

    if (chunkGrid === undefined) {
        return;
    }

    createTileMap(worker, chunkGrid, chunkSize.width, chunkSize.height, chunkOffsetGrid, tileSize, { x: chunkX, y: chunkY, includedAnimatedTiles: includedAnimatedTiles });
}

function extractViewspace(grid, viewX, viewY, viewWidth, viewHeight, animationCheck = false) {
    const viewspace = new Uint16Array(viewWidth * viewHeight);

    if (viewX+viewWidth < 0) {
        return undefined;
    }

    for (let y = 0; y < viewHeight; y++) {
        const sourceRowStart = getIDX(Math.max(viewX, 0), viewY + y);
        const viewRowStart = y * viewWidth + Math.max(viewX, 0) - viewX;
        viewspace.set(grid.subarray(sourceRowStart, sourceRowStart + viewWidth - (Math.max(viewX, 0) - viewX)), viewRowStart);
    }

    if (!animationCheck) {return viewspace;}

    const byteSet = new Set(viewspace);
    const includedAnimatedTiles = animatedTilesList.filter(val => byteSet.has(Number(val)));

    return [viewspace, includedAnimatedTiles];
    
}

function getLight(idx, settings) {
    return  Math.floor(Math.max(skyLightGrid[idx] * settings.dayNight, lightGrid[idx]));
}

function drawSingleLayer(viewspaceGridWidth, viewspaceGridHeight, viewspaceGridX, viewspaceGridY, bitmap, padding, tileSize, forground = false, light = false) {

    const layerCanvas = new OffscreenCanvas(viewspaceGridWidth*chunkSize.width*8, viewspaceGridHeight*chunkSize.height*8);
    const layerCtx = layerCanvas.getContext("2d");
    layerCtx.imageSmoothingEnabled = false;

    for (let x = 0; x < viewspaceGridWidth; x++) {
        let chunkX = x*chunkSize.width + viewspaceGridX;
        chunkX = Math.floor(chunkX/chunkSize.width)*chunkSize.width;

        for (let y = viewspaceGridHeight-1; y >= 0; y--) {
            let chunkY = y*chunkSize.height + viewspaceGridY;
            chunkY = Math.floor(chunkY/chunkSize.height)*chunkSize.height;

            const key = chunkX + "," + chunkY;
            if (bitmap[key] == undefined) {continue;}

            usedKeys.add(key);
            const value = bitmap[key];
            if (value.image == undefined) {continue;}

            const drawX = x*chunkSize.width*8 - padding;
            const drawY = (viewspaceGridHeight-y-1)*chunkSize.height*8 - padding;

            if (light) {
                layerCtx.drawImage(value.image, drawX, drawY, chunkSize.width*8 + padding*2, chunkSize.height*8 + padding*2);
            } else {
                layerCtx.drawImage(
                    value.image,
                    0, 0,
                    value.image.width, chunkSize.height*tileSize + padding*4,
                    drawX, drawY,
                    chunkSize.width*8 + padding*2, chunkSize.height*8 + padding*2
                );
                const animationHeight = value.data?.animationHeight ?? "none";
                if (animationHeight != "none" && animationHeight > 1 && Math.floor(animationTick / 6) % animationHeight != 0) {
                    layerCtx.drawImage(
                        value.image,
                        0, (Math.floor(animationTick / 6) % animationHeight) * (chunkSize.height*tileSize + padding*4),
                        value.image.width, chunkSize.height*tileSize + padding*4,
                        drawX, drawY,
                        chunkSize.width*8 + padding*2, chunkSize.height*8 + padding*2
                    );
                }
            }

            if (forground && chunkUpdates) {
                if (requestedLightChunks.includes(key)) {
                    layerCtx.fillStyle = "rgba(0, 255, 0, 0.3)";
                    layerCtx.fillRect(drawX, drawY, chunkSize.width*8 + padding*2, chunkSize.height*8 + padding*2);
                }
                if (requestedChunks.includes(key)) {
                    layerCtx.fillStyle = "rgba(0, 0, 255, 0.3)";
                    layerCtx.fillRect(drawX, drawY, chunkSize.width*8 + padding*2, chunkSize.height*8 + padding*2);
                }
                layerCtx.font = "20px Andy-Bold";
                layerCtx.fillStyle = "white";
                layerCtx.textBaseline = "middle"
                layerCtx.textAlign = "center";
                layerCtx.fillText(key, drawX + chunkSize.width*4, drawY + chunkSize.height*4);
            }
            if (forground && chunkBoarders) {

                layerCtx.strokeStyle = "red";
                layerCtx.strokeRect(drawX, drawY, chunkSize.width*8 + padding*2, chunkSize.height*8 + padding*2);
            }
        }
    }

    /*layerCanvas.convertToBlob().then((blob) => {
        download(blob, "layer.png", "png");
    });*/
    
    const img = layerCanvas;

    const chunkX = Math.floor(viewspaceGridX/chunkSize.width)*chunkSize.width;
    const chunkY = Math.floor(viewspaceGridY/chunkSize.height)*chunkSize.height;

    const drawX = (chunkX*tilesheetSize - cam.x + img.width) * cam.zoom + viewspaceWidth/2;
    const drawY = (chunkY*tilesheetSize - cam.y + img.height) * cam.zoom + viewspaceHeight/2;

    drawAdvImage(ctx, img, new moveMatrix(drawX, viewspaceHeight - drawY, img.width*cam.zoom*2, undefined));
}

function drawTileFrame() {

    const viewspaceGridWidth = Math.ceil(viewspaceWidth/(tilesheetSize*cam.zoom*chunkSize.width))+2;
    const viewspaceGridHeight = Math.ceil(viewspaceHeight/(tilesheetSize*cam.zoom*chunkSize.height))+2;

    const viewspaceGridX = Math.floor(cam.x/tilesheetSize + chunkSize.width/2) - Math.ceil(viewspaceGridWidth*chunkSize.width/2);
    const viewspaceGridY = Math.floor(cam.y/tilesheetSize + chunkSize.height/2) - Math.ceil(viewspaceGridHeight*chunkSize.height/2);

    usedKeys = new Set();

    drawSingleLayer(viewspaceGridWidth, viewspaceGridHeight, viewspaceGridX, viewspaceGridY, wallBitmap, 4, tilesheetSize);
    drawSingleLayer(viewspaceGridWidth, viewspaceGridHeight, viewspaceGridX, viewspaceGridY, tileBitmap, 2, tilesheetSize, xray);
    if (!xray) {
        drawSingleLayer(viewspaceGridWidth, viewspaceGridHeight, viewspaceGridX, viewspaceGridY, lightBitmap, 0, 1, true, true);
    }

    for (const key in tileBitmap) {
        if (!usedKeys.has(key)) {
            delete tileBitmap[key];
            delete wallBitmap[key];
        }
    }

    if (Math.floor(cam.x/tilesheetSize/chunkSize.width*2) != prevCam.x || Math.floor(cam.y/tilesheetSize/chunkSize.height*2) != prevCam.y || cam.zoom != prevCam.zoom) {
        prevCam.x = Math.floor(cam.x/tilesheetSize/chunkSize.width*2);
        prevCam.y = Math.floor(cam.y/tilesheetSize/chunkSize.height*2);
        prevCam.zoom = cam.zoom;
        updateFullView();
    }

    if (smoothing != oldSmoothing || dayNight != oldDayNight) {
        oldSmoothing = smoothing;
        oldDayNight = dayNight;
        updateLightViewspace(lightWorker, skyLightGrid, lightGrid, {dayNight: dayNight, smoothing: smoothing}, true);
    }
    
    let i = 0;

    while (i < requestedChunks.length) {
        const value = requestedChunks[i];
        if (usedKeys.has(value)) {
            let [x, y] = value.split(",");
            updateChunk(x, y);
            requestedChunks.splice(i, 1);
        } else {
            i++;
        }
    }

    i = 0;

    while (i < requestedLightChunks.length) {
        const value = requestedLightChunks[i];
        if (usedKeys.has(value)) {
            const [x, y] = value.split(",");
            requestLightChunk(lightWorker, skyLightGrid, lightGrid, x, y, { dayNight: dayNight, smoothing: smoothing });
            requestedLightChunks.splice(i, 1);
        } else {
            i++;
        }
    }

    animationTick++;

    if (chunkUpdates && keyPress.p) {
        keyPress.p = false;
        const chunkX = Math.floor(getGridPos(player.pos.x)/chunkSize.width)*chunkSize.width;
        const chunkY = Math.floor(getGridPos(player.pos.y)/chunkSize.height)*chunkSize.height;

        const key = chunkX + "," + chunkY;
        if (tileBitmap[key] == undefined) {return;}

        const value = tileBitmap[key];
        if (value.image == undefined) {return;}

        downloadImagebitmap(value.image, "chunk picture.png");
    }

}

function drawBuildOverlay() {
    if (!buildGuide.active) {return;}
    const move = new moveMatrix(((buildGuide.x + 0.5)*16 - cam.x)*cam.zoom + viewspaceWidth/2, viewspaceHeight/2 - ((buildGuide.y + 0.5)*16 - cam.y)*cam.zoom, undefined, undefined);
    const item = selectedSlot.item();
    const tile = itemData[item.id]?.blockPlaced ?? 0;

    if (smartCursor) {
        move.setSize(inventoryGuiImages.selection.width*cam.zoom/2, undefined);
        drawAdvImage(ctx, inventoryGuiImages.selection, move);
    } else {
        move.setSize(inventoryGuiImages.radial.width*cam.zoom, undefined);
        ctx.filter = 'opacity(50%)';
        drawAdvImage(ctx, inventoryGuiImages.radial, move);
        ctx.filter = 'none'; 
    }
    if ((tileData[tile]?.multiblockSize ?? "none") != "none") {
        const imageCollection = multiblockPreviewImages[tile];
        move.setSize(imageCollection.data.width*cam.zoom, undefined);
        move.addPosition((imageCollection.data.width-20)/2*cam.zoom, (20-imageCollection.data.height)/2*cam.zoom);
        ctx.filter = 'opacity(70%)';
        drawAdvImage(ctx, imageCollection.data, move);
        if (!buildGuide.valid) {
            ctx.filter = 'opacity(35%)';
            drawAdvImage(ctx, imageCollection.red, move);
        }
        ctx.filter = 'none'; 
    }
}

function updateChunk(x, y) {
    requestChunk(wallWorker, wallGrid, offsetWallGrid, x, y, { tilesheetSize: tilesheetSize, tilePadding: 8, tileTrueSize: 32, tileSpaceing: 4 });
    requestChunk(tileWorker, tileGrid, offsetTileGrid, x, y, { tilesheetSize: tilesheetSize, tilePadding: 4, tileTrueSize: tilesheetSize, tileSpaceing: 2 });
}

function updateFullView() {
    updateViewspace(wallWorker, wallGrid, offsetWallGrid, { tilesheetSize: tilesheetSize, tilePadding: 8, tileTrueSize: 32, tileSpaceing: 4 });
    updateViewspace(tileWorker, tileGrid, offsetTileGrid, { tilesheetSize: tilesheetSize, tilePadding: 4, tileTrueSize: tilesheetSize, tileSpaceing: 2 });
    updateLightViewspace(lightWorker, skyLightGrid, lightGrid, {dayNight: dayNight, smoothing: smoothing});
}

function createTileMap(worker, viewportTilesData, viewportTilesWidth, viewportTilesHeight, viewportTilesOffset, tileSize, data) {

    const viewportTiles = {
        data: viewportTilesData,
        width: viewportTilesWidth,
        height: viewportTilesHeight
    }

    worker.postMessage({
        viewportTiles: viewportTiles,
        viewportTilesOffset: viewportTilesOffset,
        tileSizeObj: tileSize,
        data: data
    });
}

function createLightMap(worker, skyGrid, grid, gridWidth, gridHeight, settings, data) {
    
    const viewportTiles = {
        data: grid,
        skyData: skyGrid,
        width: gridWidth,
        height: gridHeight
    }
    
    worker.postMessage({
        viewportTiles: viewportTiles,
        settings: settings,
        data: data
    });
}

const tileWorker = new Worker("js/rendering/tileRenderer.js");
const wallWorker = new Worker("js/rendering/tileRenderer.js");
const lightWorker = new Worker("js/rendering/lightRenderer.js");

let beeps = false;

let tilesImg;
let wallsImg;
const tilesheetSize = 16;

let usedKeys;

let playerImages = {};
let playerLoadedAssets = {};

let unknownImage;

const chunkSize = {
    width: 32,
    height: 18,
}

let chunkBoarders = false;
let chunkUpdates = false;
let xray = false;

let multiblockPreviewImages = {};

let animatedTilesList = [];
let animationTick = 0;

let dayNight = 1;
let smoothing = 2;

let oldDayNight = dayNight;
let oldSmoothing = smoothing;

let requestedChunks = [];
let requestedLightChunks = [];

let tileBitmap = {};
let wallBitmap = {};
let lightBitmap = {};
let prevCam = {
    x: 0,
    y: 0,
    zoom: 0
};

async function startGame() {

    await stitchImages("./images/tileSheets", false).then((img) => {
        tilesImg = img;
    }).catch(console.error);

    await stitchImages("./images/wallSheets", true).then((img) => {
        wallsImg = img;
    }).catch(console.error);

    await loadMultiblockPreview();
    await loadAnimatedTiles();

    await loadEntityAssets();

    await loadPlayerAssets();

    playerLoadedAssets["default"] = {};
    preloadPlayerColors("default",
        {h: 45, s: 45, l: 140},
        {h: 240, s: 100, l: 50},
        {h: 40, s: 50, l: 85},
        {h: 55, s: 60, l: 120},
        {h: 65, s: 30, l: 70},
        {h: 78, s: 40, l: 145},
        {h: 78, s: 40, l: 145}
    );

    unknownImage = await loadImage("images/unknown.png");

    await loadItemImages();
    loadSmartCursor();

    createImageBitmap(tilesImg.img).then((imageBitmap) => {
        tileWorker.postMessage({ tilesheet: imageBitmap, tileData: tileData, tilesheetData: tilesImg.data }, [imageBitmap]);
    });

    createImageBitmap(wallsImg.img).then((imageBitmap) => {
        wallWorker.postMessage({ tilesheet: imageBitmap, tileData: tileData, tilesheetData: wallsImg.data }, [imageBitmap]);
    });

    resetPlayer();

    await sleep(10);

    gameLoop();
}

function renderMain() {
    updateAsp(lockAsp);
    ctx.clearRect(0, 0, c.width, c.height);
    drawSkyBackground();
    ctx.imageSmoothingEnabled = false;
    drawTileFrame();
    drawPlayer();
    drawEntities();
    drawBuildOverlay();
    drawInventory();
    drawDebugOverlay();
    drawAsp();
}

function drawDebugOverlay() {
    drawOnlyText("FPS: " + FPS, viewspaceWidth - 5, viewspaceHeight - 40, 30, "right", "white", "black")
    drawOnlyText("UPS: " + UPS, viewspaceWidth - 5, viewspaceHeight - 5, 30, "right", "white", "black")
}

tileWorker.onmessage = (e) => {
    const frame = e.data.frame;
    tileCam = e.data.data;
    const data = e.data.data;
    const key = data.x + "," + data.y;

    tileBitmap[key] = {};
    tileBitmap[key].image = frame;
    tileBitmap[key].data = data;
}

wallWorker.onmessage = (e) => {
    const frame = e.data.frame;
    const data = e.data.data;
    const key = data.x + "," + data.y;

    wallBitmap[key] = {};
    wallBitmap[key].image = frame;
    wallBitmap[key].data = data;
}

lightWorker.onmessage = (e) => {
    const frame = e.data.frame;
    const data = e.data.data;
    const key = data.x + "," + data.y;
    if (lightBitmap[key] == undefined || lightBitmap[key].data.time <= data.time) {
        lightBitmap[key] = {};
        lightBitmap[key].image = frame;
        lightBitmap[key].data = data;
    }
}