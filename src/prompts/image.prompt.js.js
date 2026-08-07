class ImagePromptBuilder {

  buildCustomImagePrompt(userPrompt) {
    if (!userPrompt || !userPrompt.trim()) {
      throw new Error("A prompt string is required to generate an image.");
    }

    return `Create a high-resolution, ultra-realistic tourism photograph based on the following request:

"${userPrompt.trim()}"

Style & Quality Guidelines:
- Professional travel photography, vibrant colors, clear natural lighting, 16:9 aspect ratio.
- Constraints: No text, no letters, no logos, no typography, no watermarks, no graphic overlays.`;
  }
}

module.exports = new ImagePromptBuilder();