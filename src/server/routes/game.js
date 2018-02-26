const { BadRequest, NotFound } = require("http-errors");
const { getObjectData } = require("../../game/state");
const game = require("../../game/game").getInstance();

module.exports.getMap = function (req, res, next) {
    res.json(game.map.toOverview());
}

module.exports.getRoom = function (req, res, next) {
    const x = Number(req.query.x);
    const y = Number(req.query.y);
    if (isNaN(x) || isNaN(y) || x < 0 || y < 0 || game.map.width <= x || game.map.height <= y) {
        throw new BadRequest("Co-ordinates are not valid");
    }
    res.json(game.map.roomOverview(x, y));
}

module.exports.getMainRoom = function (req, res, next) {
    const data = getObjectData(req.user.username, "structure:Base");
    if (data && data.room) {
        res.json({ x: data.room.x, y: data.room.y });
    } else {
        throw new NotFound("Could not find Base for current user");
    }
}