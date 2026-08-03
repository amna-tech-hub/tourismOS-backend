const geocodingService = require("../services/geocoding/geocoding.service");
const weatherService = require("../services/safety/weather.service");
const disasterService = require("../services/safety/disaster.service");
const safetyService = require("../services/safety/safety.service");

exports.checkSafety= async (req, res) => {
  let { locationName, latitude, longitude } = req.body;
  let coords = null;

  //  If explicit coordinates are passed in body, use them directly!
  if (latitude != null && longitude != null) {
    coords = { latitude, longitude };
  } 
  // 2. Otherwise, fall back to geocoding the name string
  else if (locationName) {
    coords = await geocodingService.geocodeLocation(locationName);
  }

  if (!coords) {
    return res.status(400).json({ error: "Please provide valid locationName or coordinates" });
  }

  // Fetch weather and disasters using `coords`
  const [weatherList, disasters] = await Promise.all([
    weatherService.getBatchWeather([coords]),
    disasterService.getDisasters(coords.latitude, coords.longitude)
  ]);

  const weather = weatherList && weatherList.length > 0 ? weatherList[0] : null;
  const safetyReport = safetyService.evaluateSafety(weather, disasters);

  return res.json({
    location: locationName || "Custom Coordinates",
    coordinates: coords,
    weather,
    disasters,
    safetyReport
  });
}