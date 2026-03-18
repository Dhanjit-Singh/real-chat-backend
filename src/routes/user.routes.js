const router = require("express").Router();
const { createUser, login, logout, getUsers } = require("../controllers/user.controller");

router.post("/create", createUser);
router.post("/login", login);
router.post("/logout", logout);

router.get("/", getUsers);

module.exports = router;
