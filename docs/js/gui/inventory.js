function drawInventory() {
    for (let x = 0; x < inventory.hotbar.length; x++) {
        const tx = x*uiSize*72 + 55;
        const ty = 55;

        drawAdvImage(ctx, inventoryGuiImages.slot2, new moveMatrix(tx, ty, uiSize*65, undefined));
        drawItem(tx, ty, inventory.hotbar[x]);
        drawOnlyText([x+1].toString().at([x+1].toString().length-1), tx - uiSize*21, ty - uiSize*15, uiSize*20, "left", "lightgray", "black");
    }
    if (!inventoryOpen) {return;}
    for (let x = 0; x < inventory.hotbar.length; x++) {
        for (let y = 0; y < inventory.main.length/inventory.hotbar.length; y++) {
            const tx = x*uiSize*72 + 55;
            const ty = (y+1)*uiSize*72 + 55;

            drawAdvImage(ctx, inventoryGuiImages.slot1, new moveMatrix(tx, ty, uiSize*65, undefined));
            drawItem(tx, ty, inventory.main[x + (3-y)*10]);            
        }
    }
}

function drawItem(x, y, item) {
    if (item.id == 0) {return;}
    drawAdvImage(ctx, itemImages[item.id], new moveMatrix(x, y, uiSize*itemImages[item.id].width*1.3, undefined));
    if (item.amount <= 1) {return;}
    drawOnlyText(item.amount, x - uiSize*17, y + uiSize*20, uiSize*20, "left", "white", "black");
}

class item {
    constructor(id, amount) {
        this.id = id;
        this.amount = amount;
    }
    
    add(amount) {
        this.amount += amount;
        if (this.amount < 1) {
            this.id = 0;
            this.amount = 0;
        }
    }
}

async function loadInventoryGuiImages() {
    inventoryGuiImages.slot1 = await loadImage('images/gui/Inventory_Back.png');
    inventoryGuiImages.slot2 = await loadImage('images/gui/Inventory_Back9.png');
}

async function loadItemImages() {
    for (let id in itemData) {
        let item = itemData[id];
        if ((item?.image ?? 'none') == 'none') {continue;}
        itemImages[id] = await loadImage('images/items/' + item.image);
    }
}

let inventoryOpen = true;

let uiSize = 0.9;

let inventoryGuiImages = {};
let itemImages = {};

let itemData;

loadInventoryGuiImages();

let inventory = {
    hotbar: new Array(10),
    main: new Array(40)
};

for (key in inventory) {
    inventory[key].fill(new item(0, 0));
}

inventory.hotbar[0] = new item(1, 1);
inventory.hotbar[1] = new item(2, 200);
inventory.hotbar[2] = new item(3, 124);
inventory.hotbar[3] = new item(11, 1254);
inventory.hotbar[4] = new item(12, 9999);