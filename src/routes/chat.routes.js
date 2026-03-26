const router = require("express").Router();
const { createChat, getChats, accessChat, createOrGetChat, resetUnreadChat, getUserChats } = require("../controllers/chat.controller");

router.get("/", getUserChats);
// router.post("/create", createOrGetChat);
router.post("/access", accessChat);
router.post("/reset-unread", resetUnreadChat);


module.exports = router;
