const cam = {
    x: 0,
    y: 0,
    zoom: 2
}

const player = {
    pos: {x: 0, y: 0},
    speed: {x: 0, y: 0},
    axis: {x: 0, y: 0},
    size: {width: 9, height: 22},
    falling: 99,
    jumping: 99,
    dir: 1,
    frame: 0
}

let creative = false;

const gravity = -0.5;
const tiny = -0.000001;

let solid;

function updatePlayerMain() {
    if (creative) {
        updateCreative();
        moveCamera();
        creativeEditTiles();
    } else {
        handleKeys_leftRight();
        handleKeys_jump();
        movePlayerX();
        movePlayerY();
        moveCamera();
    }
} 

function movePlayerX() {
    const orgY = player.pos.y;
    player.pos.x += player.speed.x/2;
    fixCollisionInDir(player.speed.x, 0);
    const orgX = player.pos.x;
    const orgSolid = solid;
    if (player.axis.x != 0) {
        player.dir = player.axis.x;
    }
    const tx = player.pos.x + (2 + player.size.width)*player.dir;
    const ty = player.pos.y - player.size.height + 1;

    const tileX = Math.floor(tx/16);
    const tileY = Math.floor(ty/16);

    const index = getIDX(tileX, tileY);
    const tile = tileGrid[index];
    const tileConfig = tileData[tile];

    if (checkForStepSpace(index) && player.falling < 3 && ((tileConfig?.collisionState ?? "none") === "solid") && Math.abs(player.speed.x) > 0) {
        player.pos.y += 16;
        player.pos.x += player.dir*2;
        fixCollisionInDir(0, 0);
        if (solid > 0) {
            player.pos.x = orgX;
            player.pos.y = orgY;
            if (orgSolid > 0) {
                player.speed.x = 0;
            }
        }
    } else {
        if (solid > 0) {
            player.speed.x = 0;
        }
    }
}

function movePlayerY() {
    player.pos.y += player.speed.y;
    player.speed.y += gravity;
    fixCollisionInDir(0, player.speed.y);
    player.falling++;
    if (player.speed.y < -10) {
        player.speed.y = -10;
    }
    if (solid > 0) {
        if (player.speed.y < 0) {
            player.falling = 0;
        } else {
            player.jumping = 99;
        }
        player.speed.y = 0;
    }
}

function handleKeys_jump() {
    if (player.axis.y == 1) {
        if (player.falling < 2 || player.jumping > 0) {
            player.jumping++;
            if (player.jumping < 7) {
                player.speed.y = 8;
            }
        }
    } else {
        player.jumping = 0;
    }
}

function handleKeys_leftRight() {
    getInputAxis();
    if (player.axis.x == 0) {
        if (player.falling < 2) {
            if (player.speed.x > 0.6) {
                player.speed.x -= 0.6;
            } else {
                if (player.speed.x < -0.6) {
                    player.speed.x += 0.6;
                } else {
                    player.speed.x = 0;
                    player.frame = 0;
                }
            }
        }
    } else {
        if (player.axis.x * player.speed.x < 6) {  
            player.speed.x += player.axis.x*0.7*((player.axis.x * player.speed.x < 0)+1);
        } else {
            player.speed.x *= 0.99;
        }
    }
    let tmp = Math.abs(player.speed.x)/38;
    tmp = Math.min(tmp, 0.2);
    player.frame += tmp;
}

function checkForStepSpace(idx) {
    if ((tileData[tileGrid[idx+worldWidth]]?.collisionState ?? "none") === "solid") {return false;}
    if ((tileData[tileGrid[idx+worldWidth*2]]?.collisionState ?? "none") === "solid") {return false;}
    if ((tileData[tileGrid[idx+worldWidth*3]]?.collisionState ?? "none") === "solid") {return false;}
    return true;
}

function fixCollisionInDir(dx, dy) {
    const width = player.size.width;
    const height = player.size.height;

    solid = 0;
    for (let i = 0; i < 2; i++) {
        let di = 1;
        let y = -height;
        for (let iy = 0; iy < Math.ceil(height*2/16)+1; iy++) {
            let x = width + tiny;
            for (let ix = 0; ix < Math.ceil(width*2/16)+1; ix++) {
                fixCollisionAtPoint(player.pos.x + x, player.pos.y + y, 2*(di == 2)+1*(di == 1), dx, dy);
                x -= width*2/Math.ceil(width*2/16);
            }
            y += height*2/Math.ceil(height*2/16);
            di++
        }
        if (solid < 1) {
            return;
        }
    }
}

function fixCollisionAtPoint(x, y, part, dx, dy) {
    const tile = getTile(x, y);
    const tileConfig = tileData[tile];
    const collisionState = tileConfig?.collisionState ?? "none";
    if (collisionState === "passThrough" || collisionState === "none") {return;}

    const modX = x % 16;
    const modY = y % 16;

    if (collisionState === "platform") {
        if (dx != 0) {return;}
        if (part != 1 || modY - dy < 15) {return;}
        if (player.axis.y == -1 && player.falling < 5) {return;}
    }
    solid = 10;
    if (dy < 0) {
        player.pos.y += 16 - modY;
    }
    if (dx < 0) {
        player.pos.x += 16 - modX;
    }
    if (dy > 0) {
        player.pos.y += tiny - modY;
    }
    if (dx > 0) {
        player.pos.x += tiny - modX;
    }
}

function updateCreative() {
    getInputAxis();

    player.speed.x += 7 * player.axis.x;
    player.speed.y += 7 * player.axis.y;

    player.speed.x *= 0.7;
    player.speed.y *= 0.7;

    player.pos.x += player.speed.x;
    player.pos.y += player.speed.y;
}

function getInputAxis() {
    const left = keyPress.a || keyPress.leftArrow;
    const right = keyPress.d || keyPress.rightArrow;
    const up = keyPress.w || keyPress.upArrow || keyPress.space;
    const down = keyPress.s || keyPress.downArrow;

    player.axis.x = right - left;
    player.axis.y = up - down;
}

function moveCamera() {
    cam.x = player.pos.x;
    cam.y = player.pos.y;

    if (cam.x < viewspaceWidth/cam.zoom/2) {
        cam.x = viewspaceWidth/cam.zoom/2;
    }
    if (cam.y < viewspaceHeight/cam.zoom/2) {
        cam.y = viewspaceHeight/cam.zoom/2;
    }
    if (cam.x > (worldWidth * tilesheetSize) - viewspaceWidth/cam.zoom/2) {
        cam.x = (worldWidth * tilesheetSize) - viewspaceWidth/cam.zoom/2;
    }
    if (cam.y > (worldHeight * tilesheetSize) - viewspaceHeight/cam.zoom/2) {
        cam.y = (worldHeight * tilesheetSize) - viewspaceHeight/cam.zoom/2;
    }
}

function resetPlayer() {
    let y = worldHeight - 1;

    while (tileGrid[getIDX(worldWidth/2, y)] == 0 && y > 0) {
        y--;
    }
    player.pos.x = worldWidth/2*16;
    player.pos.y = y*16;
}

function drawPlayer() {

    const light = getLight(getIDX(getGridPos(player.pos.x), getGridPos(player.pos.y)), {dayNight: dayNight});

    const Anispeed = 1.5;

    const frame = player.frame;

    const armsTime = Math.floor(frame / Anispeed) % 4;
    let legsTime = Math.floor(frame / Anispeed*3.5) % 14;
    let bodyTime = (Math.floor(frame / Anispeed*3.5) + 3 % 14) % 7;
    if (bodyTime > 3) {
        bodyTime = 1;
    } else {
        bodyTime = 0;
    }

    let helmet;
    let chestplate;
    let greaves;
    if (beeps) {
        helmet = "beepsHelmet";
        chestplate = "beepsBody";
        greaves = "beepsLegs";
    }

    let legs = legsTime + 6;
    let arms = {x: 3 + armsTime, y: 1}
    if (Math.abs(player.speed.x) < 0.2) {
        legs = 0;
        bodyTime = 0;
        arms.x = 2;
        arms.y = 0;
        legsTime = 0;
    }
    if (player.falling > 1) {
        legs = 5;
        bodyTime = 0;
        arms.x = 2;
        arms.y = 1;
        legsTime = 0;
    }

    drawCharacter(
        "default",
        viewspaceWidth/2 + (player.pos.x - cam.x)*cam.zoom, viewspaceHeight/2 + (cam.y - player.pos.y - 2)*cam.zoom, cam.zoom, player.dir,
        helmet, chestplate, greaves,
        {x: Number(player.falling > 1), y: 0}, arms, legsTime + 6, legs, legsTime, bodyTime,
        100 - Math.min(100, light/120*100)
    );

}

function drawCharacter(playerAssets, x, y, scale, dir, helmet, chestplate, greaves, bodyState, armState, headState, legsState, hairState, bodyOffsetY, light) {
    playerAssets = playerLoadedAssets[playerAssets];

    if (chestplate === undefined) {
        drawBodypart(playerAssets.arms, x, y, scale, dir, armState.x, armState.y + 2, light, bodyOffsetY);
        drawBodypart(playerAssets.hands, x, y, scale, dir, armState.x, armState.y + 2, light, bodyOffsetY);
    } else {
        drawBodypart(playerImages[chestplate], x, y, scale, dir, armState.x, armState.y + 2, light, bodyOffsetY);
    }
    if (greaves === undefined) {
        drawBodypart(playerAssets.pants, x, y, scale, dir, 0, legsState, light);
        drawBodypart(playerAssets.shoes, x, y, scale, dir, 0, legsState, light);
    } else {
        drawBodypart(playerImages[greaves], x, y, scale, dir, 0, legsState, light);
    }
    drawBodypart(playerAssets.body, x, y, scale, dir, bodyState.x, bodyState.y, light, bodyOffsetY);
    if (chestplate != undefined) {
        drawBodypart(playerImages[chestplate], x, y, scale, dir, bodyState.x, bodyState.y, light, bodyOffsetY);
    }
    drawBodypart(playerAssets.head, x, y, scale, dir, 0, headState, light);
    drawBodypart(playerAssets.eye1, x, y, scale, dir, 0, headState, light);
    drawBodypart(playerAssets.eye2, x, y, scale, dir, 0, headState, light);
    if (helmet === undefined) {
        drawBodypart(playerAssets.hair, x, y, scale, dir, 0, hairState, light);
    } else {
        drawBodypart(playerImages[helmet], x, y, scale, dir, 0, headState, light);
    }
    if (chestplate === undefined) {
        drawBodypart(playerAssets.arms, x, y, scale, dir, armState.x, armState.y, light, bodyOffsetY);
        drawBodypart(playerAssets.hands, x, y, scale, dir, armState.x, armState.y, light, bodyOffsetY);
    } else {
        drawBodypart(playerImages[chestplate], x, y, scale, dir, armState.x, armState.y, light, bodyOffsetY);
    }
}

function drawBodypart(img, x, y, scale, dir, cx, cy, light, pixleOffsetY = 0) {

    cx *= 40/img.width;
    cy *= 56/img.height;

    drawAdvImage(ctx, img, new moveMatrix(x, y - pixleOffsetY*scale*2, scale*img.width*dir, scale*img.height), undefined, new cropMatrix(cx, cy, 40/img.width, 54/img.height), true);
    if (light == 0 || xray) {return;}
    ctx.filter = `brightness(0%) opacity(${light}%)`;
    drawAdvImage(ctx, img, new moveMatrix(x, y - pixleOffsetY*scale*2, scale*img.width*dir, scale*img.height), undefined, new cropMatrix(cx, cy, 40/img.width, 54/img.height), true);
    ctx.filter = 'none';
} 