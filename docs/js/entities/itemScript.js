function mainTick(entityObject, entityNumber) {
    const motion = entityObject.motion;
    const image = entityObject.image;
    const data = entityObject.data;

    if ((data?.itemId ?? "none") == "none") {deleteEntity(entityNumber); return;}

    const itemId = data.itemId;

    if (entityItemAmount > maxEntityItems && !(data?.firstRun ?? false)) {
        deleteEntity(entityNumber);
        entityItemAmount--;
        return;
    }

    if (data?.firstRun ?? false) {
        data.firstRun = false;

        entityItemAmount++; 

        const srcBase = itemImages[itemId].base;
        const srcData = itemImages[itemId].entityData;

        image.bitmap = { ...image.bitmap };
        image.bitmap.data = srcData;
        image.bitmap.base = srcBase;

        image.data = { ...image.data };   
        image.data.renderWidth = srcBase.width;
        image.data.renderHeight = srcBase.height;
        image.data.imageSubWidth = srcBase.width;
        image.data.imageSubHeight = srcBase.height;
        image.data.offsetY = srcBase.height / 2;
    }

    const dx = motion.x - player.pos.x;
    const dy = motion.y - player.pos.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist <= 42) {
        const dir = pointTowards(player.pos.x, player.pos.y, motion.x, motion.y);
        motion.speedX += sin(dir)*0.5;
        motion.speedY += cos(dir)*0.5;
        moveEntityX(entityObject, false);
        moveEntityY(entityObject, false, 0);
        if (dist <= 25) {
            loadAudio("audio/entities/Grab.wav").then(audio => {
                playSoundAsync(audio);
            });
            giveItem(new item(data.itemId, data?.itemAmount ?? 1), "inventory");
            deleteEntity(entityNumber);
            entityItemAmount--;
            return;
        }
    } else {
        motion.speedX = 0.9 * motion.speedX;
        moveEntityX(entityObject);
        moveEntityY(entityObject);
    }
}

export {mainTick};