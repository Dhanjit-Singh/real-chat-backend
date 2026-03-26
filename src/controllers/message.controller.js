const Message = require("../models/Message");
const Chat = require("../models/Chat");
const User = require("../models/User");
const { sendNotification } = require("./notification.controller");

exports.sendMessage = async (req, res) => {

    try {
        const { chatId, text } = req.body;
        const senderId = req.user._id;

        if (!chatId || !text) {
            return res.status(400).json({
                status: false,
                message: "chatId and text are required"
            });
        }

        // ✅ Create message
        let message = await Message.create({
            sender: senderId,
            chat: chatId,
            text
        });

        // ✅ Populate message
        message = await message.populate([
            { path: "sender", select: "name email" },
            { path: "chat" }
        ]);

        // ✅ Update last message in chat
        await Chat.findByIdAndUpdate(chatId, {
            lastMessage: message._id
        });

        // ✅ Get chat users
        const chat = await Chat.findById(chatId);

        // ✅ Find receiver (other user)
        const receiverId = chat.users.find(
            (u) => u.toString() !== senderId.toString()
        );

        // ✅ Increment unread count
        await User.findByIdAndUpdate(receiverId, {
            $inc: { [`unreadMessages.${senderId}`]: 1 }
        });

        // ✅ Send push notification
        await sendNotification(receiverId, text);

        res.json({
            status: true,
            message
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: false,
            message: "Error sending message"
        });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const { chatId } = req.params;

        const messages = await Message.find({ chat: chatId })
            .populate("sender", "name email")
            .sort({ createdAt: 1 }); // oldest → newest

        res.json(messages);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: false,
            message: "Error fetching messages"
        });
    }
};
