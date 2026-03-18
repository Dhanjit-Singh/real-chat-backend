
console.log("🚀 SERVER FILE LOADED");

require("dotenv").config();
// const express = require("express");
const http = require("http");
// const { Server } = require("socket.io");
const mongoose = require("mongoose");

const app = require("./src/app");
const server = http.createServer(app);

require("./src/socket/socket")(server);

/* 🔹 MONGODB */
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => {
        console.error("❌ MongoDB error:", err);
        process.exit(1);
    });

/* 🔹 START SERVER (THIS WAS THE ISSUE) */
const PORT = 5000;
server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});

