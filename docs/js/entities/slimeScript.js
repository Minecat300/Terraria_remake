function mainTick(entityObject, entityNumber) {
    const motion = entityObject.motion;
    const image = entityObject.image;
    const data = entityObject.data;

    if (handleEntityDespawning(entityObject, entityNumber, motion.x, motion.y)) {
        return;
    }

    if (data?.firstRun ?? false) {
        data.firstRun = false;
        data.dir = (motion.x > player.pos.x)*-2 + 1;
        data.isJumping = false;
        data.frame = 0;
        data.jumpDelay = 20;
        data.turnCheck = 0;
    }

    if (data.isJumping) {
        motion.speedX = 2.5*data.dir;
    } else {
        motion.speedX = 0;
    }

    if (data.mode == 0) {
        passiveMode(entityObject);
    }
    if (data.mode == 1) {
        aggresiveMode(entityObject);
    }

    moveEntityX(entityObject);
    moveEntityY(entityObject);

}

function passiveMode(entityObject) {
    const motion = entityObject.motion;
    const data = entityObject.data;
    const image = entityObject.image;

    if (motion.y < worldUndergroundHeight*16 + 100) {data.mode = 1; return;}

    if (motion.falling < 1) {
        data.isJumping = false;
        if ((Math.floor(data.frame)/4) % data.jumpDelay == 0) {
            data.isJumping = true;
            data.jumpDelay = randomNumber(10, 25);
            motion.speedY = getJumpHeight(entityObject);
        }
        image.selectedImage = Math.floor(data.frame/25) % 2;
        data.frame++;
    }

    if (motion.falling > 1) {
        image.selectedImage = 1;
        if (checkForEntityCollision(entityObject, motion.speedX, 0)) {
            if (data.turnCheck > 3) {
                data.dir = -data.dir;
                data.turnCheck = -1;
            }
            if (data.turnCheck == 0) {
                data.turnCheck = 1;
            }
        } else {
            data.turnCheck = -1;
        }
    } else {
        motion.speedX = 0;
    }
}

function aggresiveMode(entityObject) {
    const motion = entityObject.motion;
    const data = entityObject.data;
    const image = entityObject.image;

    if (motion.falling < 1) {
        data.isJumping = false;
        data.dir = (motion.x > player.pos.x)*-2 + 1;
        if ((Math.floor(data.frame)/4) % data.jumpDelay == 0) {
            data.isJumping = true;
            data.jumpDelay = randomNumber(10, 20);
            motion.speedY = getJumpHeight(entityObject);
        }
        if (Math.floor(data.frame) % 10 == 0) {
            image.selectedImage = 1 - image.selectedImage;
        }
        data.frame++;
    }
    if (motion.falling > 2) {
        image.selectedImage = 1;
    } else {
        motion.speedX = 0;
    }
}

function getJumpHeight(entityObject) {
    const motion = entityObject.motion;
    const data = entityObject.data;

    const maxJumpHeight = data?.maxJumpHeight ?? 8;

    let jumpHeight;

    if (data.mode == 0) {
        jumpHeight = randomNumber(6.5, maxJumpHeight*1.5);
        if (data.turnCheck > 0) {
            jumpHeight = maxJumpHeight*1.5;
            data.turnCheck++;
        }
        if (data.turnCheck == -1) {
            data.turnCheck = 0;
        }
        return jumpHeight;
    }

    if (data.mode == 1) {
        const dx = motion.x - player.pos.x;
        const dy = motion.y - player.pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist > 50) {
            jumpHeight = maxJumpHeight*1.5;
        } else {
            jumpHeight = dist*0.1;
            if (jumpHeight > maxJumpHeight*1.5) {
                jumpHeight = maxJumpHeight*1.5;
            }
        }
        return jumpHeight;
    }
}

export {mainTick};