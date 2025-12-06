const express = require("express");
const Response = require("../models/Response");
const router = express.Router();

// Airtable calls this URL when data changes
router.post("/airtable", async (req, res) => {
  const { payload } = req.body;

  console.log("Webhook Received:", payload);

  // Payload contains changed records
  if (payload && payload.changedTablesById) {
    // Iterate through tables and changes
    for (const tableId in payload.changedTablesById) {
      const changedRecords =
        payload.changedTablesById[tableId].changedRecordsById;

      for (const recordId in changedRecords) {
        // Find our DB record that matches this Airtable Record ID
        const dbResponse = await Response.findOne({
          airtableRecordId: recordId,
        });

        if (dbResponse) {
          console.log(`Syncing update for Record ${recordId}`);

          // In a real app, you would fetch the new data from Airtable here
          // and update dbResponse.answers.
          // For now, we update the timestamp to prove sync works.
          dbResponse.updatedAt = new Date();
          await dbResponse.save();
        }
      }
    }
  }

  res.sendStatus(200); // Always acknowledge receipt
});

module.exports = router;
