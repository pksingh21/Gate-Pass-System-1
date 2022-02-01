const express = require("express");
const router = express.Router();
const { ensureAuth, ensureGuest } = require("../middleware/auth");
const userController = require("../Controllers/userController");
const requestController = require("../Controllers/requestController");

router.get("/profile-page", ensureAuth, userController.getUser);
router.get("/update-form", ensureAuth, userController.getUpdateForm);
router.post("/updateMe", ensureAuth, userController.updateMe);

module.exports = router;
