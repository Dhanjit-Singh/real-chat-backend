const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    lastSeen: Date,
    fcmTokens: [
        {
            type: String,
        }
    ]
});

module.exports = mongoose.model("User", userSchema);
