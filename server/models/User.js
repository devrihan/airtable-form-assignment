const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  airtableId: String,
  email: String,
  accessToken: String, //
  refreshToken: String, //
  tokenExpiresAt: Date,
});

module.exports = mongoose.model("User", UserSchema);
