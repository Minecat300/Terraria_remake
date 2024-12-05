function unpackSignedXY(value) {
    if (value < 0 || value > 65535) {
      throw new Error("Value must be in the range 0-65535.");
    }
  
    const xOffset = value & 0xFF;        
    const yOffset = (value >> 8) & 0xFF;
  
    const x = xOffset - 128; 
    const y = yOffset - 128;
  
    return [x, y];
}

let tilesheet;
let WtileData;

self.onmessage = function (e) {

    if (e.data.tilesheet) {
        tilesheet = e.data.tilesheet;
        WtileData = e.data.tileData;
        return;
    }

    const { viewportTiles, viewportTilesOffset, tileSize, cam } = e.data;
    const tiles = new Uint16Array(viewportTiles.data);
    const tilesOffset = new Uint16Array(viewportTilesOffset)
    const viewportWidth = viewportTiles.width;
    const viewportHeight = viewportTiles.height;

    if (!self.canvas) {
        self.canvas = new OffscreenCanvas(viewportWidth * tileSize, viewportHeight * tileSize);
        self.ctx = self.canvas.getContext("2d");
        self.ctx.imageSmoothingEnabled = false;
    }

    self.ctx.clearRect(0, 0, self.canvas.width, self.canvas.height);

    for (let y = 0; y < viewportHeight; y++) {
        for (let x = 0; x < viewportWidth; x++) {
            const tileIDX = x + viewportWidth * (viewportHeight - y - 1);
            const tileID = tiles[tileIDX];
            if (tileID === 0) continue;
            const tileOffsetID = tilesOffset[tileIDX];
            const [tileAssetX, tileAssetY] = unpackSignedXY(tileOffsetID);
            const tileConfig = WtileData[tileID];
            const tileAssetSize = tileConfig?.tileAssetSize || { width: tileSize, height: tileSize };

            self.ctx.drawImage(
                tilesheet,
                (tileAssetX + tileConfig.startIDX.x) * (tileSize + 2), (tileAssetY + tileConfig.startIDX.y) * (tileSize + 2),
                tileAssetSize.width, tileAssetSize.height,
                x * tileSize - tileAssetSize.width/2 + 8, y * tileSize - tileAssetSize.height/2 + 8,
                tileAssetSize.width, tileAssetSize.height
            );

        }
    }
    self.canvas.convertToBlob().then((blob) => {
        self.postMessage({ frame: blob, cam: cam });
    });
}