module.exports = class Game {
    constructor() {
        this.x = 3
        this.y = 2;
    }

    readOnly() {
        const keys = Object.keys(this);
        const readOnlyGame = {};
        keys.forEach(k => Object.defineProperty(readOnlyGame, k, { get: () => this[k]}));
        return readOnlyGame;
    }
}
