const { Server, Socket } = require("socket.io");
const Message = require("../models/Message");
const User = require("../models/User");
const Chat = require("../models/Chat");

module.exports = (server) => {
    const io = new Server(server, {
        cors: {
            origin: [
                "http://localhost:3000",
                "https://dhanjit-singh.github.io",
            ],
            methods: ["GET", "POST"],
            credentials: true
        },
    });

    const onlineUsers = new Map();

    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);

        socket.on("userOnline", (userId) => {
            if (!userId) return;
            socket.userId = userId;
            onlineUsers.set(userId, socket.id);

            io.emit("onlineUsers", Array.from(onlineUsers.keys()));
        });

        socket.on("joinChat", (chatId) => {
            socket.join(chatId);
        });

        socket.on("sendMessage", async ({ chatId, senderId, text }) => {
            if (!text?.trim()) return;

            const message = await Message.create({
                chat: chatId,
                sender: senderId,
                text,
            });

            await Chat.findByIdAndUpdate(chatId, {
                lastMessage: message._id
            });

            const chat = await Chat.findById(chatId);

            for (let userId of chat.users) {
                if (userId.toString() === senderId) continue;

                await User.findByIdAndUpdate(userId, {
                    $inc: { [`unreadMessages.${senderId}`]: 1 }
                });

                const receiverSocket = onlineUsers.get(userId.toString());
                if (receiverSocket) {
                    io.to(receiverSocket).emit("unread_update", {
                        senderId
                    });
                }
            }

            io.to(chatId).emit("receiveMessage", message);
        });

        socket.on("disconnect", async () => {
            console.log("User disconnected", socket.id);

            const userId = socket.userId;
            if (userId) {
                await User.findByIdAndUpdate(userId, {
                    lastSeen: new Date()
                });
                onlineUsers.delete(userId);
            }

            io.emit("onlineUsers", Array.from(onlineUsers.keys()));
        });
    });
};