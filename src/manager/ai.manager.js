const GeminiService = require("../services/ai/gemini.service");
const GroqService = require("../services/ai/gorq.service");
const OpenRouterService = require("../services/ai/openrouter.service");

class AIManager {
    constructor() {
        this.providers = [
              GroqService,
             OpenRouterService,
            GeminiService,
         
        ];
    }

    async generate(prompt) {
        let lastError = null;

        for (const provider of this.providers) {
            const response = await provider.generate(prompt);

            if (response.success) {
                return response;
            }

            lastError = response;
        }

        return (
            lastError || {
                success: false,
                provider: null,
                model: null,
                content: null,
                usage: null,
                error: {
                    message: "No AI provider is available.",
                    status: 500,
                },
            }
        );
    }
}

module.exports = new AIManager();