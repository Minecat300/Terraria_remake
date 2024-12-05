const TPU = 1000/60;
const TPF = 1000/60;
let frames = 0;
let updates = 0;
let d = new Date();
let previousTime = d.getTime();
let currentTime = 0;
let timeElapsed = 0;
let deltaUpdates = 0;
let deltaFrames = 0;
let deltaChecks = 0;

const gameLoop = async () => {
    await sleep(50);
    while (true) {    
        d = new Date();
        currentTime = d.getTime();
        time = currentTime;
        timeElapsed = currentTime - previousTime;
        deltaUpdates += timeElapsed / TPU;
        deltaFrames += timeElapsed / TPF;
        deltaChecks += timeElapsed / 1000;
        previousTime = currentTime;

        if (deltaUpdates >= 1) {
            deltaUpdates--;
            updates++;
        }
        if (deltaFrames >= 1) {
            renderMain();
            deltaFrames--;
            frames++;
        }
        if (deltaChecks >= 1) {
            console.log("FPS: " + frames + "\nUPS: " + updates);
            updates = 0;
            frames = 0;
            deltaChecks--;
        }
        await sleep(1);
    }
}

