const router = require("express").Router();
const { createChat, getChats, accessChat, createOrGetChat } = require("../controllers/chat.controller");

router.post("/", createOrGetChat);
router.post("/access", accessChat);


module.exports = router;
