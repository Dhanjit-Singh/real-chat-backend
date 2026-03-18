const User = require("../models/User");
const admin = require("../config/firebase");

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