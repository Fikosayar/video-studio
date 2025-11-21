import { GoogleGenAI, Type } from "@google/genai";
import { VideoGenerationConfig, ImageGenerationConfig, ImageEditConfig } from "../types";

// Helper to manage API Key state for specific high-tier models
export const ensureApiKey = async (): Promise<string> => {
  // Check if global env key is set (for basic features)
  if (process.env.API_KEY) return process.env.API_KEY;
  
  // For advanced features (Veo, Pro Image), user selection is required
  const aistudio = (window as any).aistudio;
  if (aistudio && aistudio.hasSelectedApiKey) {
    const hasKey = await aistudio.hasSelectedApiKey();
    if (hasKey) {
       // The key is injected automatically into fetch/client if selected via aistudio
       // However, for the SDK we might need to trigger the selector if we don't have a process.env fallback
       return 'INJECTED_BY_AISTUDIO'; 
    }
  }
  throw new Error("API Key missing");
};

export const triggerKeySelection = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && aistudio.openSelectKey) {
        await aistudio.openSelectKey();
        // After selection, typically the page might reload or we re-init
        return true;
    }
    return false;
}

// --- Veo Video Generation ---
export const generateVideo = async (config: VideoGenerationConfig) => {
  // Use the AI Studio key flow for Veo
  if (!(window as any).aistudio) {
      console.warn("AI Studio overlay not found, assuming process.env.API_KEY for dev");
  }
  
  // We instantiate a new client. If using the window.aistudio flow, the key is handled internally 
  // or we access it via process.env if the environment injects it after selection. 
  // For this code, we assume standard env var or injected var.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  let payload: any = {
    model: 'veo-3.1-fast-generate-preview',
    prompt: config.prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p', // 720p is safe default for preview
      aspectRatio: config.aspectRatio
    }
  };

  if (config.image) {
    payload.image = {
      imageBytes: config.image,
      mimeType: 'image/png' // Assuming PNG for simplicity of input
    };
  }

  let operation = await ai.models.generateVideos(payload);

  // Polling loop
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  if (operation.error) {
    throw new Error((operation.error as any).message || "Video generation failed");
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("No video URI returned");

  // Fetch the actual binary
  const fetchUrl = `${videoUri}&key=${process.env.API_KEY}`;
  const res = await fetch(fetchUrl);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};


// --- Image Generation (Gemini 3 Pro Image) ---
export const generateHighQualityImage = async (config: ImageGenerationConfig) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [{ text: config.prompt }]
    },
    config: {
      imageConfig: {
        imageSize: config.size,
        aspectRatio: '1:1'
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image data found in response");
};


// --- Image Editing (Gemini 2.5 Flash Image) ---
export const editImage = async (config: ImageEditConfig) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: config.imageBase64,
            mimeType: config.mimeType
          }
        },
        { text: config.prompt }
      ]
    }
  });

  // Flash Image usually returns the new image in inlineData
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No edited image returned. The model might have refused the edit or returned text only.");
};

// --- General AI Helper ---
export const analyzeText = async (prompt: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });
    return response.text;
}