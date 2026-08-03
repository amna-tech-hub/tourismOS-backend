// src/services/geocoding.service.js
const axios = require("axios");

class GeocodingService {
  /**
   * Geocodes a location name string using Nominatim API.
   * @param {string} locationName - e.g. "Murree" or "Hunza Valley"
   * @returns {Promise<{latitude: number, longitude: number} | null>}
   */
  async geocodeLocation(locationName) {
    if (!locationName) return null;

    try {
      const response = await axios.get(
        "https://nominatim.openstreetmap.org/search",
        {
          params: {
            q: locationName,
            format: "json",
            limit: 1,
            featuretype: "settlement",
          },
          headers: {
            // Nominatim requires a custom User-Agent header
            "User-Agent": `TourismOS_App/1.0 (${process.env.MAIL_USER })`,
          },
          timeout: 5000, // 5 seconds timeout
        }
      );

      if (response.data && response.data.length > 0) {
        const place = response.data[0];
        return {
          latitude: parseFloat(place.lat),
          longitude: parseFloat(place.lon),
        };
      }

      return null;
    } catch (error) {
      console.error(
        `Geocoding error for location "${locationName}":`,
        error.message
      );
      return null;
    }
  }
}

module.exports = new GeocodingService();