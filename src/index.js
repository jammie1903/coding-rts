
const vm = require("./vm/vm-master");
const server = require("./server")();

const usersDb = require("./database/users");
const game = require("./game/game").getInstance();
game.initMap();

usersDb.getUsers().then(users => vm.addUsers(users))
    .then(()=> vm.sendMap(game.map))
    .then(() => cycle());

function cycle() {
    const timer = new Date().getTime();
    vm.processUsers().then((results) => {
        console.log(JSON.stringify(results.message, null, " "));
        //return;
        const runTime = new Date().getTime() - timer;
        console.log(runTime, Math.max(0,  1000 - runTime));
        //TODO results should probably be stored somewhere
        setTimeout(cycle, Math.max(0, 1000 - runTime));
    });
}




