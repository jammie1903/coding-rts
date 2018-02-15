const {map} = require("../../game");

module.exports.getMap = function(req, res, next) {
    res.json(map.toOverview());
}