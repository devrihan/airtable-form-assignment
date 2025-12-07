// const express = require("express");
// const axios = require("axios");
// const Response = require("../models/Response");
// const User = require("../models/User");
// const Form = require("../models/Form");
// const router = express.Router();

// router.post("/airtable", async (req, res) => {
//   const body = req.body;

//   if (!body.base || !body.webhook) {
//     return res.sendStatus(200);
//   }

//   const webhookId = body.webhook.id;
//   const baseId = body.base.id;

//   console.log(` Webhook Notification for Hook ID: ${webhookId}`);

//   try {
//     const form = await Form.findOne({ webhookId }).populate("userId");

//     if (!form || !form.userId) {
//       console.error("❌ No matching form or user found for this webhook.");
//       return res.sendStatus(200);
//     }

//     const user = form.userId;

//     const payloadsRes = await axios.get(
//       `https://api.airtable.com/v0/bases/${baseId}/webhooks/${webhookId}/payloads`,
//       {
//         headers: { Authorization: `Bearer ${user.accessToken}` },
//       }
//     );

//     const payloads = payloadsRes.data.payloads;
//     if (!payloads || payloads.length === 0) {
//       console.log("No new payloads found.");
//       return res.sendStatus(200);
//     }

//     for (const payload of payloads) {
//       if (payload.destroyedRecordIds) {
//         for (const recordId of payload.destroyedRecordIds) {
//           await Response.findOneAndDelete({ airtableRecordId: recordId });
//           console.log(` Deleted local response: ${recordId}`);
//         }
//       }

//       if (payload.changedTablesById) {
//         for (const tableId in payload.changedTablesById) {
//           const changedRecords =
//             payload.changedTablesById[tableId].changedRecordsById;

//           for (const recordId in changedRecords) {
//             const dbResponse = await Response.findOne({
//               airtableRecordId: recordId,
//             }).populate("formId");

//             if (dbResponse) {
//               try {
//                 const recordRes = await axios.get(
//                   `https://api.airtable.com/v0/${baseId}/${form.tableId}/${recordId}`,
//                   {
//                     headers: { Authorization: `Bearer ${user.accessToken}` },
//                     params: { returnFieldsByFieldId: true },
//                   }
//                 );

//                 const remoteFields = recordRes.data.fields;
//                 const localFormFields = dbResponse.formId.fields;
//                 const updatedAnswers = { ...dbResponse.answers };

//                 localFormFields.forEach((field) => {
//                   if (remoteFields[field.airtableFieldId] !== undefined) {
//                     updatedAnswers[field.questionKey] =
//                       remoteFields[field.airtableFieldId];
//                   }
//                 });

//                 dbResponse.answers = updatedAnswers;
//                 dbResponse.updatedAt = new Date();
//                 await dbResponse.markModified("answers");
//                 await dbResponse.save();
//                 console.log(`✅ Synced update for: ${recordId}`);
//               } catch (err) {
//                 console.error(
//                   `Error fetching record ${recordId}:`,
//                   err.message
//                 );
//               }
//             }
//           }
//         }
//       }
//     }
//   } catch (error) {
//     console.error(" Webhook Error:", error.response?.data || error.message);
//   }

//   res.sendStatus(200);
// });

// module.exports = router;
const express = require("express");
const axios = require("axios");
const Response = require("../models/Response");
const User = require("../models/User");
const Form = require("../models/Form");
const router = express.Router();

router.post("/airtable", async (req, res) => {
  const body = req.body;

  // 1. Validate the Notification
  if (!body.base || !body.webhook) {
    return res.sendStatus(200);
  }

  const webhookId = body.webhook.id;
  const baseId = body.base.id;

  console.log(`🔔 Webhook Notification for Hook ID: ${webhookId}`);

  try {
    // 2. Find the Form & User to get the Access Token
    const form = await Form.findOne({ webhookId }).populate("userId");

    if (!form || !form.userId) {
      console.error("❌ No matching form or user found for this webhook.");
      return res.sendStatus(200);
    }

    const user = form.userId;

    // 3. FETCH the actual payloads
    const payloadsRes = await axios.get(
      `https://api.airtable.com/v0/bases/${baseId}/webhooks/${webhookId}/payloads`,
      {
        headers: { Authorization: `Bearer ${user.accessToken}` },
      }
    );

    const payloads = payloadsRes.data.payloads;
    if (!payloads || payloads.length === 0) {
      return res.sendStatus(200);
    }

    // 4. Process the Payloads
    for (const payload of payloads) {
      if (payload.changedTablesById) {
        for (const tableId in payload.changedTablesById) {
          const tableData = payload.changedTablesById[tableId];

          // ---------------------------------------------------------
          // A. Handle Deletions (CORRECTED LOCATION)
          // ---------------------------------------------------------
          // In Airtable, destroyedRecordIds lives INSIDE the table object
          if (tableData.destroyedRecordIds) {
            for (const recordId of tableData.destroyedRecordIds) {
              const deleted = await Response.findOneAndDelete({
                airtableRecordId: recordId,
              });
              if (deleted) {
                console.log(`🗑️ Deleted local response: ${recordId}`);
              }
            }
          }

          // ---------------------------------------------------------
          // B. Handle Updates
          // ---------------------------------------------------------
          if (tableData.changedRecordsById) {
            for (const recordId in tableData.changedRecordsById) {
              const dbResponse = await Response.findOne({
                airtableRecordId: recordId,
              }).populate("formId");

              // Only update if it still exists (wasn't just deleted above)
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
                  // If fetch fails (403/404), it might be because of a race condition
                  // where we tried to update a record that is actually deleted.
                  console.error(
                    `⚠️ Error fetching record ${recordId}: ${err.message}`
                  );
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("❌ Webhook Error:", error.response?.data || error.message);
  }

  res.sendStatus(200);
});

module.exports = router;
