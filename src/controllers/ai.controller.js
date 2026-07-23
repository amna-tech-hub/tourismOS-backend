
const promptBuilder=require('../prompts/prompt.builder')
const aiManager=require('../manager/ai.manager')
const createItinerary = async (req, res) => {
   try {
        const { destination } = req.body;

        if (!destination) {
            return res.status(400).json({
                success: false,
                message: "Destination is required.",
            });
        }
        const prompt = promptBuilder.buildTravelPlanPrompt(req.body);

const result = await aiManager.generate(prompt);

return res.json(result);
    }
catch (error) {
    console.error("AI Controller Error:", error);

    return res.status(500).json({
        success: false,
        message: "Internal Server Error",
    });
}
}


module.exports = {
createItinerary

};
