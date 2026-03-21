const router = require("express").Router();
const { saveToken, sendNotification } = require("../controllers/notification.controller");

router.post("/save-token", saveToken);

router.post("/test", async (req, res) => {
    try {
        const { receiverId, text } = req.body;

        await sendNotification(receiverId, text);

        res.json({ message: "Notification sent" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error sending notification" });
    }
});

module.exports = router;
