const express = require("express");
const app = express();

app.use(express.json());

app.use("/subscribe", require("../routes/subscription.routes"));
app.use("/inventory", require("../routes/inventory.routes"));

app.get("/", (req, res) => {
  res.send("Notification service is running");
});


app.listen(3000, () => {
  console.log("Server running on port 3000");
});
