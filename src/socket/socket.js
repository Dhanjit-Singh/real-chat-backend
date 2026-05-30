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
        // socket.on("sendMessage", async ({ chatId, senderId, text }) => {
        //     if (!chatId || !senderId || !text?.trim()) return;

        //     try {
        //         // console.log("📨 New message:", text);

        //         // 1️⃣ Create message
        //         let message = await Message.create({
        //             chat: chatId,
        //             sender: senderId,
        //             text,
        //         });

        //         // 2️⃣ Populate sender
        //         message = await message.populate("sender", "name email");

        //         // 3️⃣ Update chat
        //         await Chat.findByIdAndUpdate(chatId, {
        //             lastMessage: message._id,
        //             updatedAt: new Date()
        //         });

        //         // 4️⃣ Get chat users
        //         const chat = await Chat.findById(chatId);

        //         // 5️⃣ Update unread for other users
        //         for (let userId of chat.users) {
        //             if (userId.toString() === senderId) continue;

        //             // increment unread count
        //             await User.findByIdAndUpdate(userId, {
        //                 $inc: { [`unreadMessages.${senderId}`]: 1 }
        //             });

        //             // send unread notification
        //             const receiverSocket = onlineUsers.get(userId.toString());

        //             if (receiverSocket) {
        //                 io.to(receiverSocket).emit("unread_update", {
        //                     senderId
        //                 });
        //             }
        //         }

        //         // 6️⃣ Emit message to chat room
        //         io.to(chatId).emit("receiveMessage", message);
        //         for (let userId of chat.users) {
        //             const receiverSocket = onlineUsers.get(userId.toString());

        //             if (receiverSocket) {
        //                 io.to(receiverSocket).emit("receiveMessage", message);
        //             }
        //         }

        //     } catch (error) {
        //         console.error("❌ sendMessage error:", error);
        //     }
        // });


        socket.on("sendMessage", async ({ chatId, senderId, text }) => {
            if (!chatId || !senderId || !text?.trim()) return;

            try {

                let message = await Message.create({
                    chat: chatId,
                    sender: senderId,
                    text,
                });

                message = await message.populate("sender", "name email");

                // 🚀 SEND IMMEDIATELY
                io.to(chatId).emit("receiveMessage", message);

                // Run remaining tasks in background
                (async () => {
                    try {

                        await Chat.findByIdAndUpdate(chatId, {
                            lastMessage: message._id,
                            updatedAt: new Date()
                        });

                        const chat = await Chat.findById(chatId);

                        for (let userId of chat.users) {

                            if (userId.toString() === senderId) continue;

                            await User.findByIdAndUpdate(userId, {
                                $inc: {
                                    [`unreadMessages.${senderId}`]: 1
                                }
                            });

                            const receiverSocket =
                                onlineUsers.get(userId.toString());

                            if (receiverSocket) {
                                io.to(receiverSocket).emit(
                                    "unread_update",
                                    { senderId }
                                );
                            }
                        }

                    } catch (err) {
                        console.error(err);
                    }
                })();

            } catch (error) {
                console.error(error);
            }
        });

        // =========================
        // SEND IMAGE
        // =========================
        socket.on("sendImage", async ({ chatId, senderId, imageUrl, imageName, imageSize, messageId }) => {
            if (!chatId || !senderId || !imageUrl) return;

            try {
                const chat = await Chat.findById(chatId);

                // Emit image to chat room
                io.to(chatId).emit("receiveImage", {
                    _id: messageId,
                    sender: senderId,
                    chat: chatId,
                    imageUrl,
                    imageName,
                    imageSize,
                    messageType: "image",
                    createdAt: new Date()
                });

                // Also send to individual users
                for (let userId of chat.users) {
                    const receiverSocket = onlineUsers.get(userId.toString());
                    if (receiverSocket) {
                        io.to(receiverSocket).emit("receiveImage", {
                            _id: messageId,
                            sender: senderId,
                            chat: chatId,
                            imageUrl,
                            imageName,
                            imageSize,
                            messageType: "image",
                            createdAt: new Date()
                        });
                    }
                }
            } catch (error) {
                console.error("❌ sendImage error:", error);
            }
        });

        // =========================
        // CALL HANDLERS
        // =========================

        // Initiate a call
        socket.on("initiate-call", ({ to, from, fromName, chatId, callType }) => {
            const receiverSocket = onlineUsers.get(to);

            console.log(`📞 Initiate call from ${from} to ${to}, type: ${callType}`);
            console.log(`Receiver socket exists: ${!!receiverSocket}`);

            if (receiverSocket) {
                console.log(`📞 Call initiated from ${from} to ${to}, type: ${callType}`);
                io.to(receiverSocket).emit("incoming-call", {
                    from,
                    fromName,
                    chatId,
                    callType
                });

                // Also emit to caller that call is being initiated
                socket.emit("call-initiated", {
                    to,
                    chatId,
                    callType
                });
            } else {
                // User is offline
                console.log(`User ${to} is offline`);
                socket.emit("call-error", {
                    message: "User is offline"
                });
            }
        });

        // Accept a call
        socket.on("accept-call", ({ to, from, chatId }) => {
            const callerSocket = onlineUsers.get(to);

            console.log(`📞 Accept call - Caller socket: ${callerSocket}`);
            console.log(`From: ${from}, To: ${to}`);

            if (callerSocket) {
                console.log(`📞 Call accepted from ${from} to ${to}`);
                io.to(callerSocket).emit("call-accepted", {
                    from,
                    chatId
                });
            } else {
                console.log(`Caller ${to} not found in online users`);
                socket.emit("call-error", {
                    message: "Caller is no longer online"
                });
            }
        });

        // Add video track negotiation helper
        socket.on("negotiate-video", ({ to, from, sdp }) => {
            const targetSocket = onlineUsers.get(to);
            if (targetSocket) {
                io.to(targetSocket).emit("video-negotiation", {
                    from,
                    sdp
                });
            }
        });

        // Reject a call
        socket.on("reject-call", ({ to, from, chatId }) => {
            const receiverSocket = onlineUsers.get(to);

            if (receiverSocket) {
                console.log(`📞 Call rejected from ${from} to ${to}`);
                io.to(receiverSocket).emit("call-rejected", {
                    from,
                    chatId
                });
            }
        });

        // End a call
        socket.on("end-call", ({ to, from, chatId }) => {
            const receiverSocket = onlineUsers.get(to);

            if (receiverSocket) {
                console.log(`📞 Call ended from ${from} to ${to}`);
                io.to(receiverSocket).emit("call-ended", {
                    from,
                    chatId
                });
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