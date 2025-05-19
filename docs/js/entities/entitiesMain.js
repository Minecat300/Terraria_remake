let entityData = {};
let entityScripts = {};
let entityImages = {};

let entities = [];

let spawnRate = 0;
let maxSpawn = 0;
let currentActiveEntities = 0;

let naturalSpawnDisable = false;
let entityI = 0;

class entity {
    constructor(id, motion, data = {}) {
        this.id = id;
        this.motion = motion;
        this.data = Object.assign({}, {despawnTimer: 750}, data, entityData[id]?.behaviorData ?? {});
        this.image = {
            bitmap: entityImages[id],
            data: entityData[id].imageData,
            selectedImage: 0
        };
    }
}

class entityMotion {
    constructor(x, y, speedX = 0, speedY = 0, rotation = 0, centerX = 0.5, centerY = 0.5, rotationSpeed = 0, falling = 99) {
        this.x = x;
        this.y = y;
        this.speedX = speedX;
        this.speedY = speedY;
        this.rotation = rotation;
        this.centerX = centerX;
        this.centerY = centerY;
        this.rotationSpeed = rotationSpeed;
        this.falling = falling;
        this.solid;
    }
}

function moveEntityX(entityObject, collision = true) {
    const motion = entityObject.motion;
    motion.x += motion.speedX;
    if (collision) {
        fixEntityCollisionInDir(entityObject, motion.speedX, 0);
        if (motion.solid > 0) {
            motion.speedX = 0;
        }
    }
}

function moveEntityY(entityObject, collision = true, gravityMul = 1) {
    const motion = entityObject.motion;
    motion.y += motion.speedY;
    motion.speedY += gravity*gravityMul;
    if (gravityMul != 0 && motion.speedY < -10) {
        motion.speedY = -10;
    }
    if (collision) {
        fixEntityCollisionInDir(entityObject, 0, motion.speedY);
        motion.falling++;
        if (motion.solid > 0) {
            if (motion.speedY < 0) {
                motion.falling = 0;
            }
            motion.speedY = 0;
        }
    }
}

function fixEntityCollisionInDir(entityObject, dx, dy) {
    const motion = entityObject.motion;
    const width = entityData[entityObject.id].collisionData.width;
    const height = entityData[entityObject.id].collisionData.height;

    motion.solid = 0;
    for (let i = 0; i < 2; i++) {
        let di = 1;
        let y = -height/2;
        for (let iy = 0; iy < Math.ceil(height/16)+1; iy++) {
            let x = width/2 + tiny;
            for (let ix = 0; ix < Math.ceil(width/16)+1; ix++) {
                fixEntityCollisionAtPoint(entityObject, motion.x + x, motion.y + y, 2*(di == 2)+1*(di == 1), dx, dy);
                x -= width/Math.ceil(width/16);
            }
            y += height/Math.ceil(height/16);
            di++;
        }
        if (motion.solid < 1) {
            return;
        }
    }
}

function fixEntityCollisionAtPoint(entityObject, x, y, part, dx, dy) {
    const motion = entityObject.motion;

    const tile = getTile(x, y);
    const tileConfig = tileData[tile];
    const collisionState = tileConfig?.collisionState ?? "none";
    if (collisionState == "passThrough" || collisionState == "none") {return;}

    const modX = x % 16;
    const modY = y % 16;

    if (collisionState == "platform") {
        if (dx != 0) {return;}
        if (part != 1 || modY - dy < 15) {return;}
        if (false && motion.falling < 5) {return;}
    }
    motion.solid = 10;
    if (dy < 0) {
        motion.y += 16 - modY;
    }
    if (dx < 0) {
        motion.x += 16 - modX;
    }
    if (dy > 0) {
        motion.y += tiny - modY;
    }
    if (dx > 0) {
        motion.x += tiny - modX;
    }
}

function checkForEntityCollision(entityObject, dx, dy) {
    const motion = entityObject.motion;
    const width = entityData[entityObject.id].collisionData.width;
    const height = entityData[entityObject.id].collisionData.height;

    motion.solid = 0;
    for (let i = 0; i < 2; i++) {
        let y = -height/2;
        for (let iy = 0; iy < Math.ceil(height/16)+1; iy++) {
            let x = width/2 + tiny;
            for (let ix = 0; ix < Math.ceil(width/16)+1; ix++) {
                if (checkForEntityCollisionAtPoint(motion.x + dx + x, motion.y + dy + y)) {
                    return true;
                }
                x -= width/Math.ceil(width/16);
            }
            y += height/Math.ceil(height/16);
        }
    }
    return false;
}

function checkForEntityCollisionAtPoint(x, y) {
    const tile = getTile(x, y);
    const tileConfig = tileData[tile];
    const collisionState = tileConfig?.collisionState ?? "none";
    if (collisionState == "solid") {
        return true;
    }
    return false;
}

function updateEntities() {
    spawnEntities();
    entityI = 0;
    for (let i = 0; i < entities.length; i++) {
        const entityObject = entities[entityI];
        const behaviorScript = entityData[entityObject.id]?.behaviorScript ?? "defaultIdleScript.js";
        entityScripts[behaviorScript].mainTick(entityObject, entityI);
        entityI++;
    }
}

function handleEntityDespawning(entityObject, entityNumber, x, y) {
    const data = entityObject.data;
    if (!isXYIn(x, y, 504 * 16, 283.5 * 16, player.pos.x, player.pos.y)) {
        deleteEntity(entityNumber);
        return true;
    }
    if (!isXYIn(x, y, 120 * 16, 67.5 * 16, player.pos.x, player.pos.y)) {
        if (data.despawnTimer <= 0) {
            deleteEntity(entityNumber);
            return true;
        }
        data.despawnTimer--;
    } else {
        data.despawnTimer = 750;
    }
    return false;
}

function spawnEntity(entityObject) {
    const spawnCondition = entityData[entityObject.id].spawnCondition ?? {};
    const activeEntityValue = spawnCondition?.activeEntityValue ?? 0;
    if (activeEntityValue != 0) {
        if (currentActiveEntities >= maxSpawn) {return;}
        currentActiveEntities += activeEntityValue;
    }
    entities.push(entityObject);
}

function deleteEntity(entityNumber) {
    const spawnCondition = entityData[entities[entityNumber].id].spawnCondition ?? {};
    const activeEntityValue = spawnCondition?.activeEntityValue ?? 0;
    if (activeEntityValue != 0) {
        if (maxSpawn > 0) {
            currentActiveEntities -= activeEntityValue;
        }
    }
    entities.splice(entityNumber, 1);
    entityI--;
}

function isXYIn(x, y, width, height, cx = 0, cy = 0) {
    if (x < cx - width/2) {
        return false;
    }
    if (x > cx + width/2) {
        return false;
    }
    if (y < cy - height/2) {
        return false;
    }
    if (y > cy + height/2) {
        return false;
    }
    return true;
}

function spawnEntities() {
    if (naturalSpawnDisable) {return;}

    getSpawnrates();

    if (randomNumber(1, spawnRate) != 1) {return;}

    const orginTileIdx = getIDX(getGridPos(player.pos.x - player.size.width), getGridPos(player.pos.y + player.size.height));
    
    for (let i = 0; i < 50; i++) {
        const x = randomNumber(-84, 83);
        const y = randomNumber(-45, 46);
        let idx = getIDX(x, y);

        let collisionState = tileData[tileGrid[orginTileIdx + idx]]?.collisionState ?? "none";
        if (collisionState == "solid" || collisionState == "platform") {continue;}

        let safeWall = tileData[wallGrid[orginTileIdx + idx]]?.safeWall ?? false;
        if (safeWall) {continue;}

        let tileHeight = 0;
        for (let i2 = 0; i2 < 45 + y; i2++) {
            collisionState = tileData[tileGrid[orginTileIdx + idx + getIDX(0, -1-i2)]]?.collisionState ?? "none";
            if (collisionState == "solid" || collisionState == "platform") {
                tileHeight = -1-i2;
                break;
            }
        }
        if (tileHeight == 0) {continue;}

        if (x >= -62) {
            if (x <= 61) {
                if (y + tileHeight >= -33) {
                    if (y + tileHeight <= 34) {
                        continue;
                    }
                }
            }
        }

        const correctedX = x*16+player.size.width;
        const correctedY = y*16-player.size.height;

        if (correctedX >= -1044) {
            if (correctedX <= 1044) {
                if (correctedY >= -574) {
                    if (correctedY <= 574) {
                        return;
                    }
                }
            }
        }

        idx += tileHeight*worldWidth + orginTileIdx;
        let solid = 0;
        for (let x2 = 0; x2 < 2; x2++) {
            for  (let y2 = 0; y2 < 3; y2++) {
                const idx2 = getIDX(-x2, y2+1);
                collisionState = tileData[tileGrid[idx + idx2]]?.collisionState ?? "none";
                if (collisionState == "solid" || collisionState == "platform") {
                    solid = 1;
                    break;
                }
            }
        }
        if (solid == 1) {continue;}

        spawnApropriateEntity(idx);
        return;
    }
}

function spawnApropriateEntity(idx) {
    let applicableEntities = [];

    for (let key in entityData) {
        const value = entityData[key];
        const spawnCondition = value?.spawnCondition ?? {};

        if (!(spawnCondition?.naturalSpawn ?? false)) {continue;}

        const spawnLevel = spawnCondition?.spawnLevel ?? [];
        let spawnClearance = 0;

        if (spawnLevel.includes("surface")) {
            spawnClearance++;
        }
        if (spawnLevel.includes("underground")) {
            spawnClearance++;
        }
        if (spawnLevel.includes("cavern")) {
            spawnClearance++;
        }
        if (spawnLevel.includes("underworld")) {
            spawnClearance++;
        }
        if (spawnClearance == 0) {continue;}
        applicableEntities.push(Number(key));
    }

    if (applicableEntities.length == 0) {return;}

    const selectedEntity = applicableEntities[randomNumber(0, applicableEntities.length-1)];
    const entityWidth = entityData[selectedEntity].collisionData.width;
    const entityHeight = entityData[selectedEntity].collisionData.height;
    let [x, y] = getXY(idx);
    x = x*16-8;
    y = y*16+entityHeight/2;

    const spawnCondition = entityData[selectedEntity].spawnCondition ?? {};
    const activeEntityValue = spawnCondition?.activeEntityValue ?? 0;
    if (activeEntityValue != 0) {
        if (currentActiveEntities >= maxSpawn) {return;}
        currentActiveEntities += activeEntityValue;
    }

    entities.push(new entity(selectedEntity, new entityMotion(x, y)));
}

function getSpawnrates() {
    if (player.pos.y > worldUndergroundHeight*16) {
        spawnRate = 600;
        maxSpawn = 5;
    }
    if (player.pos.y < worldUndergroundHeight*16) {
        spawnRate = 300;
        maxSpawn = 8;
    }
    if (player.pos.y < worldCavernHeight*16) {
        spawnRate = 240;
        maxSpawn = 9;
    }
    if (player.pos.y < worldUnderworldHeight*16) {
        spawnRate = 600;
        maxSpawn = 10;
    }
    
    const entitySaturation = currentActiveEntities / maxSpawn;

    if (entitySaturation < 0.2) {
        spawnRate = Math.floor(spawnRate*0.6);
    }
    if (entitySaturation >= 0.2 && entitySaturation < 0.4) {
        spawnRate = Math.floor(spawnRate*0.7);
    }
    if (entitySaturation >= 0.4 && entitySaturation < 0.6) {
        spawnRate = Math.floor(spawnRate*0.8);
    } 
    if (entitySaturation >= 0.6 && entitySaturation < 0.8) {
        spawnRate = Math.floor(spawnRate*0.9);
    }
}

function drawEntities() {
    for (let i = 0; i < entities.length; i++) {
        const entityObject = entities[i];
        if (!isEntityInViewspace(entityObject.motion, entityObject.image)) {continue;}
        const motion = entityObject.motion;
        const image = entityObject.image;
        const MM = new moveMatrix(viewspaceWidth/2 + (motion.x - cam.x + (image.data?.offsetX ?? 0))*cam.zoom, viewspaceHeight/2 - (motion.y - cam.y + (image.data?.offsetY ?? 0))*cam.zoom, image.data.renderWidth*cam.zoom * ((image.data?.flipImageX ?? false)*-2 + 1), image.data.renderHeight*cam.zoom * ((image.data?.flipImageY ?? false)*-2 + 1));
        const RM = new rotationMatrix(motion.rotation, motion.centerX, motion.centerY);
        const CM = new cropMatrix(0, (image.selectedImage*(image.data.imageSubHeight + image.data.padding))/image.bitmap.data.height, image.data.imageSubWidth/image.bitmap.data.width, image.data.imageSubHeight/image.bitmap.data.height);
        drawAdvImage(ctx, image.bitmap.data, MM, RM, CM, true);

        let light = getLight(getIDX(getGridPos(motion.x), getGridPos(motion.y)), {dayNight: dayNight});
        light = 100 - Math.min(100, light/120*100);
        if (light == 0 || xray) {continue;}

        ctx.filter = `brightness(0%) opacity(${light}%)`;
        drawAdvImage(ctx, image.bitmap.base, MM, RM, CM, true);
        ctx.filter = 'none';
    }
}

function isEntityInViewspace(motion, image) {
    if (motion.x - cam.x + image.data.renderWidth/2 < -viewspaceWidth/2/cam.zoom) {return false;}
    if (motion.x - cam.x - image.data.renderWidth/2 > viewspaceWidth/2/cam.zoom) {return false;}
    if (motion.y - cam.y + image.data.renderHeight/2 < -viewspaceHeight/2/cam.zoom) {return false;}
    if (motion.y - cam.y - image.data.renderHeight/2 > viewspaceHeight/2/cam.zoom) {return false;}
    return true;
}

async function loadEntityAssets() {
    await loadEntityScripts();
    await loadEntityImages();
}

async function loadEntityImages() {
    for (let key in entityData) {
        const value = entityData[key];
        const imageSheet = value?.imageSheet ?? "unknown.png";
        const imagePath = value?.imagePath ?? "images/entities/";
        const colorAdjust = value?.colorAdjust ?? {};
        const path = imagePath + imageSheet;
        entityImages[key] = {};
        entityImages[key].data = await loadAndColorAgjustImage(path, colorAdjust);
        entityImages[key].base = await loadImage(path);
        //downloadImagebitmap(entityImages[key].data, "testy.png")
    }
}

async function loadEntityScripts() {
    for (let key in entityData) {
        const value = entityData[key];
        const behaviorScript = value?.behaviorScript ?? "defaultIdleScript.js";
        if (entityScripts.hasOwnProperty(behaviorScript)) {continue;}
        const scriptPath = value?.scriptPath ?? "./";
        const path = scriptPath + behaviorScript;
        entityScripts[behaviorScript] = await import(path);
    }
}