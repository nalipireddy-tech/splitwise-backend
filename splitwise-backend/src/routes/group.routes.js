

const express = require("express");
const router = express.Router();
const controller = require("../controllers/group.controller");

router.post("/groups", controller.createGroup);
router.post("/groups/:id/users", controller.addUser);

module.exports = router;
