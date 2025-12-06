// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");
// const cookieSession = require("cookie-session");
// require("dotenv").config();

// const app = express();

// app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
// app.use(express.json());
// app.use(
//   cookieSession({
//     keys: [process.env.COOKIE_KEY],
//   })
// );

// mongoose
//   .connect(process.env.MONGO_URI)
//   .then(() => console.log("MongoDB Connected"))
//   .catch((err) => console.log(err));

// app.use("/api/auth", require("./routes/auth"));
// app.use("/api/forms", require("./routes/forms"));
// const webhooksRoute = require("./routes/webhooks");
// app.use("/api/webhooks", webhooksRoute);

// app.listen(process.env.PORT, () =>
//   console.log(`Server running on ${process.env.PORT}`)
// );
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieSession = require("cookie-session");
require("dotenv").config();

const app = express();

// 1. TRUST PROXY (REQUIRED for Render to allow secure cookies)
app.set("trust proxy", true);

app.use((req, res, next) => {
  if (req.path.includes("/auth/callback")) {
    console.log("--- DEBUG SESSION ---");
    console.log("Protocol:", req.protocol);
    console.log("Secure:", req.secure);
    console.log("X-Forwarded-Proto:", req.headers["x-forwarded-proto"]);
    console.log("---------------------");
  }
  next();
});

// 2. Update CORS to ensure it accepts your specific frontend
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(express.json());

// 3. Update Cookie Settings for Cross-Domain access
app.use(
  cookieSession({
    name: "session",
    keys: [process.env.COOKIE_KEY],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours

    // CRITICAL SETTINGS FOR VERCEL + RENDER:
    sameSite: "none", // Allow cross-site cookies
    secure: true, // Only send over HTTPS (Required for sameSite: none)
    httpOnly: true, // Prevents JS from reading the cookie
  })
);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/forms", require("./routes/forms"));
const webhooksRoute = require("./routes/webhooks");
app.use("/api/webhooks", webhooksRoute);

app.listen(process.env.PORT, () =>
  console.log(`Server running on ${process.env.PORT}`)
);
