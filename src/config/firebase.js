const admin = require("firebase-admin");
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT); // download from firebase

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;