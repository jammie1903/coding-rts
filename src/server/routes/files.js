const fs = require("fs");
const fse = require("fs-extra");
const path = require('path');
const root = path.resolve("./user-scripts");
const deleteEmpty = require('delete-empty');

const BOOTSTRAP_FILE = "__bootstrap.js";

const vm = require("../../vm/vm-master");

const { BadRequest, InternalServerError, NotAcceptable, Unauthorized, NotFound } = require("http-errors");

if (!fs.existsSync(root)) {
    fs.mkdirSync(root);
}

function getFilePath(req, next) {
    let filePath = req.path.substring(5);
    if (!filePath) {
        next(new BadRequest("path is required"));
        return null;
    }
    filePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
    if (!filePath || filePath.substring(1) === BOOTSTRAP_FILE) {
        next(new BadRequest("path is invalid"));
        return null;
    }
    return path.join(root, 'user-' + req.user.id, filePath);
}

function dirTree(filename, root = true) {
    const stats = fs.lstatSync(filename),
        info = {
            name: path.basename(filename)
        };

    if (stats.isDirectory()) {
        info.type = "folder";
        info.children = fs.readdirSync(filename)
            .filter(child => !root || child !== BOOTSTRAP_FILE)
            .map(child => dirTree(filename + '/' + child, false));
    } else {
        info.type = "file";
    }

    return info;
}

module.exports.getFiles = (req, res, next) => {
    const mainFolder = path.join(root, 'user-' + req.user.id);
    if (!fs.lstatSync(mainFolder).isDirectory()) {
        res.json({});
    } else {
        res.json(dirTree(mainFolder))
    }
}

module.exports.getFile = (req, res, next) => {
    const dir = getFilePath(req, next)

    if (dir && fs.statSync(dir).isFile()) {
        res.json(fs.readFileSync(dir, 'utf8'));
    } else {
        next(new NotFound("file does not exist"));
    }
}

module.exports.saveFile = (req, res, next) => {
    const dir = getFilePath(req, next)
    if (dir) {
        fse.outputFileSync(dir, req.body);
        vm.refreshUserCode({id: req.user.id, name: req.user.username})
            .then(() => res.json("success"))
            .catch((e) => { console.log(e); res.json("save successful, but running code could not be updated") });
    }
}

module.exports.deleteFile = (req, res, next) => {
    const dir = getFilePath(req, next)
    if (dir) {
        try {
            fs.unlinkSync(dir);
            deleteEmpty.sync(path.join(root, 'user-' + req.user.id), { verbose: false });
            vm.refreshUserCode({id: req.user.id, name: req.user.username})
                .then(() => res.json("success"))
                .catch((e) => { console.log(e); res.json("delete successful, but running code could not be updated") });
        } catch (e) {
            if (e.code === 'ENOENT') {
                next(new NotFound("file does not exist"));
            } else {
                next(new InternalServerError());
            }
        }
    }
}