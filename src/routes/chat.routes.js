const router = require("express").Router();
const { createChat, getChats, accessChat, createOrGetChat, resetUnreadChat } = require("../controllers/chat.controller");

router.post("/", createOrGetChat);
router.post("/access", accessChat);
router.post("/reset-unread", resetUnreadChat);


module.exports = router;
