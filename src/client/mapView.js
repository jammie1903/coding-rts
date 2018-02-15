let mainCanvas = document.getElementById("mainCanvas");
var mainCtx = mainCanvas.getContext("2d");

const viewWidth = 800;
const viewHeight = 800;

let canvas = document.createElement('canvas');
canvas.width = viewWidth;
canvas.height = viewHeight;
let ctx = canvas.getContext('2d');

requestAnimationFrame = window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    setTimeout;

const boxSize = 4;
let pos = {
    x: 0,
    y: 0
};

ctx.strokeStyle = "rgb(212, 212, 212)";

let canvasLeft = canvas.offsetLeft;
let canvasTop = canvas.offsetTop;

let grid, roomWidth, roomHeight;

$.ajax({
    dataType: "json",
    url: "http://localhost:3000/map",
    headers: {
        "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidXNlcm5hbWUiOiJ0ZXN0MSIsImlhdCI6MTUxODEwMzAxOH0.uIbYP1DbVSoFA1EF7JXp84ZNMoZsHMvS8C85tqW8aKE"
    },
    success: handleResponse
  });



function handleResponse(response) {
    grid = response.data.rooms;
    roomWidth = response.data.roomWidth;
    roomHeight = response.data.roomHeight;
    draw();
}


function draw() {
    ctx.clearRect(0, 0, viewWidth, viewHeight);

    let links = [];
    for(let room of grid) {
        ctx.strokeRect(room.x * roomWidth * boxSize, room.y * roomHeight * boxSize, roomWidth * boxSize, roomHeight * boxSize); 
        for (let link of room.links) {
            for(let tile of link.tiles) {
                links.push({x: room.x * roomWidth + tile.x, y: room.y * roomHeight + tile.y});
            }
        }
    }

    ctx.fillStyle = "rgb(18, 228, 76)";
    for (let link of links) {
        ctx.fillRect(link.x * boxSize, link.y * boxSize, boxSize, boxSize);
    }

    mainCtx.drawImage(canvas, 0, 0, viewWidth, viewHeight, 0, 0, viewWidth, viewHeight);
}

// playing = true;

// let delta = 500;
// let increment = 0;
// let lastTime = new Date();

// function step() {
//     if (playing) {
//         increment += new Date().getTime() - lastTime;
//         lastTime = new Date();
//         while (increment >= delta) {
//             update();
//             increment -= delta;
//         }
//     }
//     draw();

//     requestAnimationFrame(step, canvas);
// };
// step();