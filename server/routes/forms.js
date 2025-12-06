const express = require("express");
const axios = require("axios");
const Form = require("../models/Form");
const User = require("../models/User");
const Response = require("../models/Response");
const router = express.Router();

const requireAuth = async (req, res, next) => {
  if (!req.session.userId) return res.status(401).send("Unauthorized");
  req.user = await User.findById(req.session.userId);
  next();
};

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

router.get("/bases/:baseId/tables", requireAuth, async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.airtable.com/v0/meta/bases/${req.params.baseId}/tables`,
      {
        headers: { Authorization: `Bearer ${req.user.accessToken}` },
      }
    );

    const supportedTypes = [
      "singleLineText",
      "multilineText",
      "richText",
      "singleSelect",
      "multipleSelects",
      "multipleAttachments",
      "url",
      "email",
      "formula",
      "rollup",
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
    try {
      const listHooks = await axios.get(
        `https://api.airtable.com/v0/bases/${baseId}/webhooks`,
        config
      );

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

// GET all forms for the current user
router.get("/", requireAuth, async (req, res) => {
  try {
    // Find forms where userId matches the logged-in user, sorted by newest first
    const forms = await Form.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(forms);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching forms");
  }
});

router.get("/:id", async (req, res) => {
  const form = await Form.findById(req.params.id);
  res.json(form);
});

//Here I (Rihan) have added console logs to track submission process coz i was getting few errors
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
      if (answers[f.questionKey]) {
        console.log(`   - Matching Field: "${f.label}" (${f.type})`);
        console.log(`     Value:`, JSON.stringify(answers[f.questionKey]));

        fields[f.airtableFieldId] = answers[f.questionKey];
      } else {
        console.log(`   - Skipped Field: "${f.label}" (No answer provided)`);
      }
    });

    console.log(
      "2. Final Payload Sending to Airtable:",
      JSON.stringify(fields, null, 2)
    );

    const atRes = await axios.post(
      `https://api.airtable.com/v0/${form.baseId}/${form.tableId}`,
      { fields },
      { headers: { Authorization: `Bearer ${form.userId.accessToken}` } }
    );

    console.log("3. Airtable Success! Record ID:", atRes.data.id);

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
