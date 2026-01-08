const express = require("express");
const app = express();

app.get("*", (req, res) => {
  res.status(200).send("ROOT BACKEND DETECTED - PLEASE CHECK SERVICE CONFIG");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Dummy server running on port " + PORT);
});
