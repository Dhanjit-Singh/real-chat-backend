const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isGroupChat: {
      type: Boolean,
      default: false,
    },
    groupName: {
      type: String,
    },
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    groupIcon: {
      type: String
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null
    },
  },
  { timestamps: true }
);

chatSchema.index({ users: 1 });

module.exports = mongoose.model("Chat", chatSchema);
