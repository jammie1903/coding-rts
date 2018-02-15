const cluster = require('cluster');
const { NodeVM, VMScript } = require('vm2');
const path = require('path');
const fs = require("fs");
const fse = require("fs-extra");
const root = path.resolve("user-scripts", "./vm.js");

class VM {
    constructor(user) {
        this.user = user;
        this.userRoot = "user-" + user.id;
        this.bootstrapFileName = path.join("user-scripts", this.userRoot, "__bootstrap.js");
        this.game = {units: {"unit-1": {x:2, y:2}}};

        this.vm = new NodeVM({
            wrapper: "none",
            console: "inherit",
            sandbox: {game: this.game},
            require: {
                external: true,
                builtin: { "module": true },
            }
        });
        if (!fs.existsSync(this.bootstrapFileName)) {
            this.createBootstrapFile();
        }
        this.script = new VMScript(`return require("./${this.userRoot}/__bootstrap")(game)`);
    }

    run() {
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

function handleRun(user) {
    let vm = vmCache[user.id];
    if (!vm) {
        vm = new VM(user);
        vmCache[user.id] = vm;
    }
    const before = new Date().getTime();
    vm.run();
    return { user, time: new Date().getTime() - before };
}

function handleRunMultiple(id, users) {
    users.forEach(user => {
        try {
            const result = handleRun(user);
            sendResponse(id, result, false, true);
        } catch (error) {
            console.error(error);
            sendResponse(id, JSON.stringify(error), true, true);
        }
    });
    sendResponse(id, "Complete");
}

function sendResponse(requestId, response, error = false, update = false) {
    process.send({ error, requestId, response, update });
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