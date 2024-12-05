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

let tileData;

function getJson() {
    fetch('./js/json/tileData.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            tileData = data;
            startGame()
        })
        .catch(error => {
            console.error('Error loading JSON:', error);
        });
}

function packSignedXY(x, y) {
    if (x < -128 || x > 127 || y < -128 || y > 127) {
      throw new Error("x and y must be in the range -128 to 127.");
    }
  
    const xOffset = x + 128;
    const yOffset = y + 128; 
  
    return (yOffset << 8) | xOffset;
}

function randomNumber(min, max) {
    return Math.round(Math.random()*(max-min))+min
}

async function startGame() {
    console.log(tileData)

    createImageBitmap(tilesImg).then((imageBitmap) => {
        tileWorker.postMessage({ tilesheet: imageBitmap, tileData: tileData }, [imageBitmap]);
    })

    await sleep(10)

    const tileGridWidth = 64;
    const tileGridHeight = 36;
    const tileGridSize = tileGridWidth*tileGridHeight;

    let tileGrid = new Uint16Array(tileGridSize);
    let offsetGrid = new Uint16Array(tileGridSize);

    for (i = 0; i < tileGridSize; i++) {
        tileGrid[i] = randomNumber(1, 3)
        offsetGrid[i] = packSignedXY(randomNumber(0, 5), randomNumber(0, 4))
    }

    updateViewspace(tileGrid, tileGridWidth, tileGridHeight, offsetGrid, tilesheetSize);

    gameLoop();
}

function tmpUpdate() {
    const tileGridWidth = 64;
    const tileGridHeight = 36;
    const tileGridSize = tileGridWidth*tileGridHeight;

    let tileGrid = new Uint16Array(tileGridSize);
    let offsetGrid = new Uint16Array(tileGridSize);

    for (i = 0; i < tileGridSize; i++) {
        tileGrid[i] = randomNumber(1, 3)
        offsetGrid[i] = packSignedXY(randomNumber(0, 5), randomNumber(0, 4))
    }

    updateViewspace(tileGrid, tileGridWidth, tileGridHeight, offsetGrid, tilesheetSize);
}

const tileWorker = new Worker("js/tileRenderer.js");

let tilesImg;
const tilesheetSize = 16;

stitchImages("./images/tileSheets", "png", "Tiles_", 0, 2).then((img) => {
    tilesImg = img
    getJson()
}).catch(console.error);

let tileBitmap = new Image();

function renderMain() {
    updateAsp(lockAsp);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.imageSmoothingEnabled = false;
    drawAdvImage(ctx, tileBitmap, new moveMatrix(viewspaceWidth/2, viewspaceHeight/2, viewspaceWidth, undefined))
    drawAsp();
}

function updateViewspace(viewportTilesData, viewportTilesWidth, viewportTilesHeight, viewportTilesOffset, tileSize) {

    const viewportTiles = {
        data: viewportTilesData,
        width: viewportTilesWidth,
        height: viewportTilesHeight
    }

    tileWorker.postMessage({
        viewportTiles: viewportTiles,
        viewportTilesOffset: viewportTilesOffset,
        tileSize: tileSize
    });
}

tileWorker.onmessage = (e) => {
    const frame = e.data.frame
    createImageBitmap(frame).then((bitmap) => {
        tileBitmap = bitmap;
    })
}