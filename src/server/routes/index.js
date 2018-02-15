const { Router } = require("express");
const router = Router();
const { getFiles, getFile, saveFile, deleteFile } = require("./files");
const { login, createUser } = require("./users");
const { getMap } = require("./game");

router.get("/files/", getFiles);
router.get("/file/*", getFile);
router.post("/file/*", saveFile);
router.delete("/file/*", deleteFile);

router.post("/user", createUser);
router.post("/login", login);

router.get("/map", getMap);

module.exports = router;
