const TPF = 1000 / 60;
let frames = 0;
let updates = 0;
let d = new Date();
let previousTime = d.getTime();
let currentTime = 0;
let timeElapsed = 0;
let deltaChecks = 0;
let FPS = 0;
let UPS = 0;

const gameLoop = async () => {
    await sleep(50);
    d = new Date();
    previousTime = d.getTime();

    while (true) {
        d = new Date();
        if (document.hidden) {
            await waitUntil(() => !document.hidden);
            d = new Date();
            previousTime = d.getTime();
        }

        currentTime = d.getTime();
        timeElapsed = currentTime - previousTime;
        deltaChecks += timeElapsed / 1000;
        previousTime = currentTime;

        const frameStart = Date.now();
        updateMain();
        renderMain();
        updates++;
        frames++;
        const frameTime = Date.now() - frameStart;

        if (deltaChecks >= 1) {
            FPS = frames;
            UPS = updates;
            frames = 0;
            updates = 0;
            deltaChecks--;
        }

        const delay = Math.max(0, TPF - frameTime);
        await sleep(delay);
    }
}
