const mongoose = require("mongoose");

const FieldSchema = new mongoose.Schema({
  questionKey: { type: String, required: true },
  airtableFieldId: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, required: true },
  options: { type: [String], default: [] },
  conditionalRules: {
    logic: { type: String, default: "AND" },
    conditions: { type: Array, default: [] },
  },
});

const FormSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  baseId: { type: String, required: true },
  tableId: { type: String, required: true },
  title: { type: String, default: "Untitled Form" },

  fields: [FieldSchema],

  webhookId: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Form", FormSchema);
