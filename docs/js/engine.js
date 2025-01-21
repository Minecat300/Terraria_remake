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

let screenBoarders = true;

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

let time = 0;

let mouseX = 0;
let mouseY = 0;
let mouseDown = false;

function mouseMove(event) {
    mouseX = (event.clientX-screenOffsetX)/screenWidth*viewspaceWidth;
    mouseY = (event.clientY-screenOffsetY)/screenHeight*viewspaceHeight;
    mouseX = Math.max(mouseX, 0);
    mouseY = Math.max(mouseY, 0);
    mouseX = Math.min(mouseX, viewspaceWidth);
    mouseY = Math.min(mouseY, viewspaceHeight);
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
    rightArrow: false,
    c: false
}

function updateKeyboard(event, state) {
    switch (event.key.toLowerCase()) {
        case " ":
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
        case "arrowup":
            keyPress.upArrow = state;
            break;
        case "arrowdown":
            keyPress.downArrow = state;
            break;
        case "arrowleft":
            keyPress.leftArrow = state;
            break;
        case "arrowright":
            keyPress.rightArrow = state;
            break;
        case "c":
            keyPress.c = state;
            break; 
        case "b":
            if (state) {
                window.open('https://www.twitch.tv/beepstr');
            }
            break;
        case "n":
            if (state) {
                beeps = !beeps;
            }
            break;
        case "o":
            if (state) {
                creative = !creative;
            }
            break;
        case "escape":
            if (!state) {
                inventoryOpen = !inventoryOpen;
            }
            break;
    }
}

window.addEventListener("keydown", function(event){updateKeyboard(event, true)}, true);
window.addEventListener("keyup", function(event){updateKeyboard(event, false)}, true);

function getAsp(img) {return img.width / img.height;}

function stampImage
    (
    c, img, x, y, width, height = width/getAsp(img),
    rotate = 0, cx = 0, cy = 0,
    cropX = 0, cropY = 0, cropWidth = 1, cropHeight = 1,
    overrideRotate = false
    )
{

    cropX *= img.width;
    cropY *= img.height;

    cropWidth *= img.width;
    cropHeight *= img.height;

    const moveX = -cropWidth/2;
    const moveY = -cropHeight/2;

    rotate = rotate % 360;
    rotate *= Math.PI/180;
   
    if (rotate === 0 && !overrideRotate) {
        //c.filter = effects;
        c.drawImage(
            img,
            cropX, cropY, cropWidth, cropHeight,
            x + moveX*width/img.width, y + moveY*height/img.height, cropWidth*width/img.width+0.5, cropHeight*height/img.height+0.5
        );
        //c.filter = 'none';
    } else {
        c.save();
        c.translate(x, y);
        c.translate(cx, cy);
        c.rotate(rotate);
        c.translate(-cx, -cy);
        c.scale(width/img.width, height/img.height);
        //c.filter = effects;
        c.drawImage(
            img,
            cropX, cropY, cropWidth, cropHeight,
            moveX, moveY, cropWidth, cropHeight
        );
        //c.filter = 'none';
        c.restore();
    }
}

class moveMatrix {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
}

class rotationMatrix {
    constructor(rotate, cx, cy) {
        this.rotate = rotate;
        this.cx = cx;
        this.cy = cy;
    }
}

class cropMatrix {
    constructor(cropX, cropY, cropWidth, cropHeight) {
        this.cropX = cropX;
        this.cropY = cropY;
        this.cropWidth = cropWidth;
        this.cropHeight = cropHeight;
    }
}

function drawAdvImage(c, img, MM, RM = new rotationMatrix(0, 0, 0), CM = new cropMatrix(0, 0, 1, 1), overrideRotate) {
    let x = MM.x;
    let y = MM.y;
    let width = MM.width;
    let height = MM.height;

    let cx = RM.cx;
    let cy = RM.cy;

    x = x/viewspaceWidth*screenWidth + screenOffsetX;
    y = y/viewspaceHeight*screenHeight + screenOffsetY;

    width = width/viewspaceWidth*screenWidth;
    if (height != undefined) {
        height = height/viewspaceHeight*screenHeight;
    }

    cx = cx/viewspaceWidth*screenWidth;
    cy = cy/viewspaceHeight*screenHeight;

    stampImage(c, img, x, y, width, height, RM.rotate, cx, cy, CM.cropX, CM.cropY, CM.cropWidth, CM.cropHeight, overrideRotate);
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
        return;
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
    if (!screenBoarders) {return;}
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
    return Math.round(Math.random()*(max-min))+min;
}

async function loadJSON(path) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${path}: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error loading JSON:', error);
      throw error;
    }
}

function getIDX(x, y) {
    return x + worldWidth * y;
}

function gridAlign(value) {
    return Math.floor(value/tilesheetSize)*tilesheetSize
}

function getGridPos(value) {
    return Math.floor(value/16);
}

function getTile(x, y) {
    return tileGrid[getIDX(Math.floor(x/16), Math.floor(y/16))];
}

function getXY(idx) {
    const x = idx % worldWidth;
    const y = Math.floor(idx / worldWidth);
    return [x, y];
}

function loadImage(path) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = path;
        img.onload = () => resolve(createImageBitmap(img));
        img.onerror = reject;
    });
}

function sin(r) {
    return Math.sin(r*Math.PI/180);
}

function cos(r) {
    return Math.cos(r*Math.PI/180);
}

async function playSoundAsync(Iaudio, waitForCompletion = false, newAudio = false) {

    let audio;

    if (newAudio) {
        audio = new Audio(Iaudio.src);
    } else {
        audio = Iaudio;
    }

    if (!(audio instanceof HTMLAudioElement)) {
        throw new Error('Input must be an HTMLAudioElement');
    }

    try {
        await audio.play();
        if (waitForCompletion) {
            await new Promise((resolve) => audio.addEventListener('ended', resolve, { once: true }));
        }
    } catch (error) {
        console.warn('Audio playback failed:', error);
    }
}

function loadAudio(path) {
    return new Promise((resolve, reject) => {
        const audio = new Audio();
        audio.src = path;
        audio.onloadeddata = () => resolve(audio);
        audio.onerror = (err) => reject(err);
    });
}

let hasInteracted = false;

document.addEventListener('click', () => {
    hasInteracted = true;
});

document.addEventListener('keydown', () => {
    hasInteracted = true;
});

document.addEventListener('touchstart', () => {
    hasInteracted = true;
});

const waitUntil = (conditionFn, interval = 100) => {
    return new Promise((resolve) => {
        const checkCondition = () => {
            if (conditionFn()) {
                resolve();
            } else {
                setTimeout(checkCondition, interval);
            }
        };
        checkCondition();
    });
};

function drawRect(x, y, width, height, strokeSize, strokeColor, fillColor) {
    x = x/viewspaceWidth*screenWidth + screenOffsetX;
    y = y/viewspaceHeight*screenHeight + screenOffsetY;

    width = width/viewspaceWidth*screenWidth;
    height = height/viewspaceHeight*screenHeight;

    strokeSize = strokeSize/((viewspaceWidth+viewspaceHeight)/2)*((screenWidth+screenHeight)/2)

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeSize;
    ctx.fillRect(x, y, width, height);
    if (strokeSize > 0) {
        ctx.strokeRect(x, y, width, height);
    }
}