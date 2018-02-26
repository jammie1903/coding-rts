const chance = new require("chance")();
const ErrorCodes = require("./error-codes");

const ROOM_WIDTH = 20;
const ROOM_HEIGHT = 20;
module.exports = class Map {

    constructor(game, leaveEmpty) {
        if (!leaveEmpty) {
            this.height = 10;
            this.width = 10;
            this.rooms = [];
            for (let i = 0; i < this.width * this.height; i++) {
                let x = i % this.width;
                let y = Math.floor(i / this.width);
                this.rooms.push(new Room(x, y));
            }
            this.linkRooms();

            this.rooms.forEach(room => room.populate(game));

        }
    }

    static fromData(data) {
        const returnValue = new module.exports(null, true)
        returnValue.height = data.height;
        returnValue.width = data.width;
        returnValue.rooms = data.rooms.map(d => Room.fromData(d));
        return returnValue;
    }

    linkRooms() {
        let room = this.rooms[Math.floor(Math.random() * this.width * this.height)];
        while (true) {

            let pos = this.width * room.y + room.x;
            let adjacentRooms = [];
            if (room.x > 0) adjacentRooms.push(this.rooms[pos - 1]);
            if (room.x < this.width - 1) adjacentRooms.push(this.rooms[pos + 1]);
            if (room.y > 0) adjacentRooms.push(this.rooms[pos - this.height]);
            if (room.y < this.height - 1) adjacentRooms.push(this.rooms[pos + this.height]);

            adjacentRooms.filter(r => r.links.length && !r.linkedToRoom(room) && Math.random() >= 0.333333)
                .forEach(r => r.link(room));
            let unlinkedRooms = adjacentRooms.filter(r => !r.links.length);
            if (unlinkedRooms.length) {
                let oldRoom = room;
                room = unlinkedRooms[Math.floor(Math.random() * unlinkedRooms.length)];
                room.link(oldRoom);
            } else {
                if (!room.links.length) {
                    adjacentRooms[Math.floor(Math.random() * adjacentRooms.length)].link(room);
                }
                unlinkedRooms = this.rooms.filter(r => !r.links.length);
                if (!unlinkedRooms.length) {
                    break;
                }
                room = unlinkedRooms[Math.floor(Math.random() * unlinkedRooms.length)];
            }
        }
    }

    toOverview() {
        return {
            width: this.width,
            height: this.height,
            ROOM_WIDTH,
            ROOM_HEIGHT,
            rooms: this.rooms.map(r => ({
                x: r.x,
                y: r.y,
                links: r.links
            }))
        }
    }

    roomOverview(x, y) {
        let room = this.rooms[x + y * this.width];
        return room.tiles;
    }
}

module.exports.ROOM_WIDTH = ROOM_WIDTH;
module.exports.ROOM_HEIGHT = ROOM_HEIGHT;

class Room {
    constructor(x, y, leaveEmpty) {
        if (!leaveEmpty) {
            this.x = x;
            this.y = y;
            this.tiles = [];
            for (let i = 0; i < ROOM_WIDTH * ROOM_HEIGHT; i++) {
                let x = i % ROOM_WIDTH;
                let y = Math.floor(i / ROOM_WIDTH);
                this.tiles.push(new Tile(x, y));
            }
            this.links = [];
        }
    }

    static fromData(data) {
        const returnValue = new Room(null, null, true);
        returnValue.x = data.x;
        returnValue.y = data.y;
        returnValue.links = data.links;
        returnValue.tiles = data.tiles.map((tile) => {
            let returnVal = new Tile(tile.x, tile.y);
            returnVal.wall = tile.wall;
            returnVal.link = tile.link;
            return returnVal;
        });
        return returnValue;
    }

    limited() {
        const self = this;
        return {
            get x() { return self.x },
            get y() { return self.y },
            getTile: (x, y) => self.getTile(x, y, true)
        }
    }

    move(object, coords) {
        if (coords.x < 0 || coords.x >= ROOM_WIDTH || coords.y < 0 || coords.y >= ROOM_HEIGHT) {
            return;
        }
        object.room = this;
        object.tile = this.tiles[coords.x + coords.y * ROOM_WIDTH];
    }

    getTile(x, y, limited) {
        if (x < 0 || x >= ROOM_WIDTH || y < 0 || y >= ROOM_HEIGHT) {
            return ErrorCodes.INVALID_COORDINATES
        }
        const tile = this.tiles[x + y * ROOM_WIDTH];
        return tile && limited ? tile.limited() : tile;
    }

    getNearestFreeTile(tile) {
        let distanceToCheck = 1;
        while (distanceToCheck <= Math.max(ROOM_WIDTH, ROOM_HEIGHT)) {
            let emptyTile = this.getTilesWithGivenDistance(tile, distanceToCheck).find(t => !t.wall);
            if (emptyTile) {
                return emptyTile;
            }
            distanceToCheck++;
        }
        return null;
    }

    getTilesWithGivenDistance(tile, distanceToCheck) {
        let returnList = [];
        for (let x = tile.x - distanceToCheck; x <= tile.x + distanceToCheck; x++) {
            if (x >= 0 && x < ROOM_WIDTH)
                for (let y = tile.y - distanceToCheck; y <= tile.y + distanceToCheck; y++) {
                    if (y >= 0 && y < ROOM_HEIGHT && Math.abs(y - tile.y) + Math.abs(x - tile.x) === distanceToCheck) {
                        returnList.push(this.getTile(x, y))
                    }
                }
        }
        return returnList;
    }

    populate(game) {

        const linkedTiles = this.tiles.filter(t => t.link);
        const randomPoint = { x: 2 + Math.floor(Math.random() * (ROOM_WIDTH - 4)), y: 2 + Math.floor(Math.random() * (ROOM_HEIGHT - 4)) };
        this.tiles[randomPoint.x + randomPoint.y * ROOM_WIDTH].wall = false
        linkedTiles.forEach(t1 => {
            this.drunkenPath(t1, randomPoint).forEach(point => this.tiles[point.x + point.y * ROOM_WIDTH].wall = false);
        });

        const maxWallCount = Math.floor(ROOM_WIDTH * ROOM_HEIGHT * 0.4);
        let reorderedTiles = chance.shuffle(this.tiles.filter(t => t.wall));
        let edgesRemoved = 0;
        let count = 0
        while (reorderedTiles.length && maxWallCount < reorderedTiles.length + edgesRemoved) {
            const tile = reorderedTiles.shift();
            const neighbours = this.neighbours(tile);
            if (neighbours.length === 4) {
                if (neighbours.find(t => !t.wall)) {
                    tile.wall = false;
                } else {
                    reorderedTiles.push(tile);
                }
            } else {
                edgesRemoved++;
            }
        }
        if (!reorderedTiles.length) {
            console.log(this.x, this.y);
            console.log("there were no more tiles for");
        }
    }

    neighbours(tile) {
        let pos = ROOM_WIDTH * tile.y + tile.x;
        let adjacentTiles = [];
        if (tile.x > 0) adjacentTiles.push(this.tiles[pos - 1]);
        if (tile.x < ROOM_WIDTH - 1) adjacentTiles.push(this.tiles[pos + 1]);
        if (tile.y > 0) adjacentTiles.push(this.tiles[pos - ROOM_HEIGHT]);
        if (tile.y < ROOM_HEIGHT - 1) adjacentTiles.push(this.tiles[pos + ROOM_HEIGHT]);
        return adjacentTiles;
    }

    drunkenPath(from, to) {
        const returnPath = [];
        let pos = { x: from.x, y: from.y };
        returnPath.push(pos);
        while (Math.abs(pos.x - to.x) + Math.abs(pos.y - to.y) > 1) {
            let xDiff = Math.abs(pos.x - to.x);
            let yDiff = Math.abs(pos.y - to.y);

            if (pos.x === ROOM_WIDTH - 1) pos = { x: pos.x - 1, y: pos.y };
            else if (pos.x === 0) pos = { x: pos.x + 1, y: pos.y };
            else if (pos.y === ROOM_HEIGHT - 1) pos = { x: pos.x, y: pos.y - 1 };
            else if (pos.y === 0) pos = { x: pos.x, y: pos.y + 1 };

            else if (Math.random() < xDiff / (xDiff + yDiff)) {
                let dir = (pos.x < to.x ? 1 : -1) * (Math.random() >= 0.2 ? 1 : -1);
                if (pos.x + dir === ROOM_WIDTH - 1 || pos.x + dir === 0) {
                    dir = -dir;
                }
                pos = { x: pos.x + dir, y: pos.y };
            } else {
                let dir = (pos.y < to.y ? 1 : -1) * (Math.random() >= 0.25 ? 1 : -1);
                if (pos.y + dir === ROOM_HEIGHT - 1 || pos.y + dir === 0) {
                    dir = -dir;
                }
                pos = { x: pos.x, y: pos.y + dir };
            }
            returnPath.push(pos);
        }
        returnPath.push({ x: to.x, y: to.y });
        return returnPath;
    }

    linkedToRoom(room) {
        return !!this.links.find(l => l.room.x === room.x && l.room.y === room.y);
    }

    link(room) {
        if (this.linkedToRoom(room)) {
            throw new Error("Rooms are already Linked");
        }
        if (room.x === this.x && Math.abs(room.y - this.y) === 1) {
            let yPos = room.y < this.y ? 0 : ROOM_HEIGHT - 1;
            let yPos2 = room.y < this.y ? ROOM_HEIGHT - 1 : 0;
            let xPos = 1 + Math.ceil(Math.random() * (ROOM_WIDTH - 4));
            let xPos2 = xPos + (Math.random() >= 0.5 ? 1 : -1);

            this.tiles[yPos * ROOM_WIDTH + xPos].link = { room: { x: room.x, y: room.y }, x: xPos, y: yPos2 }
            this.tiles[yPos * ROOM_WIDTH + xPos2].link = { room: { x: room.x, y: room.y }, x: xPos2, y: yPos2 }

            this.links.push({ room: { x: room.x, y: room.y }, tiles: [{ x: xPos, y: yPos }, { x: xPos2, y: yPos }] });

            room.tiles[yPos2 * ROOM_WIDTH + xPos].link = { room: { x: this.x, y: this.y }, x: xPos, y: yPos }
            room.tiles[yPos2 * ROOM_WIDTH + xPos2].link = { room: { x: this.x, y: this.y }, x: xPos2, y: yPos }

            room.links.push({ room: { x: this.x, y: this.y }, tiles: [{ x: xPos, y: yPos2 }, { x: xPos2, y: yPos2 }] });

        } else if (room.y === this.y && Math.abs(room.x - this.x) === 1) {
            let xPos = room.x < this.x ? 0 : ROOM_WIDTH - 1;
            let xPos2 = room.x < this.x ? ROOM_WIDTH - 1 : 0;
            let yPos = 1 + Math.ceil(Math.random() * (ROOM_HEIGHT - 4));
            let yPos2 = yPos + (Math.random() >= 0.5 ? 1 : -1);

            this.tiles[yPos * ROOM_WIDTH + xPos].link = { room: { x: room.x, y: room.y }, x: xPos2, y: yPos }
            this.tiles[yPos2 * ROOM_WIDTH + xPos].link = { room: { x: room.x, y: room.y }, x: xPos2, y: yPos2 }

            this.links.push({ room: { x: room.x, y: room.y }, tiles: [{ x: xPos, y: yPos }, { x: xPos, y: yPos2 }] });

            room.tiles[yPos * ROOM_WIDTH + xPos2].link = { room: { x: this.x, y: this.y }, x: xPos, y: yPos }
            room.tiles[yPos2 * ROOM_WIDTH + xPos2].link = { room: { x: this.x, y: this.y }, x: xPos, y: yPos2 }

            room.links.push({ room: { x: this.x, y: this.y }, tiles: [{ x: xPos2, y: yPos }, { x: xPos2, y: yPos2 }] });
        } else {
            throw new Error("Rooms are not adjacent");
        }
    }

    getPath(start, end) {
        let current;
        const closed = [];
        let open = [{ tile: this.getTile(start.x, start.y), g: 0, h: Math.abs(start.x - end.x) + Math.abs(start.y - end.y) }];
        while (open.length) {
            current = open.shift();
            if (current.tile.x === end.x && current.tile.y === end.y) {
                let returnList = [];
                while (current.parent) {
                    returnList.unshift(current.tile);
                    current = current.parent;
                }
                return returnList.length ? returnList : null;
            }

            this.neighbours(current.tile).filter(t => !t.wall).forEach(tile => {
                if (closed.indexOf(tile) === -1) {
                    const g = current.g + 1, h = Math.abs(tile.x - end.x) + Math.abs(tile.y - end.y);
                    let inOpen = open.find(entry => entry.tile === tile);
                    if (inOpen && (inOpen.g + inOpen.h > g + h)) {
                        inOpen.g = g;
                        inOpen.h = h;
                        inOpen.parent = current;
                    } else {
                        open.push({ parent: current, tile, g, h });
                    }
                }
            });
            open = open.sort((a, b) => (a.g + a.h) - (b.g + b.h));
            closed.push(current.tile);
            
        }
        return null;
    }
}

class Tile {
    constructor(x, y, options) {
        this.x = x;
        this.y = y;
        this.wall = true; //all tiles are walls until made otherwise
        this.link = null;
    }

    limited() {
        const self = this;
        const link = !this.link ? null : {
            room: {
                get x() { return self.link.room.x },
                get y() { return self.link.room.y }
            },
            get x() { return self.link.x },
            get y() { return self.link.y }
        };
        return {
            get x() { return self.x },
            get y() { return self.y },
            get wall() { return self.wall },
            get link() { return link },
        }
    }
}