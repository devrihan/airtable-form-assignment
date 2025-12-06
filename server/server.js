const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieSession = require("cookie-session");
require("dotenv").config();

const app = express();

app.set("trust proxy", true);

app.use((req, res, next) => {
  if (req.path.includes("/auth/callback")) {
    // I (Rihan) added this logging to debug issues with secure cookies behind a proxy
    console.log("Protocol:", req.protocol);
    console.log("Secure:", req.secure);
    console.log("X-Forwarded-Proto:", req.headers["x-forwarded-proto"]);
  }
  next();
});

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(express.json());

app.use(
  cookieSession({
    name: "session",
    keys: [process.env.COOKIE_KEY],
    maxAge: 24 * 60 * 60 * 1000,

    sameSite: "none",
    secure: true,
    httpOnly: true,
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
