const cluster = require('cluster');

let idIncrement = 0;
const TIME_OUT_LIMIT = 3000;

class VmMaster {

    constructor() {
        cluster.setupMaster({
            exec: 'src/vm/vm-slave.js'
        });
        this.users = [];
    }

    addUsers(users) {
        if (this.users.length) {
            const userIds = this.users.map(u => u.id);
            users.forEach(u => {
                if (userIds.indexOf(u.id) === -1) {
                    this.users.push(u);
                    userIds.push(u.id);
                }
            });
        } else {
            this.users = users;
        }
    }

    sendMap(map) {
        return this.sendMessage("map", map);
    }

    refreshUserCode(user) {
        return this.sendMessage("clear", user);
    }

    processUsers(previousResults = { updateMessages: [], initMessages: [] }, users = this.users) {
        return this.sendMessage("runMultiple", users).catch(err => {
            if (err.message === "TIMEOUT") {
                let failedUserIndex = err.updateMessages.length;
                let failedUser = users[failedUserIndex];
                console.log(failedUser.username + " timed-out");
                err.updateMessages.push({ user: failedUser, time: "TIMEOUT" });
                if ((failedUserIndex + 1) === users.length) {
                    return {updates: err.updateMessages, err: result.message};
                } else {
                    return this.processUsers({
                        updateMessages: previousResults.updateMessages.concat(err.updateMessages),
                        initMessages: previousResults.updateMessages.concat(err.initMessages)
                    }, users.slice(failedUserIndex + 1, users.length));
                }
            } else {
                throw err;
            }
        }).then(result => {
            const updates = previousResults.updateMessages.concat(result.updateMessages);
            const initMessages = previousResults.initMessages.concat(result.initMessages)
            updates.forEach((result) => {
                if (result.time === 'TIMEOUT') {
                    const index = this.users.indexOf(result.user);
                    if (index > -1) {
                        this.users.splice(index, 1);
                        console.log(result.user + " removed from list");
                    }
                }
            });
            return {updates, initMessages, message: result.message};
        });
    }

    buildWorker() {
        this.worker = cluster.fork();

        this.worker.on('disconnect', () => {
            console.log("disconnect");
        })
        this.worker.on('error', () => {
            console.log("error");
        })
        this.worker.on('exit', (code, signal) => {
            console.log("exit", code, signal);
            this.worker = null;
        })
        this.worker.on('listening', (address) => {
            console.log("listening", address);
        })
        this.worker.on('message', (message) => {
            //console.log("message", message);
        })

        this.readyPromise = new Promise((res) => {
            this.worker.once('online', () => {
                console.log("online");
                res(this.worker);
            })
        });
    }

    getWorker() {
        if (!this.worker) {
            this.buildWorker();
        }
        return this.readyPromise;
    }

    killWorker() {
        if (this.worker) {
            this.worker.kill();
            this.worker = null;
        }
    }

    sendMessage(action, data) {
        const id = ++idIncrement;
        let timeout;
        return this.getWorker().then(worker => new Promise((res, rej) => {
            const updateMessages = [];
            const initMessages = []
            const listener = (receivedMessage) => {
                if (receivedMessage && receivedMessage.requestId === id) {
                    clearTimeout(timeout);
                    if (receivedMessage.type === "COMPLETE") {
                        worker.removeListener('message', listener);
                        if (receivedMessage.error) {
                            rej({ initMessages, updateMessages, message: receivedMessage.response });
                        } else {
                            res({ initMessages, updateMessages, message: receivedMessage.response });
                        }
                    } else {
                        if (receivedMessage.type === "INIT") {
                            initMessages.push(receivedMessage.response);
                        } else {
                            updateMessages.push(receivedMessage.response);
                        }
                        timeout = setTimeout(timeoutHandler, TIME_OUT_LIMIT);
                    }
                }
            }
            const timeoutHandler = () => {
                worker.removeListener('message', listener);
                this.killWorker();
                rej({ message: "TIMEOUT", initMessages, updateMessages });
            }
            worker.on('message', listener);
            worker.send({ id, action, data });
            timeout = setTimeout(timeoutHandler, TIME_OUT_LIMIT);
        }));
    }
}

module.exports = new VmMaster();
