const axios = require("axios");

class OpenRouterService {
  constructor() {
    this.provider = "openrouter";
    this.model = process.env.OPENROUTER_MODEL;
  }

  async generate(prompt) {
    try {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
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
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );

      return {
        success: true,
        provider: this.provider,
        model: this.model,
        content: response.data.choices[0].message.content,
        usage: response.data.usage || null,
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
        message:
          error.response?.data?.error?.message ||
          error.message ||
          "Unknown OpenRouter Error",
        status: error.response?.status || 500,
      },
    };
  }
}

module.exports = new OpenRouterService();
