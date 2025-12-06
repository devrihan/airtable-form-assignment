const express = require("express");
const Response = require("../models/Response");
const router = express.Router();

router.post("/airtable", async (req, res) => {
  const { payload } = req.body;

  console.log("Webhook Received:", payload);

  if (payload && payload.changedTablesById) {
    for (const tableId in payload.changedTablesById) {
      const changedRecords =
        payload.changedTablesById[tableId].changedRecordsById;

      for (const recordId in changedRecords) {
        const dbResponse = await Response.findOne({
          airtableRecordId: recordId,
        });

        if (dbResponse) {
          console.log(`Syncing update for Record ${recordId}`);

          dbResponse.updatedAt = new Date();
          await dbResponse.save();
        }
      }
    }
  }

  res.sendStatus(200);
});

module.exports = router;
