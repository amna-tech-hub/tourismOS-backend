const { GoogleGenAI } = require("@google/genai");
const tourismSystemInstruction = require("../../prompts/tourism.prompt");
class GeminiService {
    constructor() {
        this.client = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
        });

        this.model = process.env.GEMINI_MODEL;
    }

    formatError(error) {
        console.error("Gemini Service Error:", error);

        const apiError = error?.error || {};

        return {
            success: false,
            provider: "gemini",
            model: this.model,
            content: null,
            usage: null,
            error: {
                code: apiError.code || 500,
                status: apiError.status || "INTERNAL_ERROR",
                message:
                    apiError.message ||
                    "Failed to generate AI response.",
            },
        };
    }

    async generate(prompt) {
        try {
            const response = await this.client.models.generateContent({
                model: this.model,
                contents: prompt,
                config: {
                    systemInstruction: tourismSystemInstruction,
                },
            });

            return {
                success: true,
                provider: "gemini",
                model: this.model,
                content: response.text,
                usage: response.usageMetadata || null,
            };

        } catch (error) {
            return this.formatError(error);
        }
    }
}

module.exports = new GeminiService();