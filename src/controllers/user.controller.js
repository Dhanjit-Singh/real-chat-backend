// const User = require("../models/User");
require("dotenv").config();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.createUser = async (req, res) => {
    try {

        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                status: false,
                message: "All fields are required"
            });
        }

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

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(401).json({
                status: false,
                message: "Email and password required",
            });
        }

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
        const { userId, token } = req.body;
        if (userId) {
            const user = await User.findById(userId);
            if (user) {
                if (token && user.fcmTokens) {
                    user.fcmTokens = user.fcmTokens.filter(t => t !== token);
                }
                user.lastSeen = new Date();
                await user.save();
            }
            // await User.findByIdAndUpdate(userId, {
            //     lastSeen: new Date()
            // });
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

// exports.getUsers = async (req, res) => {
//     res.json(await User.find());
// };

exports.getUsers = async (req, res) => {
    try {
        const loggedInUserId = req.query.userId;
        if (!loggedInUserId) {
            return res.status(400).json({ error: "userId is required" });
        }

        const users = await User.find();
        const currentUser = await User.findById(loggedInUserId);
        if (!currentUser) {
            return res.status(404).json({ error: "User not found" });
        }
        const updatedUsers = users.map(user => ({
            ...user.toObject(),

            unreadCount:
                currentUser.unreadMessages?.get(user._id.toString()) || 0
        }));

        res.json(updatedUsers);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
};
