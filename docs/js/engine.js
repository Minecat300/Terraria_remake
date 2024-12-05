const c = document.getElementById("mainCanvas");
const ctx = c.getContext("2d");

const main = document.getElementById("main");

c.width = main.clientWidth;
c.height = main.clientHeight;

let screenWidth = 0;
let screenHeight = 0;
let screenOffsetX = 0;
let screenOffsetY = 0;

const lockAsp = 16/9;

const viewspaceWidth = 1600;
const viewspaceHeight = 900;

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

let time = 0;

let mouseX = 0;
let mouseY = 0;
let mouseDown = false;

function mouseMove(event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
}

function mousePress() {mouseDown = true;}
function mouseRelease() {mouseDown = false;}
function mouseReset() {mouseX = 0; mouseY = 0; mouseDown = false; for (const key in keyPress) {keyPress[key] = false;}}

var elem = document.documentElement;

function openFullscreen() {
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { /* Safari */
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE11 */
        elem.msRequestFullscreen();
    }
}

function closeFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) { /* Safari */
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { /* IE11 */
      document.msExitFullscreen();
    }
}

const keyPress = {
    space: false,
    w: false,
    a: false,
    s: false,
    d: false,
    upArrow: false,
    downArrow: false,
    leftArrow: false,
    rightArrow: false
}

function updateKeyboard(event, state) {
    switch (event.key) {
        case " ":
            if (state == true) {
                updateViewspace();
            }
            keyPress.space = state;
            break;
        case "w":
            keyPress.w = state;
            break;
        case "a":
            keyPress.a = state;
            break;
        case "s":
            keyPress.s = state;
            break;
        case "d":
            keyPress.d = state;
            break;
        case "ArrowUp":
            keyPress.upArrow = state;
            break;
        case "ArrowDown":
            keyPress.downArrow = state;
            break;
        case "ArrowLeft":
            keyPress.leftArrow = state;
            break;
        case "ArrowRight":
            keyPress.rightArrow = state;
            break;
    }
}

window.addEventListener("keydown", function(event){updateKeyboard(event, true)}, true)
window.addEventListener("keyup", function(event){updateKeyboard(event, false)}, true)

function getAsp(img) {return img.width / img.height;}

function stampImage
    (
    c, img, x, y, width, height = width/getAsp(img),
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
        img,
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

function drawAdvImage(c, img, MM, RM = new rotationMatrix(0, 0, 0), CM = new cropMatrix(0, 0, 1, 1)) {
    let x = MM.x;
    let y = MM.y;
    let width = MM.width;
    let height = MM.height;

    let cx = RM.cx;
    let cy = RM.cy;

    x = x/viewspaceWidth*screenWidth + screenOffsetX
    y = y/viewspaceHeight*screenHeight + screenOffsetY

    width = width/viewspaceWidth*screenWidth
    if (height != undefined) {
        height = height/viewspaceHeight*screenHeight
    }

    cx = cx/viewspaceWidth*screenWidth
    cy = cy/viewspaceHeight*screenHeight

    stampImage(c, img, x, y, width, height, RM.rotate, cx, cy, CM.cropX, CM.cropY, CM.cropWidth, CM.cropHeight);
}

function updateAsp(targetAsp, forceUpdate = false) {
    if (!(c.height != main.clientHeight || c.width != main.clientWidth) && !forceUpdate) {
        return;
    }

    c.width = main.clientWidth;
    c.height = main.clientHeight;

    let currentAsp = c.width/c.height;

    if (currentAsp == targetAsp || targetAsp == 0) {
        screenWidth = c.width;
        screenHeight = c.height;
        screenOffsetX = 0;
        screenOffsetY = 0;
    }
    
    if (currentAsp > targetAsp) {
        screenWidth = c.height*targetAsp;
        screenHeight = c.height;
    } else {
        screenWidth = c.width;
        screenHeight = c.width/targetAsp;
    }

    screenOffsetX = (c.width - screenWidth)/2;
    screenOffsetY = (c.height - screenHeight)/2;
}

function drawAsp() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, screenOffsetX, c.height);
    ctx.fillRect(screenOffsetX+screenWidth, 0, screenOffsetX, c.height);
    ctx.fillRect(0, 0, c.width, screenOffsetY);
    ctx.fillRect(0, screenOffsetY+screenHeight, c.width, screenOffsetY);
}

updateAsp(lockAsp, true)

function download(data, filename, type) {
    var file = new Blob([data], {type: type});
    if (window.navigator.msSaveOrOpenBlob)
        window.navigator.msSaveOrOpenBlob(file, filename);
    else {
        var a = document.createElement("a"),
                url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);  
        }, 0); 
    }
}

function packSignedXY(x, y) {
    if (x < -128 || x > 127 || y < -128 || y > 127) {
      throw new Error("x and y must be in the range -128 to 127.");
    }
  
    const xOffset = x + 128;
    const yOffset = y + 128; 
  
    return (yOffset << 8) | xOffset;
}

function unpackSignedXY(value) {
    if (value < 0 || value > 65535) {
      throw new Error("Value must be in the range 0-65535.");
    }
  
    const xOffset = value & 0xFF;        
    const yOffset = (value >> 8) & 0xFF;
  
    const x = xOffset - 128; 
    const y = yOffset - 128;
  
    return [x, y];
}

function randomNumber(min, max) {
    return Math.round(Math.random()*(max-min))+min
}