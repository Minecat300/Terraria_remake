self.onmessage = function (e) {

    const viewportTiles = e.data.viewportTiles;

    const skyLightGrid = new Uint8Array(viewportTiles.skyData);
    const lightGrid = new Uint8Array(viewportTiles.data);
    const viewportWidth = viewportTiles.width;
    const viewportHeight = viewportTiles.height;

    const settings = e.data.settings;
    const data = e.data.data;

    if (!self.canvas) {
        self.canvas = new OffscreenCanvas(viewportWidth, viewportHeight);
        self.ctx = self.canvas.getContext("2d");
        self.ctx.imageSmoothingEnabled = false;
    }

    self.ctx.clearRect(0, 0, viewportWidth, viewportHeight);
    
    const imageData = self.ctx.createImageData(viewportWidth, viewportHeight);

    for (let y = 0; y < viewportHeight; y++) {
        for (let x = 0; x < viewportWidth; x++) {
            const ImgIndex = ((viewportHeight - y - 1) * viewportWidth + x) * 4;
            const index = y * viewportWidth + x

            imageData.data[ImgIndex] = 0;
            imageData.data[ImgIndex+1] = 0;
            imageData.data[ImgIndex+2] = 0;

            imageData.data[ImgIndex+3] = 255 - Math.min(255, Math.floor(Math.max(skyLightGrid[index] * settings.dayNight, lightGrid[index])/120*255));
        }
    }

    self.ctx.putImageData(imageData, 0, 0);

    self.canvas.convertToBlob().then((blob) => {
        self.postMessage({ frame: blob, data: data });
    });

}