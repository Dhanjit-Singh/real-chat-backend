const mongoose = require("mongoose");

const chatRoomSchema = new mongoose.Schema(
    {
        isGroup: {
            type: Boolean,
            default: false,
        },
        users: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        lastMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("ChatRoom", chatRoomSchema);
