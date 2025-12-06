const express = require("express");
const axios = require("axios");
const Form = require("../models/Form");
const User = require("../models/User");
const Response = require("../models/Response");
const router = express.Router();

// Middleware to get current user
const requireAuth = async (req, res, next) => {
  if (!req.session.userId) return res.status(401).send("Unauthorized");
  req.user = await User.findById(req.session.userId);
  next();
};

// Get User's Bases
router.get("/bases", requireAuth, async (req, res) => {
  try {
    const response = await axios.get("https://api.airtable.com/v0/meta/bases", {
      headers: { Authorization: `Bearer ${req.user.accessToken}` },
    });
    res.json(response.data.bases);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// Get Tables in a Base
// router.get("/bases/:baseId/tables", requireAuth, async (req, res) => {
//   try {
//     const response = await axios.get(
//       `https://api.airtable.com/v0/meta/bases/${req.params.baseId}/tables`,
//       {
//         headers: { Authorization: `Bearer ${req.user.accessToken}` },
//       }
//     );

//     // Filter supported fields only
//     const supportedTypes = [
//       "singleLineText",
//       "multilineText",
//       "singleSelect",
//       "multipleSelects",
//       "multipleAttachments",
//       "url", // <--- ADD THIS
//       "email", // <--- ADD THIS (Good to have)
//     ];

//     const tables = response.data.tables.map((table) => ({
//       ...table,
//       fields: table.fields.filter((f) => supportedTypes.includes(f.type)),
//     }));

//     res.json(tables);
//   } catch (e) {
//     res.status(500).send(e.message);
//   }
// });

// Get Tables in a Base
router.get("/bases/:baseId/tables", requireAuth, async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.airtable.com/v0/meta/bases/${req.params.baseId}/tables`,
      {
        headers: { Authorization: `Bearer ${req.user.accessToken}` },
      }
    );

    // Filter supported fields only
    // I added 'url', 'email', 'formula', and 'rollup' to ensure the GitHub link appears
    const supportedTypes = [
      "singleLineText",
      "multilineText",
      "richText",
      "singleSelect",
      "multipleSelects",
      "multipleAttachments",
      "url", // <--- Defines standard URL fields
      "email", // <--- Defines Email fields
      "formula", // <--- Sometimes URLs are calculated fields
      "rollup", // <--- Sometimes URLs are pulled from other tables
    ];

    const tables = response.data.tables.map((table) => ({
      id: table.id,
      name: table.name,
      fields: table.fields.filter((f) => supportedTypes.includes(f.type)),
    }));

    res.json(tables);
  } catch (e) {
    console.error("Error fetching tables:", e.message);
    res.status(500).send("Error fetching tables");
  }
});

// Create/Save Form Schema
// router.post("/", requireAuth, async (req, res) => {
//   const { baseId, tableId, fields, title } = req.body;

//   try {
//     // --- FIX START ---
//     // We use a dummy HTTPS URL because Airtable rejects 'http://localhost'
//     const notificationUrl = "https://example.com/webhook-placeholder";
//     // --- FIX END ---

//     // Create Webhook in Airtable
//     const hookRes = await axios.post(
//       `https://api.airtable.com/v0/bases/${baseId}/webhooks`,
//       {
//         notificationUrl: notificationUrl,
//         specification: {
//           options: {
//             filters: {
//               dataTypes: ["tableData"],
//               recordChangeScope: tableId,
//             },
//           },
//         },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${req.user.accessToken}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     const form = await Form.create({
//       userId: req.user._id,
//       baseId,
//       tableId,
//       title,
//       fields,
//       webhookId: hookRes.data.id,
//     });

//     res.json(form);
//   } catch (error) {
//     console.error("Save Form Error:", error.response?.data || error.message);
//     // Even if webhook fails, we might want to save the form anyway for testing
//     // But for now, we return the error to see what's wrong.
//     res.status(500).send("Error creating form or webhook");
//   }
// });

// Create/Save Form Schema
router.post("/", requireAuth, async (req, res) => {
  const { baseId, tableId, fields, title } = req.body;
  const notificationUrl =
    process.env.WEBHOOK_URL || "https://example.com/webhook-placeholder";

  const config = {
    headers: {
      Authorization: `Bearer ${req.user.accessToken}`,
      "Content-Type": "application/json",
    },
  };

  try {
    // --- STEP 1: CLEANUP OLD WEBHOOKS ---
    // Airtable allows max 2 webhooks. We check if we hit the limit and delete the oldest one.
    try {
      const listHooks = await axios.get(
        `https://api.airtable.com/v0/bases/${baseId}/webhooks`,
        config
      );

      // If we have 2 or more webhooks, delete the first one (oldest) to make space
      if (listHooks.data.webhooks && listHooks.data.webhooks.length >= 2) {
        console.log(
          "Webhook limit reached. Deleting oldest webhook to make space..."
        );
        const hookToDelete = listHooks.data.webhooks[0];
        await axios.delete(
          `https://api.airtable.com/v0/bases/${baseId}/webhooks/${hookToDelete.id}`,
          config
        );
      }
    } catch (cleanupErr) {
      console.warn("Webhook cleanup warning (ignorable):", cleanupErr.message);
    }
    // ------------------------------------

    // --- STEP 2: CREATE NEW WEBHOOK ---
    const hookRes = await axios.post(
      `https://api.airtable.com/v0/bases/${baseId}/webhooks`,
      {
        notificationUrl: notificationUrl,
        specification: {
          options: {
            filters: {
              dataTypes: ["tableData"],
              recordChangeScope: tableId,
            },
          },
        },
      },
      config
    );

    // --- STEP 3: SAVE TO DATABASE ---
    const form = await Form.create({
      userId: req.user._id,
      baseId,
      tableId,
      title,
      fields,
      webhookId: hookRes.data.id,
    });

    res.json(form);
  } catch (error) {
    console.error("Save Form Error:", error.response?.data || error.message);
    res.status(500).send(error.response?.data || "Error creating form");
  }
});

// Get Form by ID (Public)
router.get("/:id", async (req, res) => {
  const form = await Form.findById(req.params.id);
  res.json(form);
});

// Submit Form (Dual Write)
// Submit Form (DEBUG VERSION)
router.post("/:id/submit", async (req, res) => {
  const { answers } = req.body;

  try {
    const form = await Form.findById(req.params.id).populate("userId");
    if (!form) return res.status(404).send("Form not found");

    console.log("\n--- NEW SUBMISSION ATTEMPT ---");
    console.log(
      "1. Received Answers from Frontend:",
      JSON.stringify(answers, null, 2)
    );

    const fields = {};
    form.fields.forEach((f) => {
      // Check if we have an answer for this field
      if (answers[f.questionKey]) {
        console.log(`   - Matching Field: "${f.label}" (${f.type})`);
        console.log(`     Value:`, JSON.stringify(answers[f.questionKey]));

        // Add to Airtable payload
        fields[f.airtableFieldId] = answers[f.questionKey];
      } else {
        console.log(`   - Skipped Field: "${f.label}" (No answer provided)`);
      }
    });

    console.log(
      "2. Final Payload Sending to Airtable:",
      JSON.stringify(fields, null, 2)
    );

    // 1. Write to Airtable
    const atRes = await axios.post(
      `https://api.airtable.com/v0/${form.baseId}/${form.tableId}`,
      { fields },
      { headers: { Authorization: `Bearer ${form.userId.accessToken}` } }
    );

    console.log("3. Airtable Success! Record ID:", atRes.data.id);

    // 2. Write to Local DB
    const response = await Response.create({
      formId: form._id,
      airtableRecordId: atRes.data.id,
      answers,
    });

    res.json(response);
  } catch (e) {
    console.error("!!! SUBMISSION ERROR !!!");
    console.error(e.response?.data || e.message);
    res.status(500).send("Error submitting form");
  }
});

// ... existing code ...

// GET Responses for a Form
router.get("/:id/responses", async (req, res) => {
  try {
    const responses = await Response.find({ formId: req.params.id }).sort({
      createdAt: -1,
    });
    res.json(responses);
  } catch (e) {
    res.status(500).send("Error fetching responses");
  }
});

module.exports = router;
