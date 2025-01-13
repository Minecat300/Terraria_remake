self.onmessage = function (e) {

    const viewportTiles = e.data.viewportTiles;

    const skyLightGrid = new Uint8Array(viewportTiles.skyData);
    const lightGrid = new Uint8Array(viewportTiles.data);
    const viewportWidth = viewportTiles.width;
    const viewportHeight = viewportTiles.height;

    const settings = e.data.settings;
    const data = e.data.data;

    const width = viewportWidth*settings.smoothing;
    const height = viewportHeight*settings.smoothing;

    if (!self.canvas) {
        self.canvas = new OffscreenCanvas(width, height);
        self.ctx = self.canvas.getContext("2d");
        self.ctx.imageSmoothingEnabled = false;
    }

    self.canvas.width = width;
    self.canvas.height = height;

    self.ctx.clearRect(0, 0, width, height);
    
    const imageData = self.ctx.createImageData(width, height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const ImgIndex = ((height - y - 1) * width + x) * 4;
            const tileY = Math.floor(y/settings.smoothing)+1;
            const tileX = Math.floor(x/settings.smoothing)+1;
            const subtileX = x % settings.smoothing;
            const subtileY = y % settings.smoothing;
            const index = (tileY) * (viewportWidth+2) + tileX;

            imageData.data[ImgIndex] = 0;
            imageData.data[ImgIndex+1] = 0;
            imageData.data[ImgIndex+2] = 0;

            imageData.data[ImgIndex+3] = getGhost(index, settings, subtileX, subtileY, viewportWidth+2);
        }
    }

    function getLight(idx, settings) {
        return  Math.floor(Math.max(skyLightGrid[idx] * settings.dayNight, lightGrid[idx]));
    }

    function getGhost(idx, settings, subtileX, subtileY, width) {
        let light = 0;
        if (settings.smoothing == 1) {
            light = getLight(idx, settings);
        } else if (settings.smoothing == 2) {
            light = get2x2Light(idx, settings, subtileX, subtileY, width);
        }
        return 255 - Math.min(light/120*255);
    }

    function get2x2Light(idx, settings, subtileX, subtileY, width) {
        const curLight = getLight(idx, settings);
        switch (subtileX + subtileY*2) {
            case 0:
                return (getLight(idx-1, settings) + getLight(idx-width, settings) + curLight*2)/4
            case 1:
                return (getLight(idx+1, settings) + getLight(idx-width, settings) + curLight*2)/4
            case 2:
                return (getLight(idx-1, settings) + getLight(idx+width, settings) + curLight*2)/4
            case 3:
                return (getLight(idx+1, settings) + getLight(idx+width, settings) + curLight*2)/4
        }
    }

    self.ctx.putImageData(imageData, 0, 0);

    self.canvas.convertToBlob().then((blob) => {
        self.postMessage({ frame: blob, data: data });
    });

}