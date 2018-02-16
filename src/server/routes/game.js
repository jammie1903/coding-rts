const { BadRequest } = require("http-errors");
const { map } = require("../../game");

module.exports.getMap = function (req, res, next) {
    res.json(map.toOverview());
}

module.exports.getRoom = function (req, res, next) {
    const x = Number(req.query.x);
    const y = Number(req.query.y);
    if (isNaN(x) || isNaN(y) || x < 0 || y < 0 || map.width <= x || map.height <= y) {
        throw new BadRequest("Co-ordinates are not valid");
    }
    res.json(map.roomOverview(x, y));
}