const express = require("express");
const axios = require("axios");
const crypto = require("crypto"); // Built-in Node module
const User = require("../models/User");
const router = express.Router();

// Helper to generate random string
const generateRandomString = (length) => {
  return crypto.randomBytes(length).toString("hex");
};

// Helper for PKCE Code Challenge
const generateCodeChallenge = (verifier) => {
  return crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

// Store verifiers temporarily (In memory for simplicity)
// In production, use Redis or a database with a short expiration
const pendingVerifiers = new Map();

// 1. Redirect to Airtable with PKCE
router.get("/airtable", (req, res) => {
  const scope =
    "data.records:read data.records:write schema.bases:read webhook:manage";
  const state = generateRandomString(16);
  const codeVerifier = generateRandomString(32);
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Save verifier mapped to state so we can retrieve it in callback
  pendingVerifiers.set(state, codeVerifier);

  const params = new URLSearchParams({
    client_id: process.env.AIRTABLE_CLIENT_ID,
    redirect_uri: process.env.REDIRECT_URI,
    response_type: "code",
    scope: scope,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const url = `https://airtable.com/oauth2/v1/authorize?${params.toString()}`;
  console.log("Redirecting with PKCE:", url);
  res.redirect(url);
});

// 2. Callback from Airtable
router.get("/callback", async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    console.error("Airtable Error:", error, error_description);
    return res.status(400).send(`Login Failed: ${error_description}`);
  }

  // Retrieve the code_verifier using the state
  const codeVerifier = pendingVerifiers.get(state);
  if (!codeVerifier) {
    return res
      .status(400)
      .send("Invalid state or session expired. Please try again.");
  }
  pendingVerifiers.delete(state); // Clean up

  const encodedCreds = Buffer.from(
    `${process.env.AIRTABLE_CLIENT_ID}:${process.env.AIRTABLE_CLIENT_SECRET}`
  ).toString("base64");

  try {
    const response = await axios.post(
      "https://airtable.com/oauth2/v1/token",
      new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: process.env.REDIRECT_URI,
        code_verifier: codeVerifier, // PKCE Requirement
      }),
      {
        headers: {
          Authorization: `Basic ${encodedCreds}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    const me = await axios.get("https://api.airtable.com/v0/meta/whoami", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    let user = await User.findOneAndUpdate(
      { airtableId: me.data.id },
      {
        email: me.data.email,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
      },
      { new: true, upsert: true }
    );

    req.session.userId = user._id;
    res.redirect(`${process.env.CLIENT_URL}/builder`);
  } catch (err) {
    console.error("Token Exchange Error:", err.response?.data || err.message);
    res.status(500).send("Login Failed during Token Exchange");
  }
});

router.get("/me", async (req, res) => {
  if (!req.session.userId) return res.status(401).json(null);
  const user = await User.findById(req.session.userId);
  res.json(user);
});

module.exports = router;
