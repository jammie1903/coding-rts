const bunyan = require("bunyan");

const appName  = "My App";
const logLevel = "debug";

module.exports = bunyan.createLogger({name: appName, level: logLevel});
