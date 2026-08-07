const pollinationsService = require("../services/ai/image/pollinations.service");
const fluxService = require("../services/ai/image/flux.service");
const geminiImageService = require("../services/ai/image/gemini-image.service");

class ImageManager {
  constructor() {
    this.providers = [
      geminiImageService,
      fluxService,
        pollinationsService
    ];
  }

  async generateImage(prompt) {
    let lastError = null;

    for (const provider of this.providers) {
      console.log(`Trying provider: ${provider.provider}`);

      const result = await provider.generateImage(prompt);

      if (result.success) {
        console.log(`✅ Success from ${provider.provider}`);
        return result;
      }

      console.log(`-- ${provider.provider} failed`);
      lastError = result;
    }

    return lastError;
  }
}

module.exports = new ImageManager();