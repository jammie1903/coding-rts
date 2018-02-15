module.exports = class Map {

    constructor() {
        this.height = 10;
        this.width = 10;
        this.roomWidth = 20;
        this.roomHeight = 20;
        this.rooms = [];
        for (let i = 0; i < this.width * this.height; i++) {
            let x = i % this.width;
            let y = Math.floor(i / this.width);
            this.rooms.push(new Room(x, y, this.roomWidth, this.roomHeight));
        }
        let room = this.rooms[Math.floor(Math.random() * this.width * this.height)];
        while (true) {

            let pos = this.width * room.y + room.x;
            let adjacentRooms = [];
            if (room.x > 0) adjacentRooms.push(this.rooms[pos - 1]);
            if (room.x < this.width - 1) adjacentRooms.push(this.rooms[pos + 1]);
            if (room.y > 0) adjacentRooms.push(this.rooms[pos - this.height]);
            if (room.y < this.height - 1) adjacentRooms.push(this.rooms[pos + this.height]);

            adjacentRooms.filter(r => r.links.length && !r.linkedToRoom(room) && Math.random() >= 0.333333)
                .forEach(r => r.link(room, this.roomWidth, this.roomHeight));
            let unlinkedRooms = adjacentRooms.filter(r => !r.links.length);
            if (unlinkedRooms.length) {
                let oldRoom = room;
                room = unlinkedRooms[Math.floor(Math.random() * unlinkedRooms.length)];
                room.link(oldRoom, this.roomWidth, this.roomHeight);
            } else {
                if (!room.links.length) {
                    adjacentRooms[Math.floor(Math.random() * adjacentRooms.length)].link(room, this.roomWidth, this.roomHeight);
                }
                unlinkedRooms = this.rooms.filter(r => !r.links.length);
                if (!unlinkedRooms.length) {
                    return;
                }
                room = unlinkedRooms[Math.floor(Math.random() * unlinkedRooms.length)];
            }
        }
    }

    toOverview() {
        return {
            width: this.width,
            height: this.height,
            roomWidth: this.roomWidth,
            roomHeight: this.roomHeight,
            rooms: this.rooms.map(r => ({
                x: r.x,
                y: r.y,
                links: r.links
            }))
        }
    }
}

class Room {
    constructor(x, y, roomWidth, roomHeight) {
        this.x = x;
        this.y = y;
        this.tiles = [];
        for (let i = 0; i < roomWidth * roomHeight; i++) {
            this.tiles.push(new Tile());
        }
        this.links = [];
    }

    linkedToRoom(room) {
        return !!this.links.find(l => l.room.x === room.x && l.room.y === room.y);
    }

    link(room, roomWidth, roomHeight) {
        if (this.linkedToRoom(room)) {
            throw new Error("Rooms are already Linked");
        }
        if (room.x === this.x && Math.abs(room.y - this.y) === 1) {
            let yPos = room.y < this.y ? 0 : roomHeight - 1;
            let yPos2 = room.y < this.y ? roomHeight - 1 : 0;
            let xPos = 1 + Math.ceil(Math.random() * (roomWidth - 4));
            let xPos2 = xPos + (Math.random() >= 0.5 ? 1 : -1);
        
            this.tiles[yPos * roomWidth + xPos].link = { room: { x: room.x, y: room.y }, x: xPos, y: yPos2 }
            this.tiles[yPos * roomWidth + xPos2].link = { room: { x: room.x, y: room.y }, x: xPos2, y: yPos2 }

            this.links.push({ room: { x: room.x, y: room.y }, tiles: [{ x: xPos, y: yPos }, { x: xPos2, y: yPos }] });

            room.tiles[yPos2 * roomWidth + xPos].link = { room: { x: this.x, y: this.y }, x: xPos, y: yPos }
            room.tiles[yPos2 * roomWidth + xPos2].link = { room: { x: this.x, y: this.y }, x: xPos2, y: yPos }

            room.links.push({ room: { x: this.x, y: this.y }, tiles: [{ x: xPos, y: yPos2 }, { x: xPos2, y: yPos2 }] });

        } else if (room.y === this.y && Math.abs(room.x - this.x) === 1) {
            let xPos = room.x < this.x ? 0 : roomWidth - 1;
            let xPos2 = room.x < this.x ? roomWidth - 1 : 0;
            let yPos = 1 + Math.ceil(Math.random() * (roomHeight - 4));
            let yPos2 = yPos + (Math.random() >= 0.5 ? 1 : -1);

            this.tiles[yPos * roomWidth + xPos].link = { room: { x: room.x, y: room.y }, x: xPos2, y: yPos }
            this.tiles[yPos2 * roomWidth + xPos].link = { room: { x: room.x, y: room.y }, x: xPos2, y: yPos2 }

            this.links.push({ room: { x: room.x, y: room.y }, tiles: [{ x: xPos, y: yPos }, { x: xPos, y: yPos2 }] });

            room.tiles[yPos * roomWidth + xPos2].link = { room: { x: this.x, y: this.y }, x: xPos, y: yPos }
            room.tiles[yPos2 * roomWidth + xPos2].link = { room: { x: this.x, y: this.y }, x: xPos, y: yPos2 }

            room.links.push({ room: { x: this.x, y: this.y }, tiles: [{ x: xPos2, y: yPos }, { x: xPos2, y: yPos2 }] });

        } else {
            throw new Error("Rooms are not adjacent");
        }
    }
}

class Tile {

}