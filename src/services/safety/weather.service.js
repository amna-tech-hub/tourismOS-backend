// src/services/weather/weather.service.js
const axios = require("axios");

class WeatherService {
 
  async getBatchWeather(locations) {
    if (!locations || !Array.isArray(locations) || locations.length === 0) {
      return [];
    }

    // Filter out invalid or un-geocoded coordinates
    const validLocations = locations.filter(
      (loc) => loc && loc.latitude != null && loc.longitude != null
    );

    if (validLocations.length === 0) return [];

    const lats = validLocations.map((loc) => loc.latitude).join(",");
    const lons = validLocations.map((loc) => loc.longitude).join(",");

    try {
      const response = await axios.get(
        "https://api.open-meteo.com/v1/forecast",
        {
          params: {
            latitude: lats,
            longitude: lons,
            current: [
              "temperature_2m",
              "relative_humidity_2m",
              "rain",
              "wind_speed_10m",
            ].join(","),
            timezone: "auto",
          },
          timeout: 5000,
        }
      );

      const data = response.data;

      // Helper function to extract weather properties safely
      const extractWeather = (item) => {
        if (!item || !item.current) return null;
        return {
          temperature: item.current.temperature_2m,
          rain: item.current.rain,
          wind: item.current.wind_speed_10m,
          humidity: item.current.relative_humidity_2m,
        };
      };

      // Handle Array response (multi-location query)
      if (Array.isArray(data)) {
        return data.map(extractWeather);
      }

      // Handle Single Object response (single-location query)
      if (data && data.current) {
        return [extractWeather(data)];
      }

      return [];
    } catch (error) {
      console.error("Batch Weather Service Error:", error.message);
      return [];
    }
  }
}

module.exports = new WeatherService();