const chance = new require("chance")();

module.exports = class Player {
    constructor(user) {
        this.id = user.id;
        this.name = user.username;
        this.units = {};
        this.structures = {};
        this.color = chance.color({format: '0x'});
    }

    getUnitNames() {
        return Object.keys(this.units);
    }

    limited(user) {
        const self = this;
        const returnValue = {
            get id() { return self.id },
            get name() { return self.name },
        };
        if (user && user.id == this.id) {
            returnValue.units = Object.keys(this.units).reduce((acc, unitName) => {
                acc[unitName] = this.units[unitName].limited(returnValue);
                return acc;
            }, {});
            returnValue.structures = Object.keys(this.structures).reduce((acc, structureName) => {
                acc[structureName] = this.structures[structureName].limited(returnValue);
                return acc;
            }, {});
            returnValue.getUnitNames = () => this.getUnitNames();
        }
        return returnValue;
    }
}