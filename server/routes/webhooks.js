// const express = require("express");
// const Response = require("../models/Response");
// const router = express.Router();

// router.post("/airtable", async (req, res) => {
//   const { payload } = req.body;

//   console.log("Webhook Received:", payload);

//   if (payload && payload.changedTablesById) {
//     for (const tableId in payload.changedTablesById) {
//       const changedRecords =
//         payload.changedTablesById[tableId].changedRecordsById;

//       for (const recordId in changedRecords) {
//         const dbResponse = await Response.findOne({
//           airtableRecordId: recordId,
//         });

//         if (dbResponse) {
//           console.log(`Syncing update for Record ${recordId}`);

//           dbResponse.updatedAt = new Date();
//           await dbResponse.save();
//         }
//       }
//     }
//   }

//   res.sendStatus(200);
// });

// module.exports = router;

// server/routes/webhooks.js
const express = require("express");
const axios = require("axios");
const Response = require("../models/Response");
const User = require("../models/User");
const router = express.Router();

router.post("/airtable", async (req, res) => {
  const { payload } = req.body;

  console.log("Webhook Received:", JSON.stringify(payload, null, 2));

  if (!payload) return res.sendStatus(200);

  // -----------------------------------------------------------------
  // 1. HANDLE DELETIONS
  // -----------------------------------------------------------------
  if (payload.destroyedRecordIds) {
    for (const recordId of payload.destroyedRecordIds) {
      const deleted = await Response.findOneAndDelete({
        airtableRecordId: recordId,
      });
      if (deleted) {
        console.log(`🗑️ Deleted local response for Record ${recordId}`);
      }
    }
  }

  // -----------------------------------------------------------------
  // 2. HANDLE UPDATES
  // -----------------------------------------------------------------
  if (payload.changedTablesById) {
    for (const tableId in payload.changedTablesById) {
      const changedRecords =
        payload.changedTablesById[tableId].changedRecordsById;

      for (const recordId in changedRecords) {
        // Find the response AND populate the Form to access field mappings
        const dbResponse = await Response.findOne({
          airtableRecordId: recordId,
        }).populate("formId");

        if (dbResponse && dbResponse.formId) {
          console.log(`🔄 Syncing update for Record ${recordId}`);

          try {
            // A. Get the User to access their Airtable Token
            const user = await User.findById(dbResponse.formId.userId);
            if (!user || !user.accessToken) {
              console.error(`User not found for form ${dbResponse.formId._id}`);
              continue;
            }

            // B. Fetch the latest data from Airtable
            // We request 'returnFieldsByFieldId' to ensure keys match our schema
            const airtableRes = await axios.get(
              `https://api.airtable.com/v0/${dbResponse.formId.baseId}/${dbResponse.formId.tableId}/${recordId}`,
              {
                headers: { Authorization: `Bearer ${user.accessToken}` },
                params: { returnFieldsByFieldId: true },
              }
            );

            const remoteFields = airtableRes.data.fields;
            const localFormFields = dbResponse.formId.fields;

            // C. Map Airtable Data back to "QuestionKey" format
            // We assume the old answers exist, and we overlay new changes
            const updatedAnswers = { ...dbResponse.answers };

            localFormFields.forEach((field) => {
              // If the field exists in Airtable response, update our local answer
              // Note: Airtable omits empty fields, so undefined means it might be empty now
              if (remoteFields[field.airtableFieldId] !== undefined) {
                updatedAnswers[field.questionKey] =
                  remoteFields[field.airtableFieldId];
              } else {
                // Optional: If Airtable doesn't send the field, it means it's empty/cleared.
                // Uncomment the next line if you want to clear it locally too:
                delete updatedAnswers[field.questionKey];
              }
            });

            // D. Save to MongoDB
            dbResponse.answers = updatedAnswers;
            dbResponse.updatedAt = new Date();
            await dbResponse.markModified("answers"); // Tell Mongoose Mixed type changed
            await dbResponse.save();

            console.log(`✅ Successfully synced Record ${recordId}`);
          } catch (err) {
            console.error(`❌ Error syncing record ${recordId}:`, err.message);
          }
        }
      }
    }
  }

  res.sendStatus(200);
});

module.exports = router;
