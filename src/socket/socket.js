const { Server } = require("socket.io");
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
        console.log("✅ User connected:", socket.id);

        // =========================
        // USER ONLINE
        // =========================
        socket.on("userOnline", (userId) => {
            if (!userId) return;

            socket.userId = userId;
            onlineUsers.set(userId, socket.id);

            io.emit("onlineUsers", Array.from(onlineUsers.keys()));
        });

        // =========================
        // JOIN CHAT ROOM
        // =========================
        socket.on("joinChat", (chatId) => {
            if (!chatId) return;

            console.log("📥 Joined chat:", chatId);
            socket.join(chatId);
        });

        // =========================
        // SEND MESSAGE (MAIN LOGIC)
        // =========================
        socket.on("sendMessage", async ({ chatId, senderId, text }) => {
            if (!chatId || !senderId || !text?.trim()) return;

            try {
                // console.log("📨 New message:", text);

                // 1️⃣ Create message
                let message = await Message.create({
                    chat: chatId,
                    sender: senderId,
                    text,
                });

                // 2️⃣ Populate sender
                message = await message.populate("sender", "name email");

                // 3️⃣ Update chat
                await Chat.findByIdAndUpdate(chatId, {
                    lastMessage: message._id,
                    updatedAt: new Date()
                });

                // 4️⃣ Get chat users
                const chat = await Chat.findById(chatId);

                // 5️⃣ Update unread for other users
                for (let userId of chat.users) {
                    if (userId.toString() === senderId) continue;

                    // increment unread count
                    await User.findByIdAndUpdate(userId, {
                        $inc: { [`unreadMessages.${senderId}`]: 1 }
                    });

                    // send unread notification
                    const receiverSocket = onlineUsers.get(userId.toString());

                    if (receiverSocket) {
                        io.to(receiverSocket).emit("unread_update", {
                            senderId
                        });
                    }
                }

                // 6️⃣ Emit message to chat room
                io.to(chatId).emit("receiveMessage", message);
                for (let userId of chat.users) {
                    const receiverSocket = onlineUsers.get(userId.toString());

                    if (receiverSocket) {
                        io.to(receiverSocket).emit("receiveMessage", message);
                    }
                }

            } catch (error) {
                console.error("❌ sendMessage error:", error);
            }
        });

        // =========================
        // DISCONNECT
        // =========================
        socket.on("disconnect", async () => {
            console.log("❌ User disconnected:", socket.id);

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