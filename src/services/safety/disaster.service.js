const axios = require("axios");

class DisasterService {
  // Simple in-memory cache
  #cachedFeatures = null;
  #lastFetchTime = 0;
  #CACHE_DURATION_MS = 30 * 60 * 1000; 

  #calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async #getGlobalDisasters() {
    const now = Date.now();

    if (this.#cachedFeatures && now - this.#lastFetchTime < this.#CACHE_DURATION_MS) {
      return this.#cachedFeatures;
    }

    // Otherwise, fetch fresh file from GDACS
    const response = await axios.get(
      "https://www.gdacs.org/xml/gdacs_geojson.geojson",
      { timeout: 6000 }
    );

    this.#cachedFeatures = response.data?.features || [];
    this.#lastFetchTime = now;

    return this.#cachedFeatures;
  }

  async getDisasters(latitude, longitude, radiusKm = 100) {
    const result = { flood: false, earthquake: false, landslide: false, fire: false };
    if (latitude == null || longitude == null) return result;

    try {
      // Get disasters from cache or fresh fetch
      const features = await this.#getGlobalDisasters();

      for (const feature of features) {
        const coords = feature.geometry?.coordinates;
        if (!coords || coords.length < 2) continue;

        const [eventLon, eventLat] = coords;
        const distance = this.#calculateDistance(latitude, longitude, eventLat, eventLon);

        if (distance <= radiusKm) {
          const eventType = (feature.properties?.eventtype || "").toLowerCase();

          if (eventType === "fl" || eventType.includes("flood")) result.flood = true;
          else if (eventType === "eq" || eventType.includes("earthquake")) result.earthquake = true;
          else if (eventType === "ls" || eventType.includes("landslide")) result.landslide = true;
          else if (eventType === "wf" || eventType.includes("fire")) result.fire = true;
        }
      }

      return result;
    } catch (error) {
      console.error(`Disaster Service Error: ${error.message}`);
      return result;
    }
  }
}

module.exports = new DisasterService();