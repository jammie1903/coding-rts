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

    refreshUserCode(user) {
        return this.sendMessage("clear", user);
    }

    processUsers(previousResults = [], users = this.users) {
        return this.sendMessage("runMultiple", users).catch(err => {
            if (err.error && err.error === "TIMEOUT") {
                let failedUserIndex = err.updates.length;
                let failedUser = users[failedUserIndex];
                console.log(failedUser.username + " timed-out");
                err.updates.push({ user: failedUser, time: "TIMEOUT" });
                if ((failedUserIndex + 1) === users.length) {
                    return err.updates;
                } else {
                    return this.processUsers(previousResults.concat(err.updates), users.slice(failedUserIndex + 1, users.length));
                }
            } else {
                throw err;
            }
        }).then(results => {
            const fullResults = previousResults.concat(results);
            fullResults.forEach((result) => {
                if (result.time === 'TIMEOUT') {
                    const index = this.users.indexOf(result.user);
                    if (index > -1) {
                        this.users.splice(index, 1);
                        console.log(result.user + " removed from list");
                    }
                }
            });
            return fullResults;
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
            const updates = [];
            const listener = (receivedMessage) => {
                if (receivedMessage && receivedMessage.requestId === id) {
                    clearTimeout(timeout);
                    updates.push(receivedMessage.response);
                    if (!receivedMessage.update) {
                        worker.removeListener('message', listener);
                        if (receivedMessage.error) {
                            rej(updates);
                        } else {
                            res(updates);
                        }
                    } else {
                        timeout = setTimeout(timeoutHandler, TIME_OUT_LIMIT);
                    }
                }
            }
            const timeoutHandler = () => {
                worker.removeListener('message', listener);
                this.killWorker();
                rej({ error: "TIMEOUT", updates });
            }
            worker.on('message', listener);
            worker.send({ id, action, data });
            timeout = setTimeout(timeoutHandler, TIME_OUT_LIMIT);
        }));
    }
}

module.exports = new VmMaster();
