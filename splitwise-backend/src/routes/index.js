const express = require("express");
const router = express.Router();

router.use(require("./user.routes"));
router.use(require("./group.routes"));
router.use(require("./expense.routes"));
router.use(require("./balance.routes"));

module.exports = router;
