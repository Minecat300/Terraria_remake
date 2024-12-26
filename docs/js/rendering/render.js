async function stitchImages(folderPath, fileExtention, fileName, start, end) {
    const imagePaths = [];

    for (let i = start; i <= end; i++) {
        imagePaths.push(`${folderPath}/${fileName}${i}.${fileExtention}`);
    }

    console.log("Generated image paths: ", imagePaths)

    const images = await Promise.all(imagePaths.map(loadImage))

    const totalHeight = images.reduce((sum, img) => sum + img.height, 0);
    const maxWidth = Math.max(...images.map(img => img.width));

    const canvas = new OffscreenCanvas(maxWidth, totalHeight);
    const ctx = canvas.getContext("2d");

    let currentY = 0;
    for (const img of images) {
        ctx.drawImage(img, 0, currentY, img.width, img.height);
        currentY += img.height;
    }

    const blob = await canvas.convertToBlob();
    //download(blob, "tilesheet.png", "png")
    const img = await createImageBitmap(blob)
    return img;
}

function grayscaleToRedscale(imageData) {
    if (!imageData || !imageData.data) {
        throw new Error('Invalid imageData provided to grayscaleToRedscale.');
    }
    
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const gray = data[i];
        data[i] = gray;       
        data[i + 1] = 0;      
        data[i + 2] = 0;      
    }

    return imageData;
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

function updateViewspace(worker, grid, offsetGrid, tileSize) {

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
            if (tileBitmap[key] === undefined) {
                requestChuck(worker, grid, offsetGrid, viewspaceGridX + x*chunkSize.width, viewspaceGridY + y*chunkSize.height, tileSize);
            }
        }
    }
}

function requestChuck(worker, grid, offsetGrid, x, y, tileSize) {

    const chunkX = Math.floor(x/chunkSize.width)*chunkSize.width;
    const chunkY = Math.floor(y/chunkSize.height)*chunkSize.height;

    let chunkGrid = extractViewspace(grid, chunkX, chunkY, chunkSize.width, chunkSize.height);
    let chunkOffsetGrid = extractViewspace(offsetGrid, chunkX, chunkY, chunkSize.width, chunkSize.height);

    if (chunkGrid === undefined) {
        return;
    }

    createTileMap(worker, chunkGrid, chunkSize.width, chunkSize.height, chunkOffsetGrid, tileSize, { x: chunkX, y: chunkY })
}

function extractViewspace(grid, viewX, viewY, viewWidth, viewHeight) {
    const viewspace = new Uint16Array(viewWidth * viewHeight);

    if (viewX+viewWidth < 0) {
        return undefined;
    }

    for (let y = 0; y < viewHeight; y++) {
        const sourceRowStart = getIDX(Math.max(viewX, 0), viewY + y);
        const viewRowStart = y * viewWidth + Math.max(viewX, 0) - viewX;
        viewspace.set(grid.subarray(sourceRowStart, sourceRowStart + viewWidth - (Math.max(viewX, 0) - viewX)), viewRowStart);
    }
    return viewspace;
    
}

function drawSingleLayer(viewspaceGridWidth, viewspaceGridHeight, viewspaceGridX, viewspaceGridY, bitmap) {

    for (let x = 0; x < viewspaceGridWidth; x++) {
        let chunkX = x*chunkSize.width + viewspaceGridX;
        chunkX = Math.floor(chunkX/chunkSize.width)*chunkSize.width;
        for (let y = 0; y < viewspaceGridHeight; y++) {
            let chunkY = y*chunkSize.height + viewspaceGridY;
            chunkY = Math.floor(chunkY/chunkSize.height)*chunkSize.height;
            const key = chunkX + "," + chunkY;
            if (bitmap[key] != undefined) {
                const value = bitmap[key];
                if (value.image != undefined) {
                    const drawX = (chunkX*tilesheetSize - cam.x) * cam.zoom + viewspaceWidth/2 + chunkSize.width*tilesheetSize*cam.zoom/2;
                    const drawY = (chunkY*tilesheetSize - cam.y) * cam.zoom + viewspaceHeight/2 + chunkSize.height*tilesheetSize*cam.zoom/2;
                    drawAdvImage(ctx, value.image, new moveMatrix(drawX, viewspaceHeight-drawY, value.image.width*cam.zoom, undefined));
                }
                usedKeys.add(key);
            }
        }
    }
}

function drawTileFrame() {

    const viewspaceGridWidth = Math.ceil(viewspaceWidth/(tilesheetSize*cam.zoom*chunkSize.width))+2;
    const viewspaceGridHeight = Math.ceil(viewspaceHeight/(tilesheetSize*cam.zoom*chunkSize.height))+2;

    const viewspaceGridX = Math.floor(cam.x/tilesheetSize + chunkSize.width/2) - Math.ceil(viewspaceGridWidth*chunkSize.width/2);
    const viewspaceGridY = Math.floor(cam.y/tilesheetSize + chunkSize.height/2) - Math.ceil(viewspaceGridHeight*chunkSize.height/2);

    usedKeys = new Set();

    drawSingleLayer(viewspaceGridWidth, viewspaceGridHeight, viewspaceGridX, viewspaceGridY, wallBitmap);
    drawSingleLayer(viewspaceGridWidth, viewspaceGridHeight, viewspaceGridX, viewspaceGridY, tileBitmap);

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
    
    let i = 0;

    for (const key in requestedChuncks) {
        const value = requestedChuncks[key];
        if (usedKeys.has(value)) {
            let [x, y] = value.split(",");
            updateChuck(x, y);
            requestedChuncks.splice(i, 1);
            i--
        }
        i++
    }
}

function updateChuck(x, y) {
    requestChuck(wallWorker, wallGrid, offsetWallGrid, x, y, { tilesheetSize: tilesheetSize, tilePadding: 8, tileTrueSize: 32, tileSpaceing: 4 });
    requestChuck(tileWorker, tileGrid, offsetTileGrid, x, y, { tilesheetSize: tilesheetSize, tilePadding: 0, tileTrueSize: tilesheetSize, tileSpaceing: 2 });
}

function updateFullView() {
    updateViewspace(wallWorker, wallGrid, offsetWallGrid, { tilesheetSize: tilesheetSize, tilePadding: 8, tileTrueSize: 32, tileSpaceing: 4 });
    updateViewspace(tileWorker, tileGrid, offsetTileGrid, { tilesheetSize: tilesheetSize, tilePadding: 0, tileTrueSize: tilesheetSize, tileSpaceing: 2 });
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

const tileWorker = new Worker("js/rendering/tileRenderer.js");
const wallWorker = new Worker("js/rendering/tileRenderer.js");

let beeps = false;

let tilesImg;
let wallsImg;
const tilesheetSize = 16;

let usedKeys;

let playerImages = {};
let playerLoadedAssets = {};

const chunkSize = {
    width: 32,
    height: 18,
}

let requestedChuncks = [];

let tileBitmap = {};
let wallBitmap = {};
let prevCam = {
    x: 0,
    y: 0,
    zoom: 0
};

async function startGame() {

    await stitchImages("./images/tileSheets", "png", "Tiles_", 0, 4).then((img) => {
        tilesImg = img;
    }).catch(console.error);

    await stitchImages("./images/wallSheets", "png", "Wall_", 1, 2).then((img) => {
        wallsImg = img;
    }).catch(console.error);

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

    createImageBitmap(tilesImg).then((imageBitmap) => {
        tileWorker.postMessage({ tilesheet: imageBitmap, tileData: tileData }, [imageBitmap]);
    });

    createImageBitmap(wallsImg).then((imageBitmap) => {
        wallWorker.postMessage({ tilesheet: imageBitmap, tileData: tileData }, [imageBitmap]);
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
    drawAsp();
}

tileWorker.onmessage = (e) => {
    const frame = e.data.frame;
    tileCam = e.data.data;
    const data = e.data.data;
    const key = data.x + "," + data.y;
    createImageBitmap(frame).then((bitmap) => {
        tileBitmap[key] = {};
        tileBitmap[key].image = bitmap;
        tileBitmap[key].data = data;
    });
}

wallWorker.onmessage = (e) => {
    const frame = e.data.frame;
    const data = e.data.data;
    const key = data.x + "," + data.y;
    createImageBitmap(frame).then((bitmap) => {
        wallBitmap[key] = {};
        wallBitmap[key].image = bitmap;
        wallBitmap[key].data = data;
    });
}

