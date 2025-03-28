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
let tilesheetData;

self.onmessage = function (e) {

    if (e.data.tilesheet) {
        tilesheet = e.data.tilesheet;
        WtileData = e.data.tileData;
        tilesheetData = e.data.tilesheetData;
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
            let [tileAssetX, tileAssetY] = unpackSignedXY(tileOffsetID);
            const tileConfig = WtileData[tileID];
            const tileCostomeEnd = tileConfig?.endIDX ?? {x: 15, y: 14};
            const tileAssetSize = tileConfig?.tileAssetSize || { width: tileTrueSize, height: tileTrueSize };
            const tileAssetOffsetX = tileAssetSize?.offsetX ?? 0;
            const tileAssetOffsetY = tileAssetSize?.offsetY ?? 0;
            const tilesheetOffset = tilesheetData?.[tileID] ?? 0;
            let offsetX = 0;
            let offsetY = 0;
            if ((tileConfig?.treeType ?? "none") != "none") {
                if (tileConfig?.treeType == "top") {
                    const offsetParameter = Math.floor(tileAssetX / (tileCostomeEnd.x+1));
                    switch (offsetParameter) {
                        case 1:
                            offsetX = 32;
                            break;
                        case 2:
                            offsetX = -32;
                            break;
                        case 3:
                            offsetX = 32;
                            offsetY = 64;
                            break;
                        case 4:
                            offsetX = -32;
                            offsetY = 64;
                            break;
                    }
                }
                if (tileConfig?.treeType == "branch") {
                    const offsetParameter = Math.floor(tileAssetX / (tileCostomeEnd.x+1));

                    if (offsetParameter == 1) {
                        offsetX = 16;
                        offsetY = 16
                    }
                    if (offsetParameter == 2) {
                        offsetX = 16;
                        offsetY = -16;
                    }

                    if (tileAssetX % (tileCostomeEnd.x+1) == 1) {
                        offsetX = 24 - offsetX;
                    }
                }
            }

            tileAssetX = tileAssetX % (tileCostomeEnd.x+1);
            tileAssetY = tileAssetY % (tileCostomeEnd.y+1);

            self.ctx.drawImage(
                tilesheet,
                (tileAssetX + tileConfig.startIDX.x) * (tileAssetSize.width + tileSpaceing), (tileAssetY + tileConfig.startIDX.y) * (tileAssetSize.height + tileSpaceing) + tilesheetOffset,
                tileAssetSize.width, tileAssetSize.height,
                x * tileSize - tileAssetSize.width/2 + 8 + tilePadding + tileAssetOffsetX + offsetX, y * tileSize - tileAssetSize.height/2 + 8 + tilePadding + tileAssetOffsetY +  offsetY,
                tileAssetSize.width, tileAssetSize.height
            );

        }
    }
    self.canvas.convertToBlob().then((blob) => {
        self.postMessage({ frame: blob, data: data });
    });
}