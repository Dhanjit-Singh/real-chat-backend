const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        chat: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Chat",
            required: true,
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        text: {
            type: String,
            // required: true,
            default: "",
        },
        messageType: {
            type: String,
            enum: ["text", "image", "video", "file"],
            default: "text"
        },
        imageUrl: {
            type: String,
            default: null
        },
        imageName: {
            type: String,
            default: null
        },
        imageSize: {
            type: Number,
            default: null
        },
        imagePublicId: {  // Add this field for Cloudinary
            type: String,
            default: null
        },
        readBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
