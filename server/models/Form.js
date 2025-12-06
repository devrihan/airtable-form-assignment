const mongoose = require("mongoose");

// Define the structure for a single field inside the form
const FieldSchema = new mongoose.Schema({
  questionKey: { type: String, required: true },
  airtableFieldId: { type: String, required: true },
  label: { type: String, required: true },

  // --- FIX IS HERE ---
  // We removed the 'enum' restriction. Now it accepts 'url', 'email', etc.
  type: { type: String, required: true },

  // Options is an array of strings (for Select fields)
  options: { type: [String], default: [] },

  // Store conditional logic rules
  conditionalRules: {
    logic: { type: String, default: "AND" }, // 'AND' or 'OR'
    conditions: { type: Array, default: [] }, // Array of condition objects
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

  // Array of field objects
  fields: [FieldSchema],

  webhookId: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Form", FormSchema);
