class PollinationsService {
  constructor() {
    this.provider = "pollinations";
    this.model = "pollinations-image";
  }

 async generateImage(prompt) {
  try {
    if (!prompt) {
      throw new Error("Prompt is required.");
    }

    let promptText = prompt;

    if (typeof promptText !== "string") {
      if (typeof promptText === "object") {
        promptText = JSON.stringify(promptText);
      } else {
        promptText = String(promptText || "");
      }
    }

    const finalPrompt = promptText.trim() || "a beautiful landscape";
    const encodedPrompt = encodeURIComponent(finalPrompt);

    const seed = Math.floor(Math.random() * 2147483647);

const url =
`https://image.pollinations.ai/prompt/${encodedPrompt}?model=flux&width=1024&height=576&seed=${seed}&nologo=true`;
  
    const response = await fetch(url);

 
    // Stop immediately if HTTP failed
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Pollinations Error:", errorText);

      return this.formatError({
        message: `Pollinations returned ${response.status}`,
      });
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.startsWith("image")) {
      const body = await response.text();

      console.error("Unexpected response:", body);

      return this.formatError({
        message: "Pollinations did not return an image.",
      });
    }

    const arrayBuffer = await response.arrayBuffer();

    const buffer = Buffer.from(arrayBuffer);

   
    return {
      success: true,
      provider: this.provider,
      model: this.model,
      buffer,
      imageUrl: null,
      error: null,
    };
  } catch (error) {
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
      message: error.message || "Unknown Error",
      status: error.status || 500,
    },
  };
}
}
module.exports = new PollinationsService();