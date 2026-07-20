class PromptBuilder {
    buildTravelPlanPrompt(data) {
        const {
            destination = "Not specified",
            duration = "Not specified",
            budget = "Not specified",
            interests = [],
        } = data;

       const interestsText = Array.isArray(interests) && interests.length > 0
    ? interests.join(", ")
    : (typeof interests === "string" && interests.trim() !== "" ? interests : "Not specified");

        const formattedBudget =
            budget === "Not specified"
                ? budget
                : new Intl.NumberFormat("en-PK").format(budget);

        const prompt = `
Create a travel itinerary using the following information.

Destination: ${destination}

Duration: ${duration}

Budget: PKR ${formattedBudget}

Interests:
${interestsText}

Please provide:

1. A day-by-day itinerary.

2. A budget breakdown:
   - Hotel
   - Food
   - Transport
   - Activities

3. Travel tips.

4. The best time to visit.

5. Important things to remember.
`;

        return prompt;
    }
}

module.exports = new PromptBuilder();