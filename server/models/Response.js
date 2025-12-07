const mongoose = require("mongoose");
//links a formId to an airtableRecordId

const ResponseSchema = new mongoose.Schema(
  {
    formId: { type: mongoose.Schema.Types.ObjectId, ref: "Form" },
    airtableRecordId: String,
    answers: Object,
    status: { type: String, default: "active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Response", ResponseSchema);
