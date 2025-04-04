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
    updateSelectedSlot();

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
    if (buildGuide.active) {
        if (selectedSlot.item().id == 0) {return;}
        const tx = uiSize*10 + itemImages[selectedSlot.item().id].width*0.65*uiSize;
        const ty = uiSize*10 + itemImages[selectedSlot.item().id].height*0.65*uiSize;
        drawItem(mouseX - tx, mouseY + ty, new item(selectedSlot.item().id, 1), 1);
    }
}

function drawOpenInventory() {
    selectedSlot.id = cursorSlot.id;
    selectedSlot.container = cursorSlot.container;

    if (cursorSlot.item().id == 0) {
        selectedSlot.id = selectedHotbar;
        selectedSlot.container = "hotbar";
    }
    updateSelectedSlot();

    getCraftableRecipes();

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
    drawCraftingUi();
    drawItem(mouseX - uiSize*23, mouseY + uiSize*30, cursorSlot.item(), 1);
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

function drawCraftingUi() {
    if (currentCraftableRecipes.length < 1) {return;}
    if (selectedRecipe > currentCraftableRecipes.length-1) {
        selectedRecipe = currentCraftableRecipes.length-1;
    }

    const tx = 65*uiSize;
    const ty = 700*uiSize;
    drawAdvImage(ctx, inventoryGuiImages.slot3, new moveMatrix(tx, ty, uiSize*65, undefined));
    drawItem(tx, ty, getCurrentRecipeItem(selectedRecipe), 1);

    for (let i = 1; i < getCurrentRecipe(selectedRecipe).recipe.length+1; i++) {
        const currRecipe = getCurrentRecipe(selectedRecipe).recipe[i-1];
        const tx2 = i*50*uiSize+10;
        drawAdvImage(ctx, inventoryGuiImages.slot4, new moveMatrix(tx+tx2, ty, uiSize*45, undefined));
        drawItem(tx+tx2, ty, new item(currRecipe.item, currRecipe.amount), 0.75);
    }

    for (let i = 1; i < 5+1; i++) {
        if (selectedRecipe+i >= currentCraftableRecipes.length) {break;}
        const ty2 = i*56*uiSize+6;
        drawAdvImage(ctx, inventoryGuiImages.slot4, new moveMatrix(tx, ty+ty2, uiSize*52, undefined));
        drawItem(tx, ty+ty2, getCurrentRecipeItem(selectedRecipe+i), 0.75);
    }
    for (let i = 1; i < 5+1; i++) {
        if (selectedRecipe-i < 0) {break;}
        const ty2 = i*-56*uiSize-6;
        drawAdvImage(ctx, inventoryGuiImages.slot4, new moveMatrix(tx, ty+ty2, uiSize*52, undefined));
        drawItem(tx, ty+ty2, getCurrentRecipeItem(selectedRecipe-i), 0.75);
    }

    if (!mouseDown) {
        m.m1 = true;
        craftingDelay.delay = 0;
        craftingDelay.next = 45;
        craftingDelay.speed = 30;
    }

    for (let i = 1; i < 5+1; i++) {
        if (selectedRecipe+i >= currentCraftableRecipes.length) {break;}
        const ty2 = i*56*uiSize+6;
        if (isMouseIn(tx-uiSize*26, tx+uiSize*26, ty+ty2-uiSize*26, ty+ty2+uiSize*26)) {
            if (mouseDown && m.m1) {
                m.m1 = false;
                selectedRecipe += i;
                break;
            }
        }
    }
    for (let i = 1; i < 5+1; i++) {
        if (selectedRecipe-i < 0) {break;}
        const ty2 = i*-56*uiSize-6;
        if (isMouseIn(tx-uiSize*26, tx+uiSize*26, ty+ty2-uiSize*26, ty+ty2+uiSize*26)) {
            if (mouseDown && m.m1) {
                m.m1 = false;
                selectedRecipe -= i;
                break;
            }
        }
    }

    if (isMouseIn(tx-uiSize*32.5, tx+uiSize*32.5, ty-uiSize*32.5, ty+uiSize*32.5)) {
        if (mouseDown && (cursorSlot.item().id == 0 || (cursorSlot.item().id == getCurrentRecipeItem(selectedRecipe).id && cursorSlot.item().amount <= itemData[getCurrentRecipeItem(selectedRecipe).id].stack-getCurrentRecipeItem(selectedRecipe).amount))) {
            if (craftingDelay.delay > craftingDelay.next) {
                craftingDelay.next += Math.ceil(craftingDelay.speed);
                craftingDelay.speed = craftingDelay.speed / 1.2;
                m.m1 = true;
            }
            craftingDelay.delay++;
            if (m.m1) {
                m.m1 = false;
                for (let i = 0; i < getCurrentRecipe(selectedRecipe).recipe.length; i++) {
                    const currRecipe = getCurrentRecipe(selectedRecipe).recipe[i];
                    removeItemFromInventory(new item(currRecipe.item, currRecipe.amount));
                }
                if (cursorSlot.item().id == 0) {
                    cursorSlot.set(new item(getCurrentRecipeItem(selectedRecipe).id, 0));
                }
                cursorSlot.addAmount(getCurrentRecipeItem(selectedRecipe).amount);
            }
        }
    }
}

function getCurrentRecipe(recipe) {
    return itemRecipesData[currentCraftableRecipes[recipe]];
}

function getCurrentRecipeItem(recipe) {
    return new item(getCurrentRecipe(recipe).item, getCurrentRecipe(recipe).amount);
}

function getCraftableRecipes() {
    getCurrentCraftingStations();
    currentCraftableRecipes = [];

    for (let i = 0; i < itemRecipesData.length; i++) {
        const currentRecipe = itemRecipesData[i];
        const station = currentRecipe?.station ?? 0;
        if (!currentStations.includes(station) && station != 0) {continue;}
        let err = false;
        for (let i2 = 0; i2 < currentRecipe.recipe.length; i2++) {
            const currItem = currentRecipe.recipe[i2];
            if (!doesInventoryContain(currItem.item, currItem.amount)) {err = true; break;}
        }
        if (err) {continue;}
        currentCraftableRecipes.push(i);
    }
}

function getCurrentCraftingStations() {
    currentStations = [];
    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 6; y++) {
            const tx = x - 4 + getGridPos(player.pos.x);
            const ty = y - 4 + getGridPos(player.pos.y);
            const tile = tileGrid[getIDX(tx, ty)];
            const station = tileData[tile]?.craftingStation ?? 0;
            if (station == 0) {continue;}
            if (currentStations.includes(station)) {continue;}
            currentStations.push(station);
        }
    }
}

function doesInventoryContain(tItem, amount) {
    let currAmount = 0;
    for (let i = 0; i < inventory["hotbar"].length; i++) {
        const tmpItem = inventory["hotbar"][i];
        if (tmpItem.id != tItem) {continue;}
        currAmount += tmpItem.amount;
    }
    if (currAmount >= amount) {return true;}
    for (let i = 0; i < inventory["main"].length; i++) {
        const tmpItem = inventory["main"][i];
        if (tmpItem.id != tItem) {continue;}
        currAmount += tmpItem.amount;
    }
    if (currAmount >= amount) {return true;}
    return false;
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
        if (tmpSlot.item().amount > amount) {
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
        if (tmpSlot.item().amount > amount) {
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

function updateSelectedSlot() {
    if (!selectedSlot.compare(oldSelectedSlot)) {
        oldSelectedSlot = selectedSlot.copy();
        buildAni.delay = 0;
    }
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

    addAmount(amount) {
        inventory[this.container][this.id].amount += amount;
    }

    setId(id) {
        inventory[this.container][this.id].id = id;
    }

    item() {
        return inventory[this.container][this.id];
    }

    compare(tSlot) {
        if (tSlot.id == this.id && tSlot.container == this.container) {return true;}
        return false;
    }

    copy() {
        return new slot(this.id, this.container);
    }
}

async function loadInventoryGuiImages() {
    inventoryGuiImages.slot1 = await loadImage('images/gui/Inventory_Back.png');
    inventoryGuiImages.slot2 = await loadImage('images/gui/Inventory_Back9.png');
    inventoryGuiImages.slot3 = await loadImage('images/gui/Inventory_Back14.png');
    inventoryGuiImages.slot4 = await loadImage('images/gui/Inventory_Back4.png');
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

let itemRecipesData;
let currentStations = [];
let currentCraftableRecipes = [];

let craftingDelay = {
    delay: 0,
    next: 45,
    speed: 30
};

let selectedRecipe = 0;

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
let oldSelectedSlot = selectedSlot.copy();

const cursorSlot = new slot(0, "cursor");

new slot(0, "hotbar").set(new item(1, 1));
new slot(1, "hotbar").set(new item(10, 1));
new slot(2, "hotbar").set(new item(9, 50));
new slot(3, "hotbar").set(new item(9, 50));
