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
} 

function getInputAxis() {
    const left = keyPress.a || keyPress.leftArrow;
    const right = keyPress.d || keyPress.rightArrow;
    const up = keyPress.w || keyPress.upArrow// || keyPress.space;
    const down = keyPress.s || keyPress.downArrow;

    player.axis.x = right - left;
    player.axis.y = up - down;
}