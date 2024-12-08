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

function loadImage(path) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = path;
        img.onload = () => resolve(createImageBitmap(img));
        img.onerror = reject;
    });
}

function updateViewspace(worker, grid, offsetGrid, tileSize) {

    const viewspaceGridWidth = Math.ceil(viewspaceWidth/(tilesheetSize*cam.zoom*chunkSize.width))+2;
    const viewspaceGridHeight = Math.ceil(viewspaceHeight/(tilesheetSize*cam.zoom*chunkSize.height))+2;

    const viewspaceGridX = Math.floor(cam.x/tilesheetSize) - Math.ceil(viewspaceGridWidth*chunkSize.width/2);
    const viewspaceGridY = Math.floor(cam.y/tilesheetSize) - Math.ceil(viewspaceGridHeight*chunkSize.height/2);

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
                    const drawX = (chunkX*tilesheetSize - cam.x) * cam.zoom + viewspaceWidth/2 + chunkSize.width*tilesheetSize*cam.zoom;
                    const drawY = (chunkY*tilesheetSize - cam.y) * cam.zoom + viewspaceHeight/2 + chunkSize.height*tilesheetSize*cam.zoom;
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

    const viewspaceGridX = Math.floor(cam.x/tilesheetSize) - Math.ceil(viewspaceGridWidth*chunkSize.width/2);
    const viewspaceGridY = Math.floor(cam.y/tilesheetSize) - Math.ceil(viewspaceGridHeight*chunkSize.height/2);

    usedKeys = new Set();

    drawSingleLayer(viewspaceGridWidth, viewspaceGridHeight, viewspaceGridX, viewspaceGridY, wallBitmap);
    drawSingleLayer(viewspaceGridWidth, viewspaceGridHeight, viewspaceGridX, viewspaceGridY, tileBitmap);

    for (const key in tileBitmap) {
        if (!usedKeys.has(key)) {
            delete tileBitmap[key];
            delete wallBitmap[key];
        }
    }

    if (Math.floor(cam.x/tilesheetSize/chunkSize.width) != prevCam.x || Math.floor(cam.y/tilesheetSize/chunkSize.height) != prevCam.y || cam.zoom != prevCam.zoom) {
        prevCam.x = Math.floor(cam.x/tilesheetSize/chunkSize.width);
        prevCam.y = Math.floor(cam.y/tilesheetSize/chunkSize.height);
        prevCam.zoom = cam.zoom;
        updateViewspace(wallWorker, wallGrid, offsetWallGrid, { tilesheetSize: tilesheetSize, tilePadding: 8, tileTrueSize: 32, tileSpaceing: 4 });
        updateViewspace(tileWorker, tileGrid, offsetTileGrid, { tilesheetSize: tilesheetSize, tilePadding: 0, tileTrueSize: tilesheetSize, tileSpaceing: 2 });
    }
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

let tilesImg;
let wallsImg;
const tilesheetSize = 16;

let usedKeys;

const chunkSize = {
    width: 32,
    height: 18,
}

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
    ctx.fillStyle = "#5a73f7";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingEnabled = false;
    drawTileFrame();
    drawAsp();
}

tileWorker.onmessage = (e) => {
    const frame = e.data.frame;
    tileCam = e.data.data;
    const data = e.data.data;
    const key = data.x + "," + data.y;
    tileBitmap[key] = {};
    createImageBitmap(frame).then((bitmap) => {
        tileBitmap[key] = {};
        tileBitmap[key].image = bitmap;
    })
    tileBitmap[key].data = data;
}

wallWorker.onmessage = (e) => {
    const frame = e.data.frame;
    const data = e.data.data;
    const key = data.x + "," + data.y;
    wallBitmap[key] = {};
    createImageBitmap(frame).then((bitmap) => {
        wallBitmap[key] = {};
        wallBitmap[key].image = bitmap;
    })
    wallBitmap[key].data = data;
}

