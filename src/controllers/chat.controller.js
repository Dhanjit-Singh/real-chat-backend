const Chat = require("../models/Chat");
const User = require("../models/User");

exports.createChat = async (req, res) => {
    const chat = await Chat.create({ users: req.body.users });
    res.json(chat);
};

exports.getChats = async (req, res) => {
    const chats = await Chat.find({
        users: req.user._id,
    }).populate("users", "-password");

    res.json(chats);
};

// controllers/chat.controller.js
exports.accessChat = async (req, res) => {
    const { userId } = req.body;
    const myId = req.user._id;

    if (!userId) {
        return res.status(400).json({ message: "UserId is required" });
    }

    // 1️⃣ Check if private chat already exists
    let chat = await Chat.findOne({
        users: { $all: [myId, userId] },
    }).populate("users", "-password");

    if (chat) {
        return res.json(chat);
    }

    // 2️⃣ Create new private chat
    const newChat = await Chat.create({
        users: [myId, userId],
    });

    const fullChat = await Chat.findById(newChat._id).populate(
        "users",
        "-password"
    );

    res.status(201).json(fullChat);
};

exports.createOrGetChat = async (req, res) => {
    const { userId1, userId2 } = req.body;

    try {
        let chat = await Chat.findOne({
            users: { $all: [userId1, userId2] },
        });

        if (!chat) {
            chat = await Chat.create({
                users: [userId1, userId2],
            });
        }

        res.json(chat);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.resetUnreadChat = async (req, res) => {
    const { senderId, userId } = req.body;
    await User.findByIdAndUpdate(userId, {
        $set: { [`unreadMessages.${senderId}`]: 0 }
    });

    res.json({ success: true });
};
