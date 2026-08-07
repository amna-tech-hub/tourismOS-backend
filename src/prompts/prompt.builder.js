class PromptBuilder {
  buildTravelPlanPrompt(data) {
    const {
      from = "Not specified",
      to = "Not specified",
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

Starting Location (From): ${from}
Destination Location (To): ${to}
Duration: ${duration} days
Budget: PKR ${formattedBudget}
Interests: ${interestsText}

CRITICAL RULES:
1. Return strictly a raw, valid JSON object without any code blocks or markdown formatting.
2. Do not insert explicit line breaks or escaped quotes inside string values.
3. Every day in the itinerary MUST include a single, primary, specific "location" field (e.g., "Murree", "Nathia Gali", "Hunza"). Do NOT embed the location inside the description text.
4. Each item in "activities" MUST be an object with a "title" string and an optional "image" object set to null by default.
5. Include a list of 4-6 common traveler FAQs relevant to traveling from ${from} to ${to}.

Required JSON Structure:
{
  "itinerary": [
    {
      "day": 1,
      "title": "Day 1 Title",
      "location": "Location Name",
      "description": "Day 1 activity description",
      "activities": [
        {
          "title": "Shopping on Mall Road",
          "image": null
        },
        {
          "title": "Visiting the Murree Golf Club",
          "image": null
        }
      ]
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
  "importantNotes": ["Note 1"],
  "faqs": [
    {
      "question": "Frequently asked traveler question?",
      "answer": "Detailed helpful answer for travelers."
    }
  ]
}
`;
  }
}

module.exports = new PromptBuilder();