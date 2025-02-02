function drawInventory() {
    uiOveride = false;
    if (inventoryOpen) {
        drawOpenInventory();
    } else {
        drawClosedInventory();
    }
}

function drawClosedInventory() {
    if (cursorSlot.item().id != 0) {
        giveItem(cursorSlot.item(), "inventory");
        cursorSlot.set(new item(0, 0));
    }

    selectedSlot.id = selectedHotbar;
    selectedSlot.container = "hotbar";

    for (let x = 0; x < inventory.hotbar.length; x++) {
        let tx = x*uiSize*72 + 55*uiSize;
        let ty = 55*uiSize;

        if (selectedHotbar < x) {
            tx += 10*uiSize;
        }

        if (selectedHotbar == x) {
            tx += 5*uiSize;
            drawAdvImage(ctx, inventoryGuiImages.slot3, new moveMatrix(tx, ty, uiSize*75, undefined));
        } else {
            drawAdvImage(ctx, inventoryGuiImages.slot2, new moveMatrix(tx, ty, uiSize*65, undefined));
        }

        drawItem(tx, ty, inventory.hotbar[x], 1 + (selectedHotbar == x)*0.15384615385);
        drawOnlyText([x+1].toString().at([x+1].toString().length-1), tx - uiSize*21, ty - uiSize*14, uiSize*20*(1 + (selectedHotbar == x)*0.15384615385), "left", "lightgray", "black");
    }
    drawItem(mouseX + uiSize*30, mouseY + uiSize*30, selectedSlot.item(), 1);
}

function drawOpenInventory() {
    selectedSlot.id = cursorSlot.id;
    selectedSlot.container = cursorSlot.container;

    if (cursorSlot.item().id == 0) {
        selectedSlot.id = selectedHotbar;
        selectedSlot.container = "hotbar";
    }

    for (let x = 0; x < inventory.hotbar.length; x++) {
        const tx = x*uiSize*72 + 55*uiSize;
        const ty = 55*uiSize;

        slotTick(tx, ty, new slot(x, "hotbar"));

        drawAdvImage(ctx, inventoryGuiImages.slot2, new moveMatrix(tx, ty, uiSize*65, undefined));
        drawItem(tx, ty, inventory.hotbar[x], 1);
        if (selectedHotbar == x) {
            drawOnlyText([x+1].toString().at([x+1].toString().length-1), tx - uiSize*21, ty - uiSize*16, uiSize*21, "left", "white", "black");
        } else {
            drawOnlyText([x+1].toString().at([x+1].toString().length-1), tx - uiSize*21, ty - uiSize*14, uiSize*20, "left", "lightgray", "black");
        }
    }
    for (let x = 0; x < inventory.hotbar.length; x++) {
        for (let y = 0; y < inventory.main.length/inventory.hotbar.length; y++) {
            const tx = x*uiSize*72 + 55*uiSize;
            const ty = (y+1)*uiSize*72 + 55*uiSize;

            slotTick(tx, ty, new slot(x + (3-y)*10, "main"));

            drawAdvImage(ctx, inventoryGuiImages.slot1, new moveMatrix(tx, ty, uiSize*65, undefined));
            drawItem(tx, ty, inventory.main[x + (3-y)*10], 1);            
        }
    }
    drawItem(mouseX + uiSize*30, mouseY + uiSize*30, cursorSlot.item(), 1);
}

function drawItem(x, y, item, scale) {
    if (item.id == 0) {return;}
    drawAdvImage(ctx, itemImages[item.id], new moveMatrix(x, y, uiSize*itemImages[item.id].width*1.3*scale, undefined));
    if (item.amount <= 1) {return;}
    drawOnlyText(item.amount, x - uiSize*17*scale, y + uiSize*20*scale, scale*uiSize*(24 - Math.max(0, item.amount.toString().length-2)*2), "left", "white", "black");
}

function slotTick(x, y, currentSlot) {
    if (!mouseDown) {m.m1 = true;}

    const tx = mouseX - x;
    const ty = mouseY - y;
    const dist = Math.sqrt(tx*tx + ty*ty);

    if (dist > 31*uiSize) {return;}
    uiOveride = true;
    if (!mouseDown || !m.m1) {return;}
    if (cursorSlot.item().id == 0 && currentSlot.item().id == 0) {return;}

    m.m1 = false;

    if (keyPress.shift) {
        if (currentSlot.item().id == 0) {return;}
        return;
    }

    if (currentSlot.item().id == 0) {
        currentSlot.set(cursorSlot.item());
        cursorSlot.set(new item(0, 0));
        return;
    }

    if (cursorSlot.item().id == 0) {
        cursorSlot.set(currentSlot.item());
        currentSlot.set(new item(0, 0));
        return;
    }

    if (cursorSlot.item().id == currentSlot.item().id) {
        const id = cursorSlot.item().id;
        if (currentSlot.item().amount >= itemData[id].stack) {return;}
        if (currentSlot.item().amount + cursorSlot.item().amount > itemData[id].stack) {
            cursorSlot.setAmount((currentSlot.item().amount + cursorSlot.item().amount) - itemData[id].stack);
            currentSlot.setAmount(itemData[id].stack);
            return;
        }
        currentSlot.setAmount(currentSlot.item().amount + cursorSlot.item().amount);
        cursorSlot.set(new item(0, 0));
        return;
    }

    const tmp = currentSlot.item();
    currentSlot.set(cursorSlot.item());
    cursorSlot.set(tmp);
}

function giveItem(tItem, container) {
    if (tItem.id == 0) {return;}
    
    let amount = tItem.amount;
    if (container == "inventory") {
        amount = giveToExistingItem(amount, tItem, "hotbar");
        if (amount <= 0) {return;}
        amount = giveToExistingItem(amount, tItem, "main");
        if (amount <= 0) {return;}
        amount = giveItemToEmptySlot(amount, tItem, "hotbar");
        if (amount <= 0) {return;}
        amount = giveItemToEmptySlot(amount, tItem, "main");
        if (amount <= 0) {return;}
    } else {
        amount = giveToExistingItem(amount, tItem, container);
        if (amount <= 0) {return;}
        amount = giveItemToEmptySlot(amount, tItem, container);
        if (amount <= 0) {return;}
    }
    window.alert("your inventory is full. please make some space because in this version all items gets deleted when added to full inventory.")
}

function removeItemFromInventory(tItem) {
    let amount = tItem.amount;
    for (let i = 0; i < inventory["hotbar"].length; i++) {
        const tmpSlot = new slot(i, "hotbar");
        if (tmpSlot.item().id != tItem.id) {continue;}

        if (tmpSlot.item().amount == amount) {
            tmpSlot.set(new item(0, 0));
            return true;
        }
        if (tmpSlot.item().amount < amount) {
            tmpSlot.setAmount(tmpSlot.item().amount - amount);
            return true;
        }
        amount -= tmpSlot.item().amount;
        tmpSlot.set(new item(0, 0));
    }
    for (let i = 0; i < inventory["main"].length; i++) {
        const tmpSlot = new slot(i, "main");
        if (tmpSlot.item().id != tItem.id) {continue;}

        if (tmpSlot.item().amount == amount) {
            tmpSlot.set(new item(0, 0));
            return true;
        }
        if (tmpSlot.item().amount < amount) {
            tmpSlot.setAmount(tmpSlot.item().amount - amount);
            return true;
        }
        amount -= tmpSlot.item().amount;
        tmpSlot.set(new item(0, 0));
    }
    return false;
}

function giveItemToEmptySlot(amount, tItem, container) {
    for (let i = 0; i < inventory[container].length; i++) {
        const tmpSlot = new slot(i, container);
        if (tmpSlot.item().id != 0) {continue;}

        if (amount > itemData[tItem.id].stack) {
            tmpSlot.set(new item(tItem.id, itemData[tItem.id].stack));
            amount -= itemData[tItem.id].stack;
            continue;
        }
        tmpSlot.set(new item(tItem.id, amount));
        return 0;
    }
    return amount;
}

function giveToExistingItem(amount, tItem, container) {
    for (let i = 0; i < inventory[container].length; i++) {
        const tmpSlot = new slot(i, container);
        if (tmpSlot.item().id != tItem.id) {continue;}
        if (tmpSlot.item().amount >= itemData[tItem.id].stack) {continue;}

        if (tmpSlot.item().amount + amount > itemData[tItem.id].stack) {
            amount -= itemData[tItem.id].stack - tmpSlot.item().amount;
            tmpSlot.setAmount(itemData[tItem.id].stack);
            continue;
        }
        
        tmpSlot.setAmount(tmpSlot.item().amount + amount);
        return 0;
    }
    return amount;
}

class item {
    constructor(id, amount) {
        this.id = id;
        this.amount = amount;
    }
    
    add(amount = 1) {
        this.amount += amount;
        if (this.amount < 1) {
            this.id = 0;
            this.amount = 0;
        }
    }
}

class slot {
    constructor(id, container) {
        this.id = id;
        this.container = container;
    }

    set(item) {
        inventory[this.container][this.id] = item;
    }

    setAmount(amount) {
        inventory[this.container][this.id].amount = amount;
    }

    setId(id) {
        inventory[this.container][this.id].id = id;
    }

    item() {
        return inventory[this.container][this.id];
    }
}

async function loadInventoryGuiImages() {
    inventoryGuiImages.slot1 = await loadImage('images/gui/Inventory_Back.png');
    inventoryGuiImages.slot2 = await loadImage('images/gui/Inventory_Back9.png');
    inventoryGuiImages.slot3 = await loadImage('images/gui/Inventory_Back14.png');
    inventoryGuiImages.radial = await loadImage('images/gui/Radial.png');
    inventoryGuiImages.selection = await loadImage('images/gui/selection.png');
}

async function loadItemImages() {
    for (let id in itemData) {
        let item = itemData[id];
        if ((item?.image ?? 'none') == 'none') {continue;}
        itemImages[id] = await loadImage('images/items/' + item.image);
    }
}

let inventoryOpen = false;

let uiSize = 0.9;

let inventoryGuiImages = {};
let itemImages = {};

let itemData;

let uiOveride = false;

loadInventoryGuiImages();

let inventory = {
    hotbar: new Array(10),
    main: new Array(40),
    cursor: new Array(1)
};

for (key in inventory) {
    inventory[key].fill(new item(0, 0));
}

let selectedHotbar = 0;
let selectedSlot = new slot(selectedHotbar, "hotbar");

const cursorSlot = new slot(0, "cursor");

new slot(0, "hotbar").set(new item(1, 1));
new slot(1, "hotbar").set(new item(2, 200));
new slot(2, "hotbar").set(new item(3, 124));
new slot(3, "hotbar").set(new item(11, 1254));
new slot(4, "hotbar").set(new item(12, 9999));
new slot(0, "main").set(new item(2, 5));