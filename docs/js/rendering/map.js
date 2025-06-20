let fullscreenMap = false;
let mapImages = {};
let mapPos = {
    x: 0,
    y: 0,
    zoom: 1,
    mouseHold: false,
    mouseHoldX: 0,
    mouseHoldY: 0,
    prevX: 0,
    prevY: 0
};

let minimap = false;
let minimapZoom = 6;
let minimapResolution = 70;

function drawMinimap() {
    if (!minimap) {return;}
    let width = 300*uiSize;
    let x = viewspaceWidth - (width/2+30);
    let y = width/2+30;

    drawAdvImage(ctx, drawMap(minimapResolution, minimapResolution, cam.x, cam.y, minimapZoom), new moveMatrix(x, y, width, width));
    drawAdvImage(ctx, mapImages.minimap.leaf.frame, new moveMatrix(x, y, width*1.1, undefined));
}

function drawFullscreenMap() {

    if (!mouseDown) {
        m.m1 = true;
    }

    mapPos.zoom = Math.min(mapPos.zoom, 115);
    mapPos.zoom = Math.max(mapPos.zoom, 1);
    mapPos.x = Math.min(mapPos.x, 90000);
    mapPos.x = Math.max(mapPos.x, -20000);
    mapPos.y = Math.min(mapPos.y, 35000);
    mapPos.y = Math.max(mapPos.y, -15000);

    let mapHeight = (worldHeight*16)/mapPos.zoom*2;
    let mapX = viewspaceWidth/2 - (mapPos.x/mapPos.zoom*2 - (worldWidth*16)/mapPos.zoom);
    let mapY = viewspaceHeight/2 + (mapPos.y/mapPos.zoom*2 - (worldHeight*16)/mapPos.zoom);

    let cropBottom = mapPos.y/mapPos.zoom*2 - ((worldBoarders)*16)/mapPos.zoom*2;
    cropBottom = Math.max(0, Math.min(1, (cropBottom + viewspaceHeight/2)/viewspaceHeight));

    let cropTop = mapPos.y/mapPos.zoom*2 - ((worldHeight - worldBoarders)*16)/mapPos.zoom*2;
    cropTop = Math.max(0, Math.min(1, (cropTop + viewspaceHeight/2)/viewspaceHeight));

    let cropLeft = mapPos.x/mapPos.zoom*2 - ((worldBoarders)*16)/mapPos.zoom*2;
    cropLeft = Math.max(0, Math.min(1, (viewspaceWidth/2 - cropLeft)/viewspaceWidth));

    let cropRight = mapPos.x/mapPos.zoom*2 - ((worldWidth - worldBoarders)*16)/mapPos.zoom*2;
    cropRight = Math.max(0, Math.min(1, (viewspaceWidth/2 - cropRight)/viewspaceWidth));

    const CM = new cropMatrix(cropLeft, cropTop, cropRight-cropLeft, cropBottom-cropTop);
    const MM = new moveMatrix(viewspaceWidth/2+(cropLeft*viewspaceWidth) - (1-(cropRight-cropLeft))*viewspaceWidth/2, viewspaceHeight/2+(cropTop*viewspaceHeight) - (1-(cropBottom-cropTop))*viewspaceHeight/2, viewspaceWidth, viewspaceHeight);
 
    drawAdvImage(ctx, mapImages.background, new moveMatrix(viewspaceWidth/2, viewspaceHeight/2, viewspaceWidth, viewspaceHeight));
    drawAdvImage(ctx, mapImages.map, new moveMatrix(mapX, mapY, mapHeight*getAsp(mapImages.map)*1.1, mapHeight*1.1));
    drawAdvImage(ctx, drawMap(800, 450, mapPos.x, mapPos.y, mapPos.zoom, 1), MM, undefined, CM);

    let iconWidth = mapImages.mapIcon1.width*uiSize*2;
    let iconHeight = iconWidth/getAsp(mapImages.mapIcon1)
    iconWidth = iconHeight*getAsp(mapImages.mapSaveIcon);
    iconHeight = iconWidth/getAsp(mapImages.mapSaveIcon);
    if (isMouseIn(10, 10 + iconWidth, viewspaceHeight - (iconHeight + 10), viewspaceHeight - 10)) {
        drawAdvImage(ctx, mapImages.mapSaveIcon, new moveMatrix(iconWidth/2 + 10, viewspaceHeight - (iconHeight/2 + 10), iconHeight, undefined));
        if (m.m1 && mouseDown) {
            m.m1 = false;
            downloadImagebitmap(drawMap(worldWidth, worldHeight), "Map.png");
        }
    } else {
        drawAdvImage(ctx, mapImages.mapSaveIconT, new moveMatrix(iconWidth/2 + 10, viewspaceHeight - (iconHeight/2 + 10), iconWidth, undefined));
    }

    let prevWidth = iconWidth;
    iconWidth = mapImages.mapIcon1.width*uiSize*2;
    iconHeight = iconWidth/getAsp(mapImages.mapIcon1);
    if (isMouseIn(20 + prevWidth, 20 + prevWidth + iconWidth, viewspaceHeight - (iconHeight + 10), viewspaceHeight - 10)) {
        const newIconWidth = mapImages.mapIcon2.width*uiSize*2;
        drawAdvImage(ctx, mapImages.mapIcon2, new moveMatrix(iconWidth/2 + 20 + prevWidth, viewspaceHeight - (iconHeight/2 + 10), newIconWidth, undefined));
        if (mouseDown) {
            fullscreenMap = false;
            return;
        }
    } else {
        drawAdvImage(ctx, mapImages.mapIcon1, new moveMatrix(iconWidth/2 + 20 + prevWidth, viewspaceHeight - (iconHeight/2 + 10), iconWidth, undefined));
    }

    
    //drawRect(0, (mapPos.y/mapPos.zoom*2 - ((worldBoarders)*16)/mapPos.zoom*2)+viewspaceHeight/2, viewspaceWidth, 5, 0, "", "#00FF00")
    //drawRect(0, (mapPos.y/mapPos.zoom*2 - ((worldHeight - worldBoarders)*16)/mapPos.zoom*2)+viewspaceHeight/2, viewspaceWidth, 5, 0, "", "#00FF00")
    //drawRect(viewspaceWidth/2-(mapPos.x/mapPos.zoom*2 - ((worldBoarders)*16)/mapPos.zoom*2), 0, 5, viewspaceHeight, 0, "", "#00FF00")
    //drawRect(viewspaceWidth/2-(mapPos.x/mapPos.zoom*2 - ((worldWidth - worldBoarders)*16)/mapPos.zoom*2), 0, 5, viewspaceHeight, 0, "", "#00FF00")
    
    if (mouseDown) {
        if (!mapPos.mouseHold) {
            mapPos.mouseHold = true;
            mapPos.mouseHoldX = mouseX;
            mapPos.mouseHoldY = viewspaceHeight-mouseY;
            mapPos.prevX = mapPos.x;
            mapPos.prevY = mapPos.y;
        } else {
            mapPos.x = mapPos.prevX + (mapPos.mouseHoldX - mouseX)*mapPos.zoom/(viewspaceWidth/800);
            mapPos.y = mapPos.prevY + (mapPos.mouseHoldY - (viewspaceHeight-mouseY))*mapPos.zoom/(viewspaceHeight/450);
        }
    } else {
        mapPos.mouseHold = false;
    }
}

function drawMap(width, height, camX, camY, zoom, mapType = 2) {
    const oc = new OffscreenCanvas(width, height);
    const octx = oc.getContext("2d");

    const imageData = octx.createImageData(width, height);
    const data = imageData.data;

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const index = (y * width + x) * 4;
            let tx;
            let ty;
            let tileIdx;
            if (camX != undefined) {
                tx = getGridPos(camX + (x - width/2)*zoom);
                ty = getGridPos(camY + (height/2 - y)*zoom);
                tileIdx = getIDX(tx, ty);
            } else {
                tx = x;
                ty = worldHeight - y;
                tileIdx = getIDX(x, worldHeight - y);
            }

            let hex = tileData[tileGrid[tileIdx]]?.mapColor ?? "none";
            if (hex == "none") {
                hex = tileData[wallGrid[tileIdx]]?.mapColor ?? "none";
                if (hex == "none") {
                    hex = "5a74f7";
                }
            }
            if (tx > worldWidth-worldBoarders-1 || tx < worldBoarders || ty > worldHeight-worldBoarders-1 || ty < worldBoarders) {
                hex = "000000";
            }
            let {r, b, g} = hexToRgb(hex);

            if (mapType == 2) {
                const darkMul = Math.min(1, Math.max(mapLightGrid[tileIdx]/120, xray));
                r *= darkMul;
                g *= darkMul;
                b *= darkMul;
            }

            data[index] = r;
            data[index + 1] = g
            data[index + 2] = b;
            if (mapType == 1) {
                data[index + 3] = Math.min(255, Math.max(mapLightGrid[tileIdx]/120*255, xray*255));
            } else {
                data[index + 3] = 255;
            }
        }
    }

    octx.putImageData(imageData, 0, 0);

    return oc.transferToImageBitmap();
}

async function loadMapImages() {
    mapImages.map = await loadImage('images/map/Map.png');
    mapImages.background = await loadImage('images/map/MapBG1.png');
    mapImages.mapIcon1 = await loadAndColorAgjustImage('images/map/Map_0.png', {transparency: 0.5});
    mapImages.mapIcon2 = await loadImage('images/map/Map_4.png');
    mapImages.mapSaveIcon = await loadImage('images/map/Map_Save_0.png');
    mapImages.mapSaveIconT = await loadAndColorAgjustImage('images/map/Map_Save_0.png', {transparency: 0.5});
    mapImages.minimap = {};
    mapImages.minimap.golden = await loadMinimapFolder('images/map/minimap/Golden');
    mapImages.minimap.leaf = await loadMinimapFolder('images/map/minimap/Leaf');
    mapImages.minimap.remix = await loadMinimapFolder('images/map/minimap/Remix');
    mapImages.minimap.retro = await loadMinimapFolder('images/map/minimap/Retro');
    mapImages.minimap.sticks = await loadMinimapFolder('images/map/minimap/Sticks');
    mapImages.minimap.stonegold = await loadMinimapFolder('images/map/minimap/StoneGold');
    mapImages.minimap.twigleaf = await loadMinimapFolder('images/map/minimap/TwigLeaf');
    mapImages.minimap.valkyrie = await loadMinimapFolder('images/map/minimap/Valkyrie');
}

async function loadMinimapFolder(path) {
    let imageCollection = {};
    imageCollection.frame = await loadImage(path + '/MinimapFrame.png');
    imageCollection.reset = await loadImage(path + '/MinimapButton_Reset.png');
    imageCollection.zoomIn = await loadImage(path + '/MinimapButton_ZoomIn.png');
    imageCollection.zoomOut = await loadImage(path + '/MinimapButton_ZoomOut.png');
    return imageCollection;
}