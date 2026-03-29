const mongoose = require("mongoose");
const Message = require("../models/Message");
const Chat = require("../models/Chat");
const User = require("../models/User");
const path = require("path");
const fs = require("fs");
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
            text,
            messageType: "text",
            readBy: [senderId]
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
        if (receiverId) {
            await User.findByIdAndUpdate(receiverId, {
                $inc: { [`unreadMessages.${senderId}`]: 1 }
            });
        }

        // ✅ Send push notification
        // await sendNotification(receiverId, text);

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

exports.sendImage = async (req, res) => {
    try {
        
        const { chatId, senderId, text } = req.body;
        const imageFile = req.file;

        if (!chatId || !senderId) {
            return res.status(400).json({
                status: false,
                message: "chatId and senderId are required"
            });
        }

        if (!imageFile) {
            return res.status(400).json({
                status: false,
                message: "Image file is required"
            });
        }

        const imageUrl = `/uploads/images/${imageFile.filename}`;

        let message = await Message.create({
            sender: senderId,
            chat: chatId,
            text: text || "", // Empty text for image message
            messageType: "image",
            imageUrl: imageUrl,
            imageName: imageFile.originalname,
            imageSize: imageFile.size,
            readBy: [senderId]
        });

        message = await message.populate([
            { path: "sender", select: "name email" },
            { path: "chat" }
        ]);

        await Chat.findByIdAndUpdate(chatId, {
            lastMessage: message._id
        });

        const chat = await Chat.findById(chatId);

        const receiverId = chat.users.find(
            (u) => u.toString() !== senderId.toString()
        );

        if (receiverId) {
            await User.findByIdAndUpdate(receiverId, {
                $inc: { [`unreadMessages.${senderId}`]: 1 }
            });
        }

        res.json({
            status: true,
            message: message
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: false,
            message: "Error while sending image",
            error: error.message
        });
    }
};

exports.deleteImage = async (req, res) => {
    try {
        const { messageId } = req.params;
        
        const message = await Message.findById(messageId);
        
        if (!message || message.messageType !== 'image') {
            return res.status(404).json({
                status: false,
                message: "Image message not found"
            });
        }
        
        // Check if user is authorized to delete
        if (message.sender.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: false,
                message: "Not authorized to delete this message"
            });
        }
        
        // Delete the physical file
        if (message.imageUrl) {
            const imagePath = path.join(__dirname, "..", message.imageUrl);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }
        
        // Delete the message
        await Message.findByIdAndDelete(messageId);
        
        res.json({
            status: true,
            message: "Image deleted successfully"
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: false,
            message: "Error while deleting image"
        });
    }
};
