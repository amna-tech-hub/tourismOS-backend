const cron = require("node-cron");
const Tour = require("../models/Tour.model");
const geocodingService = require("../services/geocoding/geocoding.service");

let isRunning = false;

const startGeocodingJob = () => {
  // Runs every 10 seconds
  cron.schedule("*/10 * * * * *", async () => {
    if (isRunning) return;
    isRunning = true;

    try {
      const pendingTours = await Tour.find({
        "itinerary.isGeocoded": false,
        isDeleted: { $ne: true },
      }).limit(3);

      const BATCH_SIZE = 2; // Process up to 2 days per execution run

      for (const tour of pendingTours) {
        let processedCount = 0;
        let isUpdated = false;

        for (const dayItem of tour.itinerary) {
          if (!dayItem.isGeocoded && (dayItem.geocodeAttempts || 0) < 3) {
            dayItem.geocodeAttempts = (dayItem.geocodeAttempts || 0) + 1;

            const coords = await geocodingService.geocodeLocation(dayItem.location);

            if (coords) {
              dayItem.latitude = coords.latitude;
              dayItem.longitude = coords.longitude;
              dayItem.isGeocoded = true;
              dayItem.geocodedAt = new Date();
            }

            isUpdated = true;
            processedCount++;

            // Respect Nominatim 1 req/sec limit
            await new Promise((resolve) => setTimeout(resolve, 1000));

            if (processedCount >= BATCH_SIZE) break;
          }
        }

        if (isUpdated) {
          await tour.save();
          console.log(`[Geocode Job] Batch updated Tour ID: ${tour._id}`);
        }
      }
    } catch (error) {
      console.error("[Geocode Job] Error during execution:", error);
    } finally {
      isRunning = false;
    }
  });

  console.log("Geocoding background worker initialized.");
};

module.exports = { startGeocodingJob };