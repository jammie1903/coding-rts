const state = {};

module.exports.state = state;

module.exports.getObjectData = function (player, objectName) {
    return (state[player] || {})[objectName];
}