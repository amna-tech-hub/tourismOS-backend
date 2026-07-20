const Groq = require("groq-sdk");
const env = require("../../config/env.config");

class GroqService {
    constructor() {
        this.client = new Groq({
            apiKey: process.env.GROQ_API_KEY,
        });

        this.model = process.env.GROQ_MODEL;
        this.provider = "groq";
    }

  
    async generate(prompt) {
        try {
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: "system",
                        content:
                            "You are an expert travel assistant that creates personalized travel itineraries.",
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
            });

            return {
                success: true,
                provider: this.provider,
                model: this.model,
                content: response.choices[0].message.content,
                usage: response.usage || null,
                error: null,
            };
        } catch (error) {
            return this.formatError(error);
        }
    }

   
    formatError(error) {
        return {
            success: false,
            provider: this.provider,
            model: this.model,
            content: null,
            usage: null,
            error: {
                message: error.message,
                status: error.status || 500,
            },
        };
    }
}

module.exports = new GroqService();