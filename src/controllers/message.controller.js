const Message = require("../models/Message");
const { sendNotification } = require("./notification.controller");

exports.sendMessage = async (req, res) => {

    try {
        const { chat, text, sender } = req.body;

        const message = await Message.create({
            chat,
            sender,
            text
        });

        await sendNotification(receiverId, text);

        res.json(message);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getMessages = async (req, res) => {
    res.json(
        await Message.find({ chat: req.params.chatId }).populate(
            "sender",
            "name"
        )
    );
};
