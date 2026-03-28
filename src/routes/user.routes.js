const router = require("express").Router();
const { createUser, login, logout, getContacts, addFriend, getUser } = require("../controllers/user.controller");

router.post("/create", createUser);
router.post("/login", login);
router.post("/logout", logout);
router.post("/add-friend", addFriend);
router.get("/contacts", getContacts);
router.get("/get-user/:userId", getUser);

module.exports = router;
