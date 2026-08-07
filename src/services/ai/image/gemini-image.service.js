const { GoogleGenAI } = require("@google/genai");

class GeminiImageService {
  constructor() {
    this.provider = "gemini";
    // Use Google's dedicated production image model
    this.model = "imagen-3.0-generate-002"; 

    this.client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  async generateImage(prompt) {
    try {
      console.log("🎨 Gemini generating image...");
      console.log("Model:", this.model);
      console.log("Prompt:", prompt);

      // Call the dedicated image generation method
      const response = await this.client.models.generateImages({
        model: this.model,
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: "image/jpeg",
          aspectRatio: "1:1", 
        },
      });

      // Extract the image from the response
      const generatedImage = response.generatedImages?.[0]?.image;

      if (!generatedImage || !generatedImage.imageBytes) {
        console.log(JSON.stringify(response, null, 2));
        throw new Error("Gemini/Imagen did not return an image.");
      }

      const buffer = Buffer.from(generatedImage.imageBytes, "base64");

      console.log(
        "✅ Gemini image generated:",
        (buffer.length / 1024).toFixed(2),
        "KB"
      );

      return {
        success: true,
        provider: this.provider,
        model: this.model,
        buffer,
        imageUrl: null,
        error: null,
      };
    } catch (error) {
      console.error("❌ Gemini Image Error");
      console.error(error);

      return this.formatError(error);
    }
  }

  formatError(error) {
    return {
      success: false,
      provider: this.provider,
      model: this.model,
      buffer: null,
      imageUrl: null,
      error: {
        message:
          error?.error?.message ||
          error?.message ||
          "Unknown Gemini Image Error",
        status: error?.status || 500,
      },
    };
  }
}

module.exports = GeminiImageService;
