const cluster = require('cluster');
const diff = require("deep-diff").diff;
const { NodeVM, VMScript } = require('vm2');
const path = require('path');
const fs = require("fs");
const fse = require("fs-extra");
const root = path.resolve("user-scripts", "./vm.js");
const game = require("../game/game").getInstance();

class VM {
    constructor(user) {
        this.user = user;
        this.userRoot = "user-" + user.id;
        this.bootstrapFileName = path.join("user-scripts", this.userRoot, "__bootstrap.js");
        this.sandBox = { data: { game: null } };

        this.vm = new NodeVM({
            wrapper: "none",
            console: "inherit",
            sandbox: this.sandBox,
            require: {
                external: true,
                builtin: { "module": true },
            }
        });
        if (!fs.existsSync(this.bootstrapFileName)) {
            this.createBootstrapFile();
        }
        this.script = new VMScript(`return require("./${this.userRoot}/__bootstrap")(data.game)`);
    }

    run(data) {
        this.sandBox.data.game = data;
        this.vm.run(this.script, root);
    }

    createBootstrapFile() {
        fse.outputFileSync(this.bootstrapFileName,
            `module.exports = (game) => {
    const cleanUp = require("../../src/bootstrap")("${this.userRoot}");
    let main;
    try {
        main = require("./").main;
    } catch (e) {
        cleanUp();
        return;
    }
    try {
        if(typeof main !== 'function') {
            throw new Error("Main method not found in index.js");
        }
        main(game);
    } catch (e) {
        throw e;
    } finally {
        cleanUp();
    }
}`);
    }
}

const vmCache = {};

function clear(user) {
    console.log("clearing cache", user);
    if (!vmCache[user.id]) {
        console.log("code not loaded");
        return "code not loaded";
    }
    delete vmCache[user.id];
    console.log("code cleared from cache");
    return "code cleared from cache";
}

function handleMap(map) {
    if (game.map) {
        throw new Error("Map has already been initialised");
    }
    game.initMap(map);
}

function getGameObject(user) {
    return game.limited(user);
}

function handleRun(user, data) {
    if (!game) {
        throw new Error("Map not initialised");
    }
    let vm = vmCache[user.id];
    if (!vm) {
        vm = new VM(user);
        vmCache[user.id] = vm;
    }
    const before = new Date().getTime();
    vm.run(data || getGameObject(user));
    return { user, time: new Date().getTime() - before };
}

function handleRunMultiple(id, users) {
    const beforeStep = game.getState();
    let dataMap;
    try {
        dataMap = users.map((user) => getGameObject(user));
    } catch (e) {
        sendResponse(id, { setup: "failed" }, true, "INIT");
        sendResponse(id, "Failed");
        return;
    }
    sendResponse(id, { setup: "successful" }, false, "INIT");

    users.forEach((user, i) => {
        try {
            const result = handleRun(user, dataMap[i]);
            sendResponse(id, result, false, true);
        } catch (error) {
            console.error(error);
            sendResponse(id, JSON.stringify(error), true, "UPDATE");
        }
    });
    const update = game.step();
    const afterStep = game.getState();
    sendResponse(id, diff(beforeStep, afterStep));
}

function sendResponse(requestId, response, error = false, type = "COMPLETE") {
    process.send({ error, requestId, response, type });
}

function runAction(id, action) {
    try {
        const result = action();
        sendResponse(id, result, false);
    } catch (error) {
        console.error(error);
        sendResponse(id, error, true);
    }
}


process.on('message', (message) => {

    if (!message || !message.action) {
        sendResponse(message ? message.id : null, "No action specified", true);
    }
    switch (message.action) {
        case "map": runAction(message.id, () => handleMap(message.data));
        case "run": runAction(message.id, () => handleRun(message.data));
            break;
        case "runMultiple": handleRunMultiple(message.id, message.data);
            break;
        case "clear": runAction(message.id, () => clear(message.data));
            break;
        default: process.send({
            error: true,
            requestId: message.id,
            response: `No handler for action "${message.action}"`
        });
    }
    // process.send({
    //     error: false,
    //     requestId: msg.id,
    //     response: "hello " + msg.action + " " + msg.data
    // });
});