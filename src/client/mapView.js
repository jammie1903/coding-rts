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

let grid, /*roomTiles,*/ roomWidth, roomHeight;

$.ajax({
    dataType: "json",
    url: "http://localhost:3000/map",
    headers: {
        "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidXNlcm5hbWUiOiJ0ZXN0MSIsImlhdCI6MTUxODEwMzAxOH0.uIbYP1DbVSoFA1EF7JXp84ZNMoZsHMvS8C85tqW8aKE"
    },
    success: handleMapResponse
});

function handleMapResponse(response) {
    grid = response.data.rooms;
    roomWidth = response.data.roomWidth;
    roomHeight = response.data.roomHeight;
    drawMap();
}

function handleRoomResponse(response, coords) {
    //roomTiles = response.data;
    drawRoom( response.data, coords);
}

mainCanvas.addEventListener('click', function (event) {
    let x = (event.offsetX - canvasLeft);
    let y = (event.offsetY - canvasTop);
    onClick(x, y);
}, false);

function onClick(x, y) {
    if (view === "map") {
        let coords = { x: Math.floor(x / roomWidth / boxSize), y: Math.floor(y / roomHeight / boxSize) };
        //ctx.fillStyle = "rgb(255, 255, 255)";
        //ctx.fillRect(0, 0, viewWidth, viewHeight);
        //view = "";
        $.ajax({
            dataType: "json",
            url: `http://localhost:3000/map/room?x=${coords.x}&y=${coords.y}`,
            headers: {
                "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidXNlcm5hbWUiOiJ0ZXN0MSIsImlhdCI6MTUxODEwMzAxOH0.uIbYP1DbVSoFA1EF7JXp84ZNMoZsHMvS8C85tqW8aKE"
            },
            success: (response) => handleRoomResponse(response, coords)
        });
    } else if(view === "room") {
        drawMap();
    }
}

function drawRoom(roomTiles, coords) {
    //ctx.fillStyle = "rgb(255, 255, 255)";
    //ctx.fillRect(0, 0, viewWidth, viewHeight);

    ctx.fillStyle = "rgb(128, 128, 128)";
    let links = [];
    for (let tile of roomTiles) {
        if(tile.link) {
            links.push(tile);
        } else if(tile.wall) {
            ctx.fillRect((coords.x * roomWidth + tile.x) * boxSize, (coords.y * roomHeight + tile.y) * boxSize, boxSize, boxSize);
        }
    }

    ctx.fillStyle = "rgb(18, 228, 76)";
    for (let link of links) {
        ctx.fillRect((coords.x * roomWidth + link.x) * boxSize, (coords.y * roomHeight + link.y) * boxSize, boxSize, boxSize);
    }

    mainCtx.drawImage(canvas, 0, 0, viewWidth, viewHeight, 0, 0, viewWidth, viewHeight);
   // view = "room";
}

function drawMap() {
    ctx.fillStyle = "rgb(255, 255, 255)";
    ctx.fillRect(0, 0, viewWidth, viewHeight);


    let links = [];
    for (let room of grid) {
        ctx.strokeRect(room.x * roomWidth * boxSize, room.y * roomHeight * boxSize, roomWidth * boxSize, roomHeight * boxSize);
        for (let link of room.links) {
            for (let tile of link.tiles) {
                links.push({ x: room.x * roomWidth + tile.x, y: room.y * roomHeight + tile.y });
            }
        }
    }

    ctx.fillStyle = "rgb(18, 228, 76)";
    for (let link of links) {
        ctx.fillRect(link.x * boxSize, link.y * boxSize, boxSize, boxSize);
    }

    mainCtx.drawImage(canvas, 0, 0, viewWidth, viewHeight, 0, 0, viewWidth, viewHeight);
    view = "map";
}
