const { BadRequest, InternalServerError, NotAcceptable, Unauthorized } = require("http-errors");
const bcrypt = require("bcrypt");
const SECRET = 'jamies-secret-TODO-change-this';
const usersDb = require("../../database/users");
const jwt = require('jsonwebtoken');
const vm = require("../../vm/vm-master");

const templateIndexFile = 
`module.exports.main = function() {
    // This is the entry point for your code, you can user 'require' to pull in your other files.
}`;

module.exports.createUser = (req, res, next) => {
    if (req.body.username && req.body.password) {
        usersDb.checkUserExists(req.body.username)
            .catch(() => { throw new InternalServerError() })
            .then((exists) => {
                if (exists) {
                    throw new NotAcceptable("User already exists with the given name");
                }
                return new Promise((resolve, reject) => {
                    bcrypt.hash(req.body.password, 10, (err, hash) => {
                        if (err) {
                            reject(new InternalServerError());
                            return;
                        }
                        usersDb.createUser(req.body.username, hash).then(resolve).catch(() => {
                            reject(new InternalServerError());
                        });
                    });
                });
            })
            .then((newUser) => {
                vm.addUsers([newUser]);
                res.json(newUser);
            })
            .catch(next);
    } else {
        next(new BadRequest("Please provide a username and password"));
    }
}

module.exports.login = (req, res, next) => {
    if (req.body.username && req.body.password) {
        usersDb.getUser(req.body.username)
            .catch(() => { throw new InternalServerError(); })
            .then(user => {
                if (!user) {
                    throw new Unauthorized();
                }
                bcrypt.compare(req.body.password, user.password, function (err, match) {
                    if (match) {
                        res.json(jwt.sign({ id: user.id, username: user.username }, SECRET));
                    } else {
                        next(new Unauthorized());
                    }
                });
            })
            .catch(next);
    } else {
        next(new BadRequest("Please provide a username and password"));
    }
}