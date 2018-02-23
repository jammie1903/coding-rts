const applyChange = require("deep-diff").applyChange;
const jwt = require('jsonwebtoken');
const SECRET = 'jamies-secret-TODO-change-this';
const adminToken = jwt.sign({ id: "ADMIN", username: "ADMIN" }, SECRET);

const deepstreamClient = require('deepstream.io-client-js');
const stream = deepstreamClient("localhost:3091").login({ token: adminToken });

module.exports = class UpdateEmitter {
    constructor() {
        this.state = {};
        this.rooms = {};
    }

    addToRoom(room, objectId, updatedRooms) {
        const roomId = `${room.x}/${room.y}`;
        if (!this.rooms[roomId]) {
            this.rooms[roomId] = new Set();
        }
        this.rooms[roomId].add(objectId);
        updatedRooms.add(roomId);
    }

    removeFromRoom(room, objectId, updatedRooms) {
        const roomId = `${room.x}/${room.y}`;
        if (this.rooms[roomId]) {
            this.rooms[roomId].delete(objectId);
        }
        updatedRooms.add(roomId);
    }

    sendUpdates(updatedRooms, updatedObjects) {
        let updates = Promise.resolve();
        updatedRooms.forEach((room) => {
            updates = updates.then(new Promise((res, rej) => {
                stream.record.getRecord(`room/${room}`).whenReady(record => {
                    record.set(this.rooms[room]);
                    res();
                });
            }));
            // stream.emit(room, this.rooms[room]);
        });
        updatedObjects.forEach(object => {
            let keys = object.split("/");
            updates = updates.then(new Promise((res, rej) => {
                stream.record.getRecord(`gameobject-detailed/${object}`).whenReady(record => {
                    record.set(this.state[keys[0]][keys[1]]);
                    res();
                });
            }));
            updates = updates.then(new Promise((res, rej) => {
                stream.record.getRecord(`gameobject/${object}`).whenReady(record => {
                    record.set(this.state[keys[0]][keys[1]]);
                    res();
                });
            }));

            // stream.record.getRecord(`gameobject-detailed/${object}`).set(this.state[keys[0]][keys[1]]);
            // stream.record.getRecord(`gameobject/${object}`).set(this.state[keys[0]][keys[1]]);
        });
        return updates;
    }

    update(changes) {
        if (!changes) return Promise.resolve();

        //console.log(changes);

        let updatedRooms = new Set();
        let updatedObjects = new Set();

        changes.forEach(change => {
            //  console.log(change);
            if (change.path.length === 1) {
                // new player has been created/deleted
                if (change.kind === "N") {
                    Object.keys(change.rhs).forEach(name => {
                        console.log("new object created: ", change.path[0] + '/' + name, change.rhs[name].room);
                        this.addToRoom(change.rhs[name].room, change.path[0] + '/' + name, updatedRooms);
                        updatedObjects.add(change.path[0] + '/' + name);
                    });
                } else {
                    Objects.keys(change.lhs).forEach(name => {
                        console.log("object deleted: ", change.path[0] + '/' + change.lhs[name].room);
                        this.removeFromRoom(change.lhs[name].room, change.path[0] + '/' + name, updatedRooms);
                        updatedObjects.add(change.path[0] + '/' + name);
                    });
                }
            } else if (change.path.length === 2) {
                // new gameObject has been created/deleted
                if (change.kind === "N") {
                    console.log("new object created: ", change.path[0] + '/' + change.path[1], change.rhs.room);
                    this.addToRoom(change.rhs.room, change.path[0] + '/' + change.path[1], updatedRooms);
                    updatedObjects.add(change.path[0] + '/' + change.path[1]);
                } else {
                    console.log("object deleted: ", change.path[0] + '/' + change.path[1], change.lhs.room);
                    this.removeFromRoom(change.lhs.room, change.path[0] + '/' + change.path[1], updatedRooms);
                    updatedObjects.add(change.path[0] + '/' + change.path[1]);
                }
            } else {
                if (change.path[2] === "room") {
                    console.log("unit room updated"); // TODO
                    if (change.path.length === 3) {
                        this.addToRoom(change.rhs, change.path[0] + '/' + change.path[1], updatedRooms);
                        this.removeFromRoom(change.lhs, change.path[0] + '/' + change.path[1], updatedRooms);
                    } else {
                        console.log(`${change.path[3]} updated`); // TODO handle
                    }
                }
                console.log("object updated: ", change.path[0] + '/' + change.path[1]);
                updatedObjects.add(change.path[0] + '/' + change.path[1]);
            }
            applyChange(this.state, {}, change);
        });

        return this.sendUpdates(updatedRooms, updatedObjects);
    }
}