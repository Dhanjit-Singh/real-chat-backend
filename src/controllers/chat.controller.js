const Chat = require("../models/Chat");
const User = require("../models/User");

exports.createChat = async (req, res) => {
    try {
        const chat = await Chat.create({
            users: req.body.users,
            isGroup: false
        });

        res.json(chat);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getChats = async (req, res) => {
    const chats = await Chat.find({
        users: req.user._id,
    }).populate("users", "-password");

    res.json(chats);
};

// controllers/chat.controller.js
exports.accessChat = async (req, res) => {
    try {
        const { userId } = req.body;
        const myId = req.user._id;

        if (!userId) {
            return res.status(400).json({
                status: false,
                message: "UserId is required"
            });
        }

        if (userId.toString() === myId.toString()) {
            return res.status(400).json({
                status: false,
                message: "Cannot chat with yourself"
            });
        }

        // 🔍 Find existing 1-to-1 chat
        let chat = await Chat.findOne({
            isGroup: false,
            users: { $all: [myId, userId] },
            $expr: { $eq: [{ $size: "$users" }, 2] } // 👈 IMPORTANT
        })
            .populate("users", "-password")
            .populate({
                path: "lastMessage",
                populate: {
                    path: "sender",
                    select: "name email"
                }
            });

        // ✅ If exists → return
        if (chat) {
            return res.json(chat);
        }

        // ✅ Create new chat
        const newChat = await Chat.create({
            isGroup: false,
            users: [myId, userId],
        });

        const fullChat = await Chat.findById(newChat._id)
            .populate("users", "-password");

        res.status(201).json(fullChat);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: false,
            message: "Error accessing chat"
        });
    }
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
    try {
        const { senderId, userId } = req.body;

        if (!senderId || !userId) {
            return res.status(400).json({
                status: false,
                message: "senderId and userId are required"
            });
        }

        // ✅ Find chat between both users
        const chat = await Chat.findOne({
            users: { $all: [senderId, userId] }
        });

        if (!chat) {
            return res.status(404).json({
                status: false,
                message: "Chat not found"
            });
        }

        // ✅ Reset unread count
        chat.unreadCount = 0;
        await chat.save();

        return res.status(200).json({
            status: true,
            message: "Unread reset successfully"
        });

    } catch (error) {
        console.error("❌ resetUnread error FULL:", error);

        return res.status(500).json({
            status: false,
            message: error.message   // 👈 show real error
        });
    }
};


exports.getUserChats = async (req, res) => {
    try {
        const myId = req.query.userId;

        const chats = await Chat.find({
            users: { $in: [myId] }   // ✅ only my chats
        })
            .populate("users", "-password")
            .populate({
                path: "lastMessage",
                populate: {
                    path: "sender",
                    select: "name email"
                }
            })
            .sort({ updatedAt: -1 });

        // 🔥 Attach unread count manually
        const user = await User.findById(myId).select("unreadMessages");

        const chatsWithUnread = chats.map(chat => {
            const otherUser = chat.users.find(
                u => u._id.toString() !== myId.toString()
            );

            return {
                ...chat._doc,
                unreadCount: user?.unreadMessages?.[otherUser?._id] || 0
            };
        });

        res.json(chatsWithUnread);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: false,
            message: "Error fetching chats"
        });
    }
};
