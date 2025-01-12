let delta = 1;
let backgroundImages = [];
let menu = 0;
let guiImgs = [];
let guiSound = [];
const m = {
    m1: false,
    m2: false,
    m3: false,
    m4: false
};
let mainMenu = true;

async function startMainMenu() {
    await loadBackgroundImages();
    await loadGuiImages();

    await loadGuiAudio();

    await startMusic();

    let pCamX = 0;
    let d = new Date();
    let pTime = d.getTime() * 0.06;
    let cTime = 0;
    while (mainMenu) {
        d = new Date();
        cTime = d.getTime() * 0.06;
        time = d.getTime();
        delta = cTime - pTime;
        pTime = cTime;
        updateAsp(lockAsp);
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.imageSmoothingEnabled = false;
        drawBackgroundParalax(pCamX);
        drawLogo();
        drawText();
        drawAsp();
        pCamX -= 3*delta;
        await sleep(1);
    }
}

function drawText() {
    if (!mouseDown) {
        m.m1 = true;
    }
    if (!m.m4) {
        m.m3 = true;
    }
    m.m4 = false;

    switch (menu) {
        case 0:
            drawMainMenuText();
            break;
        case 1:
            drawLoadingBar();
            break;
    }
}

function drawMainMenuText() {
    if (textButton("Single Player", viewspaceWidth/2, viewspaceHeight/2, 40, "center", "white", "black", "yellow", guiSound.open)) {
        menu = 1;
        setupWorld();
    }   
    if (textButton("Exit", viewspaceWidth/2, viewspaceHeight/2 + 70, 40, "center", "white", "black", "yellow")) {
        window.close();
    }   
}

function drawLogo() {
    drawAdvImage(ctx, guiImgs.logo, new moveMatrix(viewspaceWidth/2, viewspaceHeight/6, viewspaceWidth/2.5+90*(sin(time/40)), undefined), new rotationMatrix(10*sin(time/50), 0.5, 0.5));
}

function drawLoadingBar() {
    drawRect((viewspaceWidth-viewspaceWidth*guiImgs.OuterCorrupt.width/1100)/2, viewspaceHeight/2+8, viewspaceWidth*guiImgs.OuterCorrupt.width/1100, viewspaceWidth*guiImgs.OuterCorrupt.width/35000, 0, "", "#434343");
    drawRect((viewspaceWidth-viewspaceWidth*guiImgs.OuterCorrupt.width/1100)/2, viewspaceHeight/2+8, viewspaceWidth*guiImgs.OuterCorrupt.width/1100*genData.currentMain/genData.maxMain, viewspaceWidth*guiImgs.OuterCorrupt.width/35000, 0, "", "lime");
    drawRect((viewspaceWidth-viewspaceWidth*guiImgs.OuterLower.width/1050)/2, viewspaceHeight/2+40, viewspaceWidth*guiImgs.OuterLower.width/1050, viewspaceWidth*guiImgs.OuterLower.width/50000, 0, "", "#434343");
    drawRect((viewspaceWidth-viewspaceWidth*guiImgs.OuterLower.width/1050)/2, viewspaceHeight/2+40, viewspaceWidth*guiImgs.OuterLower.width/1050*genData.currentSec/genData.maxSec, viewspaceWidth*guiImgs.OuterLower.width/50000, 0, "", "#00aeff");
    drawAdvImage(ctx, guiImgs.OuterCorrupt, new moveMatrix(viewspaceWidth/2, viewspaceHeight/2, viewspaceWidth*guiImgs.OuterCorrupt.width/1000, undefined));
    drawAdvImage(ctx, guiImgs.OuterLower, new moveMatrix(viewspaceWidth/2, viewspaceHeight/2+viewspaceWidth/20.7, viewspaceWidth*guiImgs.OuterLower.width/1000, undefined));
    drawOnlyText(genData.tag, viewspaceWidth/2, viewspaceHeight/2.5, 50, "center", "white", "black");
}

async function startMusic() {
    playSoundAsync(guiSound.music, true).then(async () => {
        if (menu >= 0 ) {
            await waitUntil(() => hasInteracted);
            await sleep(10);
            if (mainMenu) {
                startMusic();
            }
        }
    });
}

async function loadGuiAudio() {
    guiSound.music = await loadAudio('audio/gui/05_TitleScreen.wav');
    guiSound.tick = await loadAudio('audio/gui/Menu_Tick.wav');
    guiSound.close = await loadAudio('audio/gui/Menu_Close.wav');
    guiSound.open = await loadAudio('audio/gui/Menu_Open.wav');
}

async function loadGuiImages() {
    guiImgs.logo = await loadImage('images/gui/Logo.png');
    guiImgs.OuterCorrupt = await loadImage('images/gui/Outer_Corrupt.png');
    guiImgs.OuterLower = await loadImage('images/gui/Outer_Lower.png');
}

function drawBackgroundParalax(x) {
    drawSkyBackground();
    paintPara(x, 0, 3, backgroundImages[1]);
    paintPara(x, -50, 2, backgroundImages[2]);
    paintPara(x, -80, 1.5, backgroundImages[3]);
    paintPara(x, -130, 1, backgroundImages[4]);
}

function paintPara(camX, camY, camZ, img) {
    const width = img.width*(viewspaceHeight/550);
    let y = (-camY/180)*(viewspaceHeight/2);
    let x;
    for (let i = 0; i < Math.ceil(viewspaceWidth/width)+1; i++) {
        x = (camX/camZ) % width;
        x -= (width+viewspaceWidth)/2 - (i+1)*width;
        drawAdvImage(ctx, img, new moveMatrix(x + viewspaceWidth/2, y + viewspaceHeight/2, width, undefined));
    }

}

function drawSkyBackground() {
    drawAdvImage(ctx, backgroundImages[0], new moveMatrix(viewspaceWidth/2, viewspaceHeight/2, viewspaceWidth, viewspaceHeight));
}

async function loadBackgroundImages() {
    backgroundImages = [];
    backgroundImages.push(await loadImage('images/backgrounds/Background_0.png'));
    backgroundImages.push(await loadImage('images/backgrounds/Background_7.png'));
    backgroundImages.push(await loadImage('images/backgrounds/Background_8.png'));
    backgroundImages.push(await loadImage('images/backgrounds/Background_9.png'));
    backgroundImages.push(await loadImage('images/backgrounds/Background_10.png'));
    backgroundImages.push(await loadImage('images/backgrounds/Background_11.png'));
}

startMainMenu();

let worldGenWorker = new Worker("js/world/worldGen.js");
let lightEngineWorker = new Worker("js/world/lightEngine.js");

//setupWorld();

async function setupWorld() {

    tileData = await loadJSON('./js/json/tileData.json');
    tileSolverData = await loadJSON('./js/json/tileSolver.json');
    console.log(tileData);
    console.log(tileSolverData);

    worldGenWorker.postMessage({
        tileData: tileData,
        tileSolverData: tileSolverData
    });
}


worldGenWorker.onmessage = (e) => {
    const data = e.data;

    if (data.type == "world") {
        worldWidth = data.worldWidth;
        worldHeight = data.worldHeight;
        worldSize = data.worldSize;
        worldGTCH = data.worldGTCH;
        tileGrid = new Uint16Array(data.tileGrid);
        wallGrid = new Uint16Array(data.wallGrid);
        offsetTileGrid = new Uint16Array(data.offsetTileGrid);
        offsetWallGrid = new Uint16Array(data.offsetWallGrid);
    
        worldGenWorker.terminate();

        genData.currentMain++;

        lightEngineWorker.postMessage({
            tileData: tileData,
            tileGrid: tileGrid,
            wallGrid: wallGrid,
            genData: genData,
            worldSize: {width: worldWidth, height: worldHeight}
        });

    }
    if (data.type == "genUpdate") {
        genData = data.genData;
    }
}

lightEngineWorker.onmessage = (e) => {
    const data = e.data;

    if (data.type == "world") {
        skyLightGrid = new Uint8Array(data.skyLightGrid);
        lightGrid = new Uint8Array(data.lightGrid);

        lightEngineWorker.terminate();

        (async () => {
            await sleep(2000);
            startGame();
            mainMenu = false;
            guiSound.music.pause();
            guiSound.music.currentTime = 0;
        })();
    }
    if (data.type == "genUpdate") {
        genData = data.genData;
    }
}

function isMouseIn(sx, ex, sy, ey) {
    return mouseX > sx && mouseX < ex && mouseY > sy && mouseY < ey;
}

function textButton(text, x, y, size, align, fillColor, strokeColor, hoverColor, clickSound) {
    const height = size/viewspaceHeight*screenHeight;
    ctx.font = `${height}px Andy-Bold`;

    const width = ctx.measureText(text).width/screenWidth*viewspaceWidth;

    ctx.textAlign = align;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = height/6;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const tx = x/viewspaceWidth*screenWidth+screenOffsetX;
    const ty = y/viewspaceHeight*screenHeight+screenOffsetY;

    ctx.strokeText(text, tx, ty);

    let xp = x;
    let xm = x;
    if (align == 'center') {
        xp += width/2;
        xm -= width/2;
    }
    if (align == 'start' || align == 'left') {
        xp += width;
    }
    if (align == 'end' || align == 'right') {
        xm -= width;
    }

    if (isMouseIn(xm, xp, y-size/1.3, y)) {
        m.m4 = true;
        ctx.fillStyle = hoverColor;
        ctx.fillText(text, tx, ty);
        if (m.m3) {
            m.m3 = false;
            playSoundAsync(guiSound.tick, false, true);
        }
        if (mouseDown && m.m1) {
            m.m1 = false
            if (clickSound != undefined) {
                playSoundAsync(clickSound);
            }
            return true;
        }
    } else {
        ctx.fillStyle = fillColor;
        ctx.fillText(text, tx, ty);
    }
    return false;
}

function drawOnlyText(text, x, y, size, align, fillColor, strokeColor) {
    const height = size/viewspaceHeight*screenHeight;
    ctx.font = `${height}px Andy-Bold`;

    ctx.textAlign = align;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = height/6;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const tx = x/viewspaceWidth*screenWidth+screenOffsetX;
    const ty = y/viewspaceHeight*screenHeight+screenOffsetY;

    ctx.strokeText(text, tx, ty);
    
    ctx.fillStyle = fillColor;
    ctx.fillText(text, tx, ty);
}