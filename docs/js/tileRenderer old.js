function screenconsts(viewspaceWidth, viewspaceHeight, screenWidth, screenHeight, screenOffsetX, screenOffsetY) {
    this.viewspaceWidth = viewspaceWidth;
    this.viewspaceHeight = viewspaceHeight;
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.screenOffsetX = screenOffsetX;
    this.screenOffsetY = screenOffsetY;
}

function imgSize(width, height) {
    this.width = width;
    this.height = height;
}

self.onmessage = function (event) {
    const { tileImg, tileGrid, tilesheetSize, width, height, imgWidth, imgHeight, viewspaceWidth, viewspaceHeight, screenWidth, screenHeight, screenOffsetX, screenOffsetY } = event.data;
    
    const tileCanvas = new OffscreenCanvas(width, height);
    const ctx = tileCanvas.getContext("2d");

    drawTiles(tileImg, new imgSize(imgWidth, imgHeight), tileGrid, tileCanvas, ctx, tilesheetSize, new screenconsts(viewspaceWidth, viewspaceHeight, screenWidth, screenHeight, screenOffsetX, screenOffsetY));
};

function getAsp(img) {return img.width / img.height;}

function stampImage
    (
    c, Dimg, img, x, y, width, height = width/getAsp(img),
    rotate = 0, cx = 0, cy = 0,
    cropX = 0, cropY = 0, cropWidth = 1, cropHeight = 1
    )
{

    cropX *= img.width;
    cropY *= img.height;

    cropWidth *= img.width;
    cropHeight *= img.height;

    let moveX = -cropWidth/2;
    let moveY = -cropHeight/2;

    rotate = rotate % 360
    rotate *= Math.PI/180;
   
    c.save();
    c.translate(x, y);
    c.translate(cx, cy);
    c.rotate(rotate);
    c.translate(-cx, -cy);
    c.scale(width/img.width, height/img.height);
    c.drawImage(
        Dimg,
        cropX, cropY, cropWidth, cropHeight,
        moveX, moveY, cropWidth, cropHeight
    );
    c.restore();
}

function moveMatrix(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
}

function rotationMatrix(rotate, cx, cy) {
    this.rotate = rotate;
    this.cx = cx;
    this.cy = cy;
}

function cropMatrix(cropX, cropY, cropWidth, cropHeight) {
    this.cropX = cropX;
    this.cropY = cropY;
    this.cropWidth = cropWidth;
    this.cropHeight = cropHeight;
}

function drawAdvImage(c, Dimg, img, consts, MM, RM = new rotationMatrix(0, 0, 0), CM = new cropMatrix(0, 0, 1, 1)) {
    let x = MM.x;
    let y = MM.y;
    let width = MM.width;
    let height = MM.height;

    let cx = RM.cx;
    let cy = RM.cy;

    let viewspaceWidth = consts.viewspaceWidth;
    let viewspaceHeight = consts.viewspaceHeight;
    let screenWidth = consts.screenWidth;
    let screenHeight = consts.screenHeight;
    let screenOffsetX = consts.screenOffsetX;
    let screenOffsetY = consts.screenOffsetY;

    x = x/viewspaceWidth*screenWidth + screenOffsetX
    y = y/viewspaceHeight*screenHeight + screenOffsetY

    width = width/viewspaceWidth*screenWidth
    if (height != undefined) {
        height = height/viewspaceHeight*screenHeight
    }

    cx = cx/viewspaceWidth*screenWidth
    cy = cy/viewspaceHeight*screenHeight

    stampImage(c, Dimg, img, x, y, width, height, RM.rotate, cx, cy, CM.cropX, CM.cropY, CM.cropWidth, CM.cropHeight);
}


function drawTiles(tilesImg, img, tilegrid, tileCanvas, tilectx, tilesheetSize, consts) {

    let width = (tilesheetSize)/img.width
    let height = (tilesheetSize)/img.height
    let cx = (tilesheetSize+2)/img.width
    let cy = (tilesheetSize+2)/img.height

    let size = 2;

    tilectx.imageSmoothingEnabled = false;

    let scale = tilesheetSize*(img.width / (tilesheetSize+2))*size
    for (let y = 0; y < 10*4; y++) {
        for (let x = 0; x < 13*4; x++) {
            drawAdvImage(tilectx, tilesImg, img, consts, new moveMatrix(200 + (tilesheetSize-2)*size*x, 200 + (tilesheetSize-2)*size*y, scale, undefined), undefined, new cropMatrix(Math.floor(x/4)*cx, Math.floor(y/4)*cy, width, height));
        }
    }

    tileCanvas.convertToBlob().then(blob => {
        createImageBitmap(blob).then((processedBitmap) => {
            self.postMessage({ processedBitmap }, [processedBitmap]);
        });
    });
}