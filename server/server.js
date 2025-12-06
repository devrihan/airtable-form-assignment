const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieSession = require("cookie-session");
require("dotenv").config();

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(
  cookieSession({
    keys: [process.env.COOKIE_KEY],
  })
);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/forms", require("./routes/forms"));
const webhooksRoute = require("./routes/webhooks");
app.use("/api/webhooks", webhooksRoute);

app.listen(process.env.PORT, () =>
  console.log(`Server running on ${process.env.PORT}`)
);
