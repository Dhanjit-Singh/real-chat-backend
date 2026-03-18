const User = require("../models/User");
const admin = require("../config/firebase");
const Chat = require("../models/Chat");

// ✅ Save FCM Token
exports.saveToken = async (req, res) => {
    try {
        const { userId, token } = req.body;

        if (!userId || !token) {
            return res.status(400).json({ message: "Missing data" });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.fcmToken = token;
        await user.save();

        res.json({ message: "Token saved successfully" });

    } catch (error) {
        console.error("Save token error:", error);
        res.status(500).json({ message: "Server error" });
    }
};


// ✅ Send Notification (keep this as helper function)
exports.sendNotification = async (receiverId, text) => {
    try {
        const user = await User.findById(receiverId);

        if (!user?.fcmToken) return;

        await admin.messaging().send({
            token: user.fcmToken,
            notification: {
                title: "New Message",
                body: text,
            },
        });

    } catch (error) {
        console.error("FCM Error:", error);
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { chat, text, sender } = req.body;

        const message = await Message.create({
            chat,
            sender,
            text
        });

        // ✅ Get chat users
        const chatData = await Chat.findById(chat);

        // ✅ Find receiver (not sender)
        const receiverId = chatData.users.find(
            (userId) => userId.toString() !== sender
        );

        // ✅ Send notification
        await sendNotification(receiverId, text);

        res.json(message);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};