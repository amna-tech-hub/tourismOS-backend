class PromptBuilder {
  buildTravelPlanPrompt(data) {
    const {
      destination = "Not specified",
      duration = "Not specified",
      budget = "Not specified",
      interests = [],
    } = data;

    const interestsText =
      Array.isArray(interests) && interests.length > 0
        ? interests.join(", ")
        : typeof interests === "string" && interests.trim() !== ""
        ? interests
        : "Not specified";

    const formattedBudget =
      budget === "Not specified"
        ? budget
        : new Intl.NumberFormat("en-PK").format(budget);

    return `
Create a structured travel itinerary based on the following details:

Destination: ${destination}
Duration: ${duration} days
Budget: PKR ${formattedBudget}
Interests: ${interestsText}

CRITICAL RULES:
1. Return strictly a raw, valid JSON object without any code blocks or markdown formatting.
2. Do not insert explicit line breaks or escaped quotes inside string values.

Required JSON Structure:
{
  "itinerary": [
    {
      "day": 1,
      "title": "Day 1 Title",
      "description": "Day 1 activity description",
      "activities": ["Activity 1", "Activity 2"]
    }
  ],
  "budgetBreakdown": {
    "hotel": 0,
    "food": 0,
    "transport": 0,
    "activities": 0
  },
  "travelTips": ["Tip 1"],
  "bestTimeToVisit": "Best months to visit",
  "importantNotes": ["Note 1"]
}
`;
  }
}

module.exports = new PromptBuilder();