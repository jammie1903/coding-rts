const path = require("path");
const resolveFrom = require("resolve-from");

module.exports = function (userName) {
    var Module = require('module').Module;
    const originalLoad = Module._load;
    const requiredPaths = [];
    Module._load = function (request, parent) {

        let index = parent.id.indexOf(userName);
        if (index === -1) {
            throw new Error('Module "' + request + '" is not accessible, code running outside of allowed scope. ' + parent.id);
        }

        index += userName.length + 1;
        const partialPath = parent.id.substring(index);
        const levelsDeep = (partialPath.match(/\\|\//g) || []).length;
        let regex;
        if (levelsDeep > 0) {
            regex = new RegExp(`^((\\.\\/)|(\\.\\.\\/){1,${levelsDeep}})(?!\\.\\.\\/).*$`);
        } else {
            regex = new RegExp("^(\\.\\/)(?!\\.\\.\\/).*$");
        }

        if (!regex.test(request)) {
            throw new Error('Module "' + request + '" is not accessible in ' + partialPath);
        }
        const result = originalLoad.apply(this, arguments);
        requiredPaths.push(resolveFrom(path.dirname(parent.id), request));
        return result;
    };
    return () => {
        requiredPaths.forEach(p => delete require.cache[p]);
        Module._load = originalLoad;
    }
};

