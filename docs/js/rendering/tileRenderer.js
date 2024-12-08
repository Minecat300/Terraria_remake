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

    const { viewportTiles, viewportTilesOffset, tileSizeObj, data } = e.data;

    const tileSize = tileSizeObj.tilesheetSize;
    const tileTrueSize = tileSizeObj.tileTrueSize;
    const tilePadding = tileSizeObj.tilePadding;
    const tileSpaceing = tileSizeObj.tileSpaceing;

    const tiles = new Uint16Array(viewportTiles.data);
    const tilesOffset = new Uint16Array(viewportTilesOffset)
    const viewportWidth = viewportTiles.width;
    const viewportHeight = viewportTiles.height;

    if (!self.canvas) {
        self.canvas = new OffscreenCanvas(viewportWidth * tileSize + tilePadding*2, viewportHeight * tileSize + tilePadding*2);
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
            const tileAssetSize = tileConfig?.tileAssetSize || { width: tileTrueSize, height: tileTrueSize };

            self.ctx.drawImage(
                tilesheet,
                (tileAssetX + tileConfig.startIDX.x) * (tileTrueSize + tileSpaceing), (tileAssetY + tileConfig.startIDX.y) * (tileTrueSize + tileSpaceing),
                tileAssetSize.width, tileAssetSize.height,
                x * tileSize - tileAssetSize.width/2 + 8 + tilePadding, y * tileSize - tileAssetSize.height/2 + 8 + tilePadding,
                tileAssetSize.width, tileAssetSize.height
            );

        }
    }
    self.canvas.convertToBlob().then((blob) => {
        self.postMessage({ frame: blob, data: data });
    });
}