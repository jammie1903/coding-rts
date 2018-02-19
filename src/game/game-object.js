const { Parts } = require("./parts");
const ERROR_CODES = require("./error-codes");
const PARTS_RUN_ORDER = ["CREATE", "MOVE"];

module.exports.GameObject = class GameObject {
    constructor(parts, type, name) {
        this.name = name || ("obj-" + new Date().getTime());
        this.owner = null;
        this.room = null;
        this.tile = null;
        this.type = type || "environmental";
        this.color = "#FFF";
        this.parts = new Parts(parts);
        this.game = require("./game").getInstance();
    }

    limited(player) {
        const keys = Object.keys(this);
        const ownerVal = player && player.id === this.owner.id ? player : this.owner.limited();
        const self = this;
        return {
            get owner() { return ownerVal },
            get room() { return self.room && self.room.limited() },
            get tile() { return self.tile && self.tile.limited() },
            get type() { return self.type },
            get color() { return self.color },
            get parts() { return self.parts.limited(ownerVal === player) },
            hasWorkingPart: (part) => this.hasWorkingPart(part),
            getTotalEnergy: () => this.getTotalEnergy()
        };
    }

    step() {
        PARTS_RUN_ORDER.forEach(part => {
            if (this.hasWorkingPart(part)) this.parts[part].run(this);
        });
    }

    hasWorkingPart(part) {
        return this.parts[part] && this.parts[part].hp !== 0;
    }

    getTotalEnergy() {
        let total = 0;
        if (this.hasWorkingPart("ENERGY")) {
            total += this.parts["ENERGY"].energy;
        }
        if (this.hasWorkingPart("STORAGE")) {
            total += this.parts["STORAGE"].energy;
        }
        if (this.hasWorkingPart("CARRY")) {
            total += this.parts["CARRY"].energy;
        }
        return total;
    }

    removeEnergy(cost) {
        let remaining = cost;

        if (this.hasWorkingPart("ENERGY")) {
            remaining -= this.parts["ENERGY"].energy;
            if (remaining <= 0) {
                this.parts["ENERGY"].energy = -1 * remaining;
                return 0;
            }
            this.parts["ENERGY"].energy = 0;
        }

        if (this.hasWorkingPart("CARRY")) {
            remaining -= this.parts["CARRY"].energy;
            if (remaining <= 0) {
                this.parts["CARRY"].energy = -1 * remaining;
                return 0;
            }
            this.parts["CARRY"].energy = 0;
        }

        if (this.hasWorkingPart("STORAGE")) {
            remaining -= this.parts["STORAGE"].energy;
            if (remaining <= 0) {
                this.parts["STORAGE"].energy = -1 * remaining;
                return 0;
            }
            this.parts["STORAGE"].energy = 0;
        }
        return remaining;
    }
}

module.exports.GameUnit = class GameUnit extends module.exports.GameObject {
    constructor(name, parts) {
        super(parts, "unit", name);
        this.fatigue = 0;
    }

    limited(owner) {
        const returnValue = super.limited(owner);
        let hasOwnership = owner.id === this.owner.id;
        Object.defineProperty(returnValue, "fatigue", { enumerable: true, get: () => this.fatigue });
        Object.defineProperty(returnValue, "name", { enumerable: true, get: () => this.name });
        const self = this;
        if (hasOwnership) {
            returnValue.move = function () { return self.move.apply(self, arguments); };
        } else {
            returnValue.move = function () { return ERROR_CODES.NOT_ALLOWED };
        }
        return returnValue;
    }

    move() {
        if (this.hasWorkingPart("MOVE")) {
            return this.parts["MOVE"].setTarget(this, arguments);
        } else {
            return ERROR_CODES.CANNOT_MOVE
        }
    }
}

module.exports.GameStructure = class GameUnit extends module.exports.GameObject {
    constructor(name, parts) {
        super(parts, "structure", name);
    }

    limited(owner) {
        const returnValue = super.limited(owner);
        let hasOwnership = owner.id === this.owner.id;
        Object.defineProperty(returnValue, "name", { enumerable: true, get: () => this.name });
        if (hasOwnership) {
            returnValue.createUnit = (name, parts) => this.createUnit(name, parts);
        } else {
            returnValue.createUnit = () => ERROR_CODES.NOT_ALLOWED;
        }
        return returnValue;
    }

    createUnit(name, parts) {
        return this.game.createGameUnit(this, name, parts);
    }
}