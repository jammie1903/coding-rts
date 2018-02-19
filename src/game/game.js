const Map = require("./map");
const { GameObject, GameUnit, GameStructure } = require("./game-object");
const Player = require("./player");
const ERROR_CODES = require("./error-codes");

const UNIT_PARTS = ["MOVE", "ARMOUR"]; //ATTACK = do damage, HEAL = restore health, RANGE = range of attack/heal, CARRY = carry capacity and ability to carry, WORK = gather etc., BUILD build and repair
const BUILDING_PARTS = ["CREATE", "ARMOUR", "STORAGE"]; //GARRISON - allows 5 units to hide inside
const ENVIRONMENT_PARTS = ["ENERGY"];

const PART_COST = 50;
const PRODUCTION_TIME = 5;
const UNIT_PART_LIMIT = 20;
const BUILDING_PART_LIMIT = 20;
module.exports = class Game {
    constructor() {
        this.players = {};
        this.gameObjects = [];
    }

    limited(user) {
        if (!this.players[user.id]) {
            this.players[user.id] = new Player(user);
            const mainBuilding = new GameStructure("Base", { CREATE: 1, ARMOUR: 5, STORAGE: 2 });
            mainBuilding.room = this.map.rooms[Math.floor(this.map.width * this.map.height * Math.random())];
            const tile = mainBuilding.room.tiles[Math.floor(Map.ROOM_WIDTH * Map.ROOM_HEIGHT * Math.random())]
            mainBuilding.tile = mainBuilding.room.getNearestFreeTile(tile);
            mainBuilding.owner = this.players[user.id];
            mainBuilding.parts["STORAGE"].energy = 500;
            mainBuilding.color = this.players[user.id].color;
            this.players[user.id].structures["Base"] = mainBuilding;
            this.gameObjects.push(mainBuilding);
        }
        const player = this.players[user.id].limited(user);
        const errors = Object.keys(ERROR_CODES).reduce((acc, k) => {
            acc[k] = ERROR_CODES[k];
            return acc;
        }, {});

        const objects = this.gameObjects.map(o => o.limited(player));
        // TODO probably should give the player this, they should be split up and put in the relevant maps, and not duplicating the users objects

        return {
            get ERROR_CODES() { return errors },
            get my() { return player },
            get objects() { return objects }
        }
    }

    initMap(map) {
        this.map = map ? Map.fromData(map) : new Map(this);
    }

    getState() {
        return JSON.parse(JSON.stringify(this.gameObjects.reduce((acc, go) => {
            const ownerName = go.owner ? go.owner.name : "ENVIRONMENT"
            acc[ownerName] = acc[ownerName] || {};
            acc[ownerName][go.type + ":" + go.name] = go.limited(go.owner && go.owner.limited());
            return acc;
        }, {})));
    }

    step() {
        const list = this.gameObjects.slice(0);
        list.forEach(go => go.step());
    }

    createGameEnvironmentObject(parts, room, tile) {
        let validatedParts = this.validateEnvironmentObjectParts(parts);
        let partCount = Object.keys(validatedParts).reduce((increment, current) => increment + validatedParts[current], 0);
        if (!partCount) {
            return ERROR_CODES.NO_VALID_PARTS_SPECIFIED;
        }

        const newUnit = new GameObject(spawn.parts);
        newUnit.room = room;
        newUnit.tile = tile;
        newUnit.color = "#49F";
        this.gameObjects.push(newUnit);
        return 0;
    }

    createGameUnit(producer, name, parts, room, tile) {
        if (producer && !producer.hasWorkingPart("CREATE")) {
            return ERROR_CODES.CANNOT_CREATE;
        }
        let validatedParts = this.validateUnitParts(producer, parts);
        let partCount = Object.keys(validatedParts).reduce((increment, current) => increment + validatedParts[current], 0);
        if (!partCount) {
            return ERROR_CODES.NO_VALID_PARTS_SPECIFIED;
        }
        if (producer) {
            if (partCount > UNIT_PART_LIMIT) {
                return ERROR_CODES.TOO_MANY_PARTS;
            }
            let cost = (partCount + 2) * PART_COST;
            if (cost > producer.getTotalEnergy()) {
                return ERROR_CODES.NOT_ENOUGH_RESOURCES;
            }
            let productionTime = (partCount + 2) * PRODUCTION_TIME;
            producer.parts["CREATE"].addUnitToQueue(name, validatedParts, productionTime);
            producer.removeEnergy(cost);
            return 0;
        } else {
            const newUnit = new GameUnit(name, spawn.parts);
            newUnit.room = room;
            newUnit.tile = tile;
            newUnit.color = "#49F";
            this.gameObjects.push(newUnit);
            return 0;
        }
    }

    validateUnitParts(producer, partNames) {
        let returnVal = {};
        partNames.forEach(partName => {
            if (Array.isArray(partName)) {
                if (UNIT_PARTS.indexOf(partName[0]) !== -1 || (!producer && ENVIRONMENT_PARTS.indexOf(partName[0]))) {
                    returnVal[partName[0]] = (returnVal[partName[0]] || 0) + partName[1];
                }
            } else if (UNIT_PARTS.indexOf(partName) !== -1 || (!producer && ENVIRONMENT_PARTS.indexOf(partName))) {
                returnVal[partName] = (returnVal[partName] || 0) + 1;
            }
        });
        return returnVal;
    }

    validateEnvironmentObjectParts(partNames) {
        let returnVal = {};
        partNames.forEach(partName => {
            if (Array.isArray(partName)) {
                if (ENVIRONMENT_PARTS.indexOf(partName[0])) {
                    returnVal[partName[0]] = (returnVal[partName[0]] || 0) + partName[1];
                }
            } else if (ENVIRONMENT_PARTS.indexOf(partName)) {
                returnVal[partName] = (returnVal[partName] || 0) + 1;
            }
        });
        return returnVal;
    }
}

let instance;
module.exports.getInstance = () => {
    if(!instance) {
        instance = new module.exports();
    }
    return instance;
};
