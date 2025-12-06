const mongoose = require("mongoose");

const ResponseSchema = new mongoose.Schema(
  {
    formId: { type: mongoose.Schema.Types.ObjectId, ref: "Form" },
    airtableRecordId: String,
    answers: Object,
    status: { type: String, default: "active" }, // 'active' or 'deletedInAirtable'
  },
  { timestamps: true }
);

module.exports = mongoose.model("Response", ResponseSchema);
