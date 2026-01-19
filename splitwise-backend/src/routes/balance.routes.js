const express = require("express");
const router = express.Router();
const controller = require("../controllers/balance.controller");

router.get("/balances/:userId", controller.getBalances);
router.post("/settle", controller.settle);

module.exports = router;
