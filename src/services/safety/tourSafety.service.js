const redisService = require("../cache/redis.service");
const weatherService = require("./weather.service");
const disasterService = require("./disaster.service");
const safetyService = require("./safety.service");
const notificationService = require("../notification/notification.service"); 

class TourSafetyService {
  // Freshness duration: 30 minutes. Cache TTL: 24 hours (allows serving stale data while revalidating)
  #FRESH_TTL_MS = 30 * 60 * 1000;
  #REDIS_TTL_SEC = 24 * 60 * 60; 


  async getTourSafety(tour) {
    if (!tour || !tour.itinerary || tour.itinerary.length === 0) {
      return [];
    }

    const cacheKey = `tour-safety:${tour._id}`;
    const cachedData = await redisService.get(cacheKey);
    const now = Date.now();

    // 1. FRESH CACHE HIT: Return immediately
    if (cachedData && cachedData.expiresAt && now < cachedData.expiresAt) {
      return cachedData.dailySafety;
    }

    // 2. STALE CACHE HIT: Return stale data instantly & trigger background refresh
    if (cachedData && cachedData.dailySafety) {
      // Trigger background update asynchronously without waiting
      this.#refreshAndCacheSafety(tour, cacheKey).catch((err) =>
        console.error(`Background Safety Refresh Error for ${tour._id}:`, err)
      );
      return cachedData.dailySafety;
    }

    // 3. CACHE MISS: Compute immediately and save
    return await this.#refreshAndCacheSafety(tour, cacheKey);
  }

  /**
   * Private method to fetch live weather/disasters, evaluate safety, update Redis,
   * and automatically trigger push notifications for hazards.
   */
  async #refreshAndCacheSafety(tour, cacheKey) {
    try {
      const itinerary = tour.itinerary;

      // Collect all valid geocoded coordinates for batch weather request
      const validLocations = itinerary
        .filter((day) => day.latitude != null && day.longitude != null)
        .map((day) => ({ latitude: day.latitude, longitude: day.longitude }));

      // Fetch batch weather and disaster alerts concurrently
      const weatherListPromise = weatherService.getBatchWeather(validLocations);
      const disasterPromises = itinerary.map((day) =>
        day.latitude != null && day.longitude != null
          ? disasterService.getDisasters(day.latitude, day.longitude)
          : Promise.resolve(null)
      );

      const [weatherList, disastersList] = await Promise.all([
        weatherListPromise,
        Promise.all(disasterPromises),
      ]);

      // Map back results per itinerary day
      let validWeatherIdx = 0;
      const dailySafety = itinerary.map((day, idx) => {
        let weather = null;
        if (day.latitude != null && day.longitude != null) {
          weather = weatherList[validWeatherIdx] || null;
          validWeatherIdx++;
        }

        const disasters = disastersList[idx] || null;
        const evaluation = safetyService.evaluateSafety(weather, disasters);

        return {
          day: day.day,
          title: day.title,
          location: day.location,
          isGeocoded: day.isGeocoded || false,
          coordinates:
            day.latitude != null ? { latitude: day.latitude, longitude: day.longitude } : null,
          weather,
          disasters,
          safety: evaluation, // { status: "SAFE"|"WARNING"|"NOT_SAFE", reasons: [] }
        };
      });

      // 🔔 Phase 5: Automated Safety Notification Check
      this.#checkAndSendSafetyAlerts(tour, dailySafety);

      // Save to Redis with metadata
      const payload = {
        generatedAt: new Date().toISOString(),
        expiresAt: Date.now() + this.#FRESH_TTL_MS,
        dailySafety,
      };

      await redisService.set(cacheKey, payload, this.#REDIS_TTL_SEC);
      return dailySafety;
    } catch (error) {
      console.error(`Failed to refresh safety for tour ${tour._id}:`, error.message);
      return [];
    }
  }

  /**
   * Private helper to check safety alerts and notify the tour user automatically.
   */
  #checkAndSendSafetyAlerts(tour, dailySafety) {
    const targetUserId = tour.createdBy || tour.userId || tour.owner;
    if (!targetUserId) return;

    dailySafety.forEach((dayReport) => {
      const { status, reasons } = dayReport.safety || {};

      if (status === "NOT_SAFE" || status === "WARNING") {
        const title =
          status === "NOT_SAFE"
            ? `🚨 Severe Hazard Alert: ${dayReport.location}`
            : `⚠️ Weather Caution: ${dayReport.location}`;

        const reasonText =
          reasons && reasons.length > 0
            ? reasons.join(" ")
            : "Unfavorable travel conditions detected.";

        const body = `Day ${dayReport.day} (${dayReport.title}): ${reasonText}`;

        // Send via Firebase & save In-App notification asynchronously
        notificationService.sendToUser(targetUserId, {
          title,
          body,
          type: "SAFETY_ALERT",
          extraData: {
            tourId: tour._id ? tour._id.toString() : "",
            day: dayReport.day ? dayReport.day.toString() : "",
            status,
          },
        });
      }
    });
  }
}

module.exports = new TourSafetyService();