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

function updateViewspace() {
    const viewspaceGridWidth = Math.ceil(viewspaceWidth/(16*cam.zoom))+viewspacePadding;
    const viewspaceGridHeight = Math.ceil(viewspaceHeight/(16*cam.zoom))+viewspacePadding;

    const viewspaceGridX = Math.floor(cam.x/16) - Math.ceil(viewspaceGridWidth/2)
    const viewspaceGridY = Math.floor(cam.y/16) - Math.ceil(viewspaceGridHeight/2)

    let viewGrid = extractViewspace(tileGrid, viewspaceGridX, viewspaceGridY, viewspaceGridWidth, viewspaceGridHeight);
    let viewOffsetGrid = extractViewspace(offsetTileGrid, viewspaceGridX, viewspaceGridY, viewspaceGridWidth, viewspaceGridHeight);

    createTileMap(viewGrid, viewspaceGridWidth, viewspaceGridHeight, viewOffsetGrid, tilesheetSize, cam.x, cam.y, cam.zoom);
}

function extractViewspace(grid, viewX, viewY, viewWidth, viewHeight) {
    const viewspace = new Uint16Array(viewWidth * viewHeight);

    for (let y = 0; y < viewHeight; y++) {
        const sourceRowStart = getIDX(Math.max(viewX, 0), viewY + y);
        const viewRowStart = y * viewWidth + Math.max(viewX, 0) - viewX;
        viewspace.set(grid.subarray(sourceRowStart, sourceRowStart + viewWidth - (Math.max(viewX, 0) - viewX)), viewRowStart);
    }
    return viewspace;
    
}

function drawTileFrame() {

    const viewspaceGridWidth = (Math.ceil(viewspaceWidth/(16*tileCam.zoom))+viewspacePadding)*(16*tileCam.zoom);
    
    drawAdvImage(ctx, tileBitmap, new moveMatrix(viewspaceWidth/2 + (tileCam.x - cam.x)*tileCam.zoom, viewspaceHeight/2 + (cam.y - tileCam.y)*tileCam.zoom, viewspaceGridWidth, undefined));

    const tcamX = Math.floor(cam.x/16)*16;
    const tcamY = Math.floor(cam.y/16)*16;

    if ((Math.floor(tcamX/2) != Math.floor(tileCam.x/2)) || (Math.floor(tcamY/2) != Math.floor(tileCam.y/2))) {
        updateViewspace()
    }
}

function createTileMap(viewportTilesData, viewportTilesWidth, viewportTilesHeight, viewportTilesOffset, tileSize, camX, camY, camZoom) {

    const viewportTiles = {
        data: viewportTilesData,
        width: viewportTilesWidth,
        height: viewportTilesHeight
    }

    const camera = {
        x: Math.floor(camX / tileSize)*tileSize,
        y: Math.floor(camY / tileSize)*tileSize,
        zoom: camZoom
    }

    tileWorker.postMessage({
        viewportTiles: viewportTiles,
        viewportTilesOffset: viewportTilesOffset,
        tileSize: tileSize,
        cam: camera
    });
}

const tileWorker = new Worker("js/rendering/tileRenderer.js");

let tilesImg;
const tilesheetSize = 16;
const viewspacePadding = 10;

let tileBitmap = new Image();
let tileCam;

async function startGame() {

    await stitchImages("./images/tileSheets", "png", "Tiles_", 0, 4).then((img) => {
        tilesImg = img;
    }).catch(console.error);

    createImageBitmap(tilesImg).then((imageBitmap) => {
        tileWorker.postMessage({ tilesheet: imageBitmap, tileData: tileData }, [imageBitmap]);
    })

    resetPlayer();

    await sleep(10);

    updateViewspace();

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
    tileCam = e.data.cam;
    createImageBitmap(frame).then((bitmap) => {
        tileBitmap = bitmap;
    })
}

