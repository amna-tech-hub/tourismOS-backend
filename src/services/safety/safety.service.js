// src/services/safety/safety.service.js

class SafetyService {

  evaluateSafety(weather, disasters) {
    const reasons = [];
    let isNotSafe = false;
    let isWarning = false;

    //  DISASTER CHECK (Highest Severity)
    if (disasters) {
      if (disasters.flood) {
        isNotSafe = true;
        reasons.push("Active flood alert in the region.");
      }
      if (disasters.earthquake) {
        isNotSafe = true;
        reasons.push("Recent seismic/earthquake activity detected.");
      }
      if (disasters.landslide) {
        isNotSafe = true;
        reasons.push("Active landslide warning in the area.");
      }
      if (disasters.fire) {
        isNotSafe = true;
        reasons.push("Active wildfire reported nearby.");
      }
    }

   
    if (weather) {
      // Extreme Rain
      if (weather.rain > 50) {
        isNotSafe = true;
        reasons.push(`Torrential downpour (${weather.rain}mm rain expected).`);
      } else if (weather.rain > 15) {
        isWarning = true;
        reasons.push(`Moderate to heavy rainfall expected (${weather.rain}mm).`);
      }

      // Extreme Wind Speed (km/h)
      if (weather.wind > 60) {
        isNotSafe = true;
        reasons.push(`Hazardous wind speeds (${weather.wind} km/h).`);
      } else if (weather.wind > 35) {
        isWarning = true;
        reasons.push(`High wind gusts (${weather.wind} km/h).`);
      }

      // Extreme Temperatures (°C)
      if (weather.temperature > 42) {
        isNotSafe = true;
        reasons.push(`Extreme heatwave (${weather.temperature}°C).`);
      } else if (weather.temperature < -10) {
        isNotSafe = true;
        reasons.push(`Freezing severe weather (${weather.temperature}°C).`);
      } else if (weather.temperature > 38 || weather.temperature < 0) {
        isWarning = true;
        reasons.push(`Adverse temperature conditions (${weather.temperature}°C).`);
      }
    }

    // FINAL STATUS RESOLUTION
    let status = "SAFE";
    if (isNotSafe) {
      status = "NOT_SAFE";
    } else if (isWarning) {
      status = "WARNING";
    }

    if (status === "SAFE") {
      reasons.push("Weather and regional safety conditions are optimal.");
    }

    return {
      status,
      reasons,
    };
  }
}

module.exports = new SafetyService();