const express = require("express");
const axios = require("axios");
const Response = require("../models/Response");
const User = require("../models/User");
const Form = require("../models/Form");
const router = express.Router();

router.post("/airtable", async (req, res) => {
  const body = req.body;

  if (!body.base || !body.webhook) {
    return res.sendStatus(200);
  }

  const webhookId = body.webhook.id;
  const baseId = body.base.id;

  console.log(` Webhook Notification for Hook ID: ${webhookId}`);

  try {
    const form = await Form.findOne({ webhookId }).populate("userId");

    if (!form || !form.userId) {
      console.error("❌ No matching form or user found for this webhook.");
      return res.sendStatus(200);
    }

    const user = form.userId;

    const payloadsRes = await axios.get(
      `https://api.airtable.com/v0/bases/${baseId}/webhooks/${webhookId}/payloads`,
      {
        headers: { Authorization: `Bearer ${user.accessToken}` },
      }
    );

    const payloads = payloadsRes.data.payloads;
    if (!payloads || payloads.length === 0) {
      console.log("No new payloads found.");
      return res.sendStatus(200);
    }

    for (const payload of payloads) {
      if (payload.destroyedRecordIds) {
        for (const recordId of payload.destroyedRecordIds) {
          await Response.findOneAndDelete({ airtableRecordId: recordId });
          console.log(` Deleted local response: ${recordId}`);
        }
      }

      if (payload.changedTablesById) {
        for (const tableId in payload.changedTablesById) {
          const changedRecords =
            payload.changedTablesById[tableId].changedRecordsById;

          for (const recordId in changedRecords) {
            const dbResponse = await Response.findOne({
              airtableRecordId: recordId,
            }).populate("formId");

            if (dbResponse) {
              try {
                const recordRes = await axios.get(
                  `https://api.airtable.com/v0/${baseId}/${form.tableId}/${recordId}`,
                  {
                    headers: { Authorization: `Bearer ${user.accessToken}` },
                    params: { returnFieldsByFieldId: true },
                  }
                );

                const remoteFields = recordRes.data.fields;
                const localFormFields = dbResponse.formId.fields;
                const updatedAnswers = { ...dbResponse.answers };

                localFormFields.forEach((field) => {
                  if (remoteFields[field.airtableFieldId] !== undefined) {
                    updatedAnswers[field.questionKey] =
                      remoteFields[field.airtableFieldId];
                  }
                });

                dbResponse.answers = updatedAnswers;
                dbResponse.updatedAt = new Date();
                await dbResponse.markModified("answers");
                await dbResponse.save();
                console.log(`✅ Synced update for: ${recordId}`);
              } catch (err) {
                console.error(
                  `Error fetching record ${recordId}:`,
                  err.message
                );
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(" Webhook Error:", error.response?.data || error.message);
  }

  res.sendStatus(200);
});

module.exports = router;
