const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    lastSeen: {
        type: Date
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    unreadMessages: {
        type: Map,
        of: Number,
        default: {}
    },
    contacts: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    fcmTokens: [String]
},
    { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
