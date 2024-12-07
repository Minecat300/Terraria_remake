const cam = {
    x: 0,
    y: 0,
    zoom: 2
}

const player = {
    pos: {x: 0, y: 0},
    speed: {x: 0, y: 0},
    axis: {x: 0, y: 0}
}

function updatePlayerMain() {
    getInputAxis();

    player.speed.x += 7 * player.axis.x;
    player.speed.y += 7 * player.axis.y;

    player.speed.x *= 0.7;
    player.speed.y *= 0.7;

    player.pos.x += player.speed.x;
    player.pos.y += player.speed.y;

    cam.x = player.pos.x;
    cam.y = player.pos.y;
    limitCamera();
} 

function getInputAxis() {
    const left = keyPress.a || keyPress.leftArrow;
    const right = keyPress.d || keyPress.rightArrow;
    const up = keyPress.w || keyPress.upArrow || keyPress.space;
    const down = keyPress.s || keyPress.downArrow;

    player.axis.x = right - left;
    player.axis.y = up - down;
}

function limitCamera() {
    if (cam.x < viewspaceWidth/cam.zoom/2) {
        cam.x = viewspaceWidth/cam.zoom/2;
    }
    if (cam.y < viewspaceHeight/cam.zoom/2 + 16) {
        cam.y = viewspaceHeight/cam.zoom/2 + 16;
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