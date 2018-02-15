var sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('database.db', (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Connected to SQlite database.');
  });

  db.serialize(function() {
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER, username VARCHAR(20), password VARCHAR(100), PRIMARY KEY (id)); CREATE INDEX users_username_idx ON users (username);");

  });

  module.exports = db;