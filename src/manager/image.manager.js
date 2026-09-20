const pollinationsService = require("../services/ai/image/pollinations.service");
const fluxService = require("../services/ai/image/flux.service");
const geminiImageService = require("../services/ai/image/gemini-image.service");

class ImageManager {
  constructor() {
    this.providers = [
      geminiImageService,
      fluxService,
      pollinationsService,
    ];

  }
  async generateImage(prompt) {
    let lastError = null;

    for (const provider of this.providers) {
      const providerName =
        provider?.provider || "Unknown Provider";

   
      // Don't crash if export is wrong
      if (
        !provider ||
        typeof provider.generateImage !== "function"
      ) {
        console.error(
          ` ${providerName} does not implement generateImage()`
        );

        lastError = {
          success: false,
          provider: providerName,
          error: `${providerName} does not implement generateImage()`,
        };

        continue;
      }

      try {
        const result =
          await provider.generateImage(prompt);

        if (result?.success) {
          console.log(
            ` Success from ${providerName}`
          );

          return result;
        }

        console.log(
          `❌ ${providerName} failed:`,
          result?.error
        );

        lastError = result;

      } catch (error) {
        console.error(
          `❌ ${providerName} threw an exception:`,
          error.message
        );

        lastError = {
          success: false,
          provider: providerName,
          error: error.message,
        };

        // IMPORTANT:
        // Continue to next provider
        continue;
      }
    }

    return (
      lastError || {
        success: false,
        error: "All image providers failed.",
      }
    );
  }
}

module.exports = new ImageManager();