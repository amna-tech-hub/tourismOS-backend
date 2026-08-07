const { InferenceClient } = require("@huggingface/inference");

class FluxService {
  constructor() {
    this.provider = "hf-inference"; 
    this.model = "stabilityai/stable-diffusion-xl-base-1.0"; 
    this.client = new InferenceClient(
      process.env.HUGGINGFACE_API_KEY
    );
  }

  async generateImage(prompt) {
    try {
      console.log(` Native HF generating image using ${this.model}...`);
      console.log("Prompt:", prompt);

      const imageBlob = await this.client.textToImage({
        model: this.model,
        inputs: prompt,
        provider: this.provider, 
      });

      const arrayBuffer = await imageBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log(
        "✅ HuggingFace image generated:",
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
      console.error("--- HuggingFace Error:", error);
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
        message: error.message || "Unknown Error",
        status: error.status || 500,
      },
    };
  }
}

module.exports = new FluxService();
