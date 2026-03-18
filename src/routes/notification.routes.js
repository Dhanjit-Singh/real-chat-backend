const router = require("express").Router();
const { saveToken } = require("../controllers/notification.controller");

router.post("/save-token", saveToken);


module.exports = router;
