const db = require("./db");

module.exports.checkUserExists = function (username) {
    return new Promise((resolve, reject) => {
        db.get("select username from users where username = ?", [username], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(!!row);
            }
        })
    });
}

module.exports.createUser = function (username, password) {
    return new Promise((resolve, reject) => {
        db.run("INSERT INTO users (username, password) values (?, ?)", [username, password], function(err)  {
            if (err) {
                reject(err);
            } else {
                resolve({id: this.lastID, username});
            }
        })
    });
}
module.exports.getUsers = function () {
    return new Promise((resolve, reject) => {
        db.all("select id, username from users", [], (err, rows) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
}

module.exports.getUser = function (username) {
    return new Promise((resolve, reject) => {
        db.get("select * from users where username = ?", [username], (err, row) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(row);
            }
        });
    });
}