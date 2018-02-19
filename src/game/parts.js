const ERROR_CODES = require("./error-codes");

const UNIT_PARTS = ["MOVE"]; //ATTACK = do damage, HEAL = restore health, RANGE = range of attack/heal, CARRY = carry capacity and ability to carry, WORK = gather etc., BUILD build and repair
const BUILDING_PARTS = ["CREATE", "ARMOUR"];
const ENVIRONMENT_PARTS = ["ENERGY"];

module.exports.Parts = class Parts {
    constructor(parts) {
        Object.keys(parts).forEach(part => {
            this[part] = new module.exports[part](parts[part]);
        });
    }

    limited(isOwner) {
        const returnValue = {};
        Object.keys(this).forEach(k => {
            let limited = this[k].limited(isOwner);
            Object.defineProperty(returnValue, k, { enumerable: true, get: () => limited })
        });
        return returnValue;
    }
}

module.exports.MOVE = class MovePart {
    constructor(level) {
        this.level = level;
        this.hp = this.level * 50;
        this.path = [];
    }

    limited() {
        const self = this;
        return {
            get name() { return "MOVE" },
            get hp() { return self.hp },
            get level() { return self.level },
        }
    }

    setTarget(object, args) {
        let coords;
        if (args.length === 2) {
            coords = { x: args[0], y: args[1] };
        } else {
            coords = args[0].x && args[0].y ? args[0] : args[0].tile;
        }
        if (!coords || typeof coords.x !== "number" || typeof coords.y !== "number") {
            return ERROR_CODES.INVALID_COORDINATES;
        }
        if (coords.room && coords.room !== object.room) {
            return ERROR_CODES.ROOM_TRAVERSAL_NOT_AVAILABLE; // TODO this is temporary until i can be bothered to code it;
        }
        let existingPathEnd = this.path && this.path[this.path.length - 1]
        if (existingPathEnd && existingPathEnd.x === coords.x && existingPathEnd.y === coords.y) {
            return 0; // Already moving to this point, dont need to find a new path
        }
        this.path = object.room.getPath(object.tile, coords);
        if (this.path === null) {
            return ERROR_CODES.COORDINATES_NOT_ACCESSIBLE;
        }
        return 0;
    }

    run(object) {
        if (!object.fatigue && this.path && this.path.length) {
            let nextPath = this.path.shift();
            console.log("moving to " + nextPath.x + "," + nextPath.y);
            // TODO handle occurrence of path being more than one block away
            object.room.move(object, nextPath);
            object.fatigue += Math.max(0, object.partsCount - this.level);
        }
        object.fatigue = Math.max(0, object.fatigue - this.level);
    }
}

module.exports.CREATE = class CreatePart {
    constructor(level) {
        this.level = level;
        this.hp = this.level * 100;
        this.queue = [];
    }

    limited(isOwner) {
        const self = this;
        const returnObject = {
            get name() { return "CREATE" },
            get hp() { return self.hp },
            get level() { return self.level },
        }
        if (isOwner) {
            let queue = this.queue.map(q => {
                const parts = Object.keys(q.parts).reduce((acc, p) => {
                    acc[p] = q.parts[p];
                    return acc;
                }, {});
                return {
                    get name() { return q.name },
                    get parts() { return parts },
                    get productionTime() { return q.productionTime }
                }
            });
            Object.defineProperty(returnObject, "queue", { enumerable: true, get: () => queue });
        }
        return returnObject;
    }

    run(object) {
        if (!this.queue.length) {
            return;
        }
        this.queue[0].productionTime = Math.max(0, this.queue[0].productionTime - this.level);
        if (this.queue[0].productionTime === 0) {
            let spawnLocation = object.room.getNearestFreeTile(object.tile);
            if (!spawnLocation) {
                return;
            }
            let spawn = this.queue.shift();
            let unitNames = object.owner.getUnitNames();
            let name = spawn.name || "Unit";
            let counter = 0;
            while (unitNames.indexOf(name + (counter ? "-" + counter : "")) !== -1) counter++;
            const newUnit = new (require("./game-object").GameUnit)(name + (counter ? "-" + counter : ""), spawn.parts);
            newUnit.room = object.room;
            newUnit.tile = spawnLocation;
            newUnit.owner = object.owner;
            newUnit.color = object.owner.color;
            object.owner.units[name + (counter ? "-" + counter : "")] = newUnit;
            object.game.gameObjects.push(newUnit);
        }
    }

    addUnitToQueue(name, parts, productionTime) {
        this.queue.push({ name, parts, productionTime });
    }
}

module.exports.ARMOUR = class ArmourPart {
    constructor(level, type) {
        this.level = level;
        this.hp = this.level * (type === "structure" ? 1000 : 250);
    }

    limited() {
        const self = this;
        return {
            get name() { return "ARMOUR" },
            get hp() { return self.hp },
            get level() { return self.level },
        }
    }
}

module.exports.STORAGE = class StoragePart {
    constructor(level) {
        this.level = level;
        this.hp = 100;
        this.capacity = level * 1000;
        this.energy = 0;
    }

    limited() {
        const self = this;
        return {
            get name() { return "STORAGE" },
            get hp() { return self.hp },
            get level() { return self.level },
        }
    }

    store(carrier) {
        const remainingSpace = this.capacity - this.energy;
        const carrierEnergy = this.carrier.getTotalEnergy();
        const transferAmount = math.min(remainingSpace, carrierEnergy);
        this.carrier.removeEnergy(transferAmount);
        this.energy += transferAmount;
    }
}

module.exports.ENERGY = class EnergyPart {
    constructor(level) {
        this.level = level;
        this.hp = null;
        this.energy = level * 1000;
    }

    limited() {
        const self = this;
        return {
            get name() { return "ENERGY" },
            get level() { return self.level },
        }
    }
}
