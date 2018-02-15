
const vm = require("./vm/vm-master");
const server = require("./server")();

const usersDb = require("./database/users");

usersDb.getUsers().then(users => vm.addUsers(users))
    .then(() => cycle());

function cycle() {
    const timer = new Date().getTime();
    vm.processUsers().then((results) => {
        const runTime = new Date().getTime() - timer;
        console.log(runTime, Math.max(0,  1000 - runTime));
        //TODO results should probably be stored somewhere
        setTimeout(cycle, Math.max(0, 1000 - runTime));
    });
}




