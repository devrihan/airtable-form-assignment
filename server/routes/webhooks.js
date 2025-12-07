// const express = require("express");
// const axios = require("axios");
// const Response = require("../models/Response");
// const User = require("../models/User");
// const router = express.Router();

// router.post("/airtable", async (req, res) => {
//   const { payload } = req.body;

//   console.log("Webhook Received:", JSON.stringify(payload, null, 2));

//   if (!payload) return res.sendStatus(200);

//   // -----------------------------------------------------------------
//   // 1. HANDLE DELETIONS
//   // -----------------------------------------------------------------
//   if (payload.destroyedRecordIds) {
//     for (const recordId of payload.destroyedRecordIds) {
//       const deleted = await Response.findOneAndDelete({
//         airtableRecordId: recordId,
//       });
//       if (deleted) {
//         console.log(`🗑️ Deleted local response for Record ${recordId}`);
//       }
//     }
//   }

//   // -----------------------------------------------------------------
//   // 2. HANDLE UPDATES
//   // -----------------------------------------------------------------
//   if (payload.changedTablesById) {
//     for (const tableId in payload.changedTablesById) {
//       const changedRecords =
//         payload.changedTablesById[tableId].changedRecordsById;

//       for (const recordId in changedRecords) {
//         // Find the response AND populate the Form to access field mappings
//         const dbResponse = await Response.findOne({
//           airtableRecordId: recordId,
//         }).populate("formId");

//         if (dbResponse && dbResponse.formId) {
//           console.log(`🔄 Syncing update for Record ${recordId}`);

//           try {
//             // A. Get the User to access their Airtable Token
//             const user = await User.findById(dbResponse.formId.userId);
//             if (!user || !user.accessToken) {
//               console.error(`User not found for form ${dbResponse.formId._id}`);
//               continue;
//             }

//             // B. Fetch the latest data from Airtable
//             // We request 'returnFieldsByFieldId' to ensure keys match our schema
//             const airtableRes = await axios.get(
//               `https://api.airtable.com/v0/${dbResponse.formId.baseId}/${dbResponse.formId.tableId}/${recordId}`,
//               {
//                 headers: { Authorization: `Bearer ${user.accessToken}` },
//                 params: { returnFieldsByFieldId: true },
//               }
//             );

//             const remoteFields = airtableRes.data.fields;
//             const localFormFields = dbResponse.formId.fields;

//             // C. Map Airtable Data back to "QuestionKey" format
//             // We assume the old answers exist, and we overlay new changes
//             const updatedAnswers = { ...dbResponse.answers };

//             localFormFields.forEach((field) => {
//               // If the field exists in Airtable response, update our local answer
//               // Note: Airtable omits empty fields, so undefined means it might be empty now
//               if (remoteFields[field.airtableFieldId] !== undefined) {
//                 updatedAnswers[field.questionKey] =
//                   remoteFields[field.airtableFieldId];
//               } else {
//                 // Optional: If Airtable doesn't send the field, it means it's empty/cleared.
//                 // Uncomment the next line if you want to clear it locally too:
//                 delete updatedAnswers[field.questionKey];
//               }
//             });

//             // D. Save to MongoDB
//             dbResponse.answers = updatedAnswers;
//             dbResponse.updatedAt = new Date();
//             await dbResponse.markModified("answers"); // Tell Mongoose Mixed type changed
//             await dbResponse.save();

//             console.log(`✅ Successfully synced Record ${recordId}`);
//           } catch (err) {
//             console.error(`❌ Error syncing record ${recordId}:`, err.message);
//           }
//         }
//       }
//     }
//   }

//   res.sendStatus(200);
// });

// module.exports = router;

const express = require("express");
const axios = require("axios");
const Response = require("../models/Response");
const User = require("../models/User");
const Form = require("../models/Form"); // Critical: Needed to find the token
const router = express.Router();

router.post("/airtable", async (req, res) => {
  const body = req.body;

  // 1. Validate the Notification
  // Airtable sends { base: { id: ... }, webhook: { id: ... }, timestamp: ... }
  if (!body.base || !body.webhook) {
    return res.sendStatus(200); // Ignore invalid pings
  }

  const webhookId = body.webhook.id;
  const baseId = body.base.id;

  console.log(`🔔 Webhook Notification for Hook ID: ${webhookId}`);

  try {
    // 2. Find the Form & User to get the Access Token
    // We need the user's token to ask Airtable "What changed?"
    const form = await Form.findOne({ webhookId }).populate("userId");

    if (!form || !form.userId) {
      console.error("❌ No matching form or user found for this webhook.");
      return res.sendStatus(200);
    }

    const user = form.userId;

    // 3. FETCH the actual payloads (The missing step!)
    const payloadsRes = await axios.get(
      `https://api.airtable.com/v0/bases/${baseId}/webhooks/${webhookId}/payloads`,
      {
        headers: { Authorization: `Bearer ${user.accessToken}` },
        // In a real app, you would store a 'cursor' to only fetch new data.
        // For this demo, we just fetch the latest batch.
      }
    );

    const payloads = payloadsRes.data.payloads;
    if (!payloads || payloads.length === 0) {
      console.log("No new payloads found.");
      return res.sendStatus(200);
    }

    // 4. Process the Payloads (Same logic as before, but iterating)
    for (const payload of payloads) {
      // A. Handle Deletions
      if (payload.destroyedRecordIds) {
        for (const recordId of payload.destroyedRecordIds) {
          await Response.findOneAndDelete({ airtableRecordId: recordId });
          console.log(`🗑️ Deleted local response: ${recordId}`);
        }
      }

      // B. Handle Updates
      if (payload.changedTablesById) {
        for (const tableId in payload.changedTablesById) {
          const changedRecords =
            payload.changedTablesById[tableId].changedRecordsById;

          for (const recordId in changedRecords) {
            const dbResponse = await Response.findOne({
              airtableRecordId: recordId,
            }).populate("formId");

            if (dbResponse) {
              // We already have the token from step 2, so we can re-use it if we needed to,
              // but simpler to just fetch the specific record data now.
              // (Or you can parse payload.changedTablesById deeply, but fetching fresh data is safer)

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
    console.error("❌ Webhook Error:", error.response?.data || error.message);
  }

  // Always say "OK" to Airtable so they stop retrying
  res.sendStatus(200);
});

module.exports = router;
