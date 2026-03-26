// const User = require("../models/User");
require("dotenv").config();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Chat = require("../models/Chat");

exports.createUser = async (req, res) => {
    try {

        let { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                status: false,
                message: "All fields are required"
            });
        }

        email = email.trim().toLowerCase();
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                status: false,
                message: "User already exist"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashedPassword
        });

        return res.status(201).json({
            status: true,
            message: "User created successfully.",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: "Server error",
            error: error.message
        });
    }
};

exports.login = async (req, res) => {
    try {

        let { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: false,
                message: "Email and password required",
            });
        }

        email = email.trim().toLowerCase();
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                status: false,
                message: "User not found!"
            });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                status: false,
                message: "Invalid email or password",
            });
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
        );

        user.lastSeen = null;
        user.isOnline = true;
        await user.save();

        return res.status(200).json({
            status: true,
            message: "User logged in successfully.",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            },
        });

    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "Something went wrong while login",
            error: error.message
        });
    }
};

exports.logout = async (req, res) => {
    try {
        const { userId, fcmToken } = req.body;
        if (userId) {
            const user = await User.findById(userId);
            if (user) {
                if (fcmToken) {
                    user.fcmTokens = user.fcmTokens.filter(t => t !== fcmToken);
                }
                user.lastSeen = new Date();
                user.isOnline = false;
                await user.save();
            }
        }
        return res.status(200).json({
            status: true,
            message: "Logout successful."
        })
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "Logout failed."
        });
    }
};

exports.getContacts = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                status: false,
                message: "userId is required"
            });
        }

        const user = await User.findById(userId)
            .populate("contacts", "name email");

        if (!user) {
            return res.status(404).json({
                status: false,
                message: "User not found"
            });
        }

        const contactsWithUnread = user.contacts.map(contact => ({
            ...contact.toObject(),
            unreadCount:
                user.unreadMessages?.get(contact._id.toString()) || 0
        }));

        return res.json({
            status: true,
            data: contactsWithUnread
        });

    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "Server error"
        });
    }
};


exports.addFriend = async (req, res) => {
    try {
        const { userId, email, name } = req.body;

        if (!userId || (!email && !name)) {
            return res.status(400).json({
                status: false,
                message: "userId and (email or name) are required"
            });
        }

        const friend = await User.findOne({
            $or: [
                email ? { email } : null,
                name ? { name } : null
            ].filter(Boolean)
        });

        if (!friend) {
            return res.status(404).json({
                status: false,
                message: "Friend not found"
            });
        }

        if (friend._id.toString() === userId) {
            return res.status(400).json({
                status: false,
                message: "Cannot add yourself"
            });
        }

        // ✅ CHECK CHAT FIRST
        let chat = await Chat.findOne({
            users: { $all: [userId, friend._id] }
        });

        // ✅ CREATE CHAT IF NOT EXISTS
        if (!chat) {
            chat = await Chat.create({
                users: [userId, friend._id],
                lastMessage: null,
                unreadCount: 0
            });
        }

        // ✅ OPTIONAL: Friend logic (if you store friends)
        // Don't block response here

        return res.status(200).json({
            status: true,
            message: chat ? "Chat ready" : "Friend added successfully",
            friend: {
                id: friend._id,
                name: friend.name,
                email: friend.email
            },
            chat
        });

    } catch (error) {
        console.log("addFriend error:", error);
        res.status(500).json({
            status: false,
            message: "Server error"
        });
    }
};