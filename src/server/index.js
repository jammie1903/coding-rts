const express = require("express");
const bodyParser = require("body-parser");
const logger = require("../util/logger");
const router = require("./routes");
const HttpError = require("http-errors");
const { InternalServerError, Forbidden, NotFound } = HttpError
const expressJwt = require('express-jwt');

module.exports = function () {
    const app = express();

    app.use((req, res, next) => {
        const jsonFunction = res.json;
        res.json = function (...args) {
            args[args.length - 1] = {
                data: args[args.length - 1]
            };
            return jsonFunction.apply(this, args);
        };
        next();
    });

    app.use(bodyParser.json({ type: 'application/json' }));
    app.use(bodyParser.text({ type: ['text/plain', 'application/javascript'] }))

    app.use(expressJwt({ secret: 'jamies-secret-TODO-change-this'}).unless({path: ['/login', '/user']}));

    app.all("*", function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
        res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Authorization, Origin, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, token");
        if (req.method === "OPTIONS") {
            res.send();
        } else {
            next();
        }
    });

    app.use("/", router);

    app.use((req, res, next) => {
        next(new NotFound());
    });

    app.use((err, req, res, next) => {
        logger.error({ error: err }, err.stack);
        if (err instanceof HttpError) {
            res.status(err.status);
            res.json(err);
        } else if (err.status && err.message) {
            const httpErr = new HttpError(err.status, err.message);
            res.status(httpErr.status);
            res.json(httpErr);
        } else {
            const httpErr = new InternalServerError();
            res.status(httpErr.status);
            res.json(httpErr);
        }
    });
    
    app.listen(3000);

    return app;
}