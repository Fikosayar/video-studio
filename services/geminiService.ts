import { GoogleGenAI, Type, VideoGenerationReferenceType } from "@google/genai";
import { VideoGenerationConfig, ImageGenerationConfig, ImageEditConfig } from "../types";

// Helper to manage API Key state
export const ensureApiKey = async (): Promise<string> => {
  if (process.env.API_KEY) return process.env.API_KEY;
  
  const aistudio = (window as any).aistudio;
  if (aistudio && aistudio.hasSelectedApiKey) {
    const hasKey = await aistudio.hasSelectedApiKey();
    if (hasKey) {
       return 'INJECTED_BY_AISTUDIO'; 
    }
  }
  throw new Error("API Key missing");
};

export const triggerKeySelection = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && aistudio.openSelectKey) {
        await aistudio.openSelectKey();
        return true;
    }
    // Fallback for dev environments without the overlay script
    const manualKey = prompt("Please enter your Gemini API Key (Paid project required for Veo/Pro):");
    if (manualKey) {
        (window as any).GEMINI_API_KEY_OVERRIDE = manualKey;
        return true;
    }
    return false;
}

// --- Prompt Enhancement ---
export const enhancePrompt = async (originalPrompt: string): Promise<string> => {
    const apiKey = (window as any).GEMINI_API_KEY_OVERRIDE || process.env.API_KEY || '';
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Rewrite the following video prompt to be more cinematic, detailed, and optimized for AI video generation (Veo). Include details about lighting, camera angles, texture, and mood. Keep it under 100 words. Output ONLY the new prompt text, no explanations. Original Prompt: "${originalPrompt}"`
    });
    
    return response.text?.trim() || originalPrompt;
}

// --- Image Merging (Master Frame) ---
export const mergeImages = async (images: string[], prompt: string): Promise<string> => {
    const apiKey = (window as any).GEMINI_API_KEY_OVERRIDE || process.env.API_KEY || '';
    const ai = new GoogleGenAI({ apiKey });

    const parts: any[] = images.map(img => ({
        inlineData: {
            data: img,
            mimeType: 'image/png'
        }
    }));

    parts.push({
        text: `Create a high-quality, seamless master composition based on this description: "${prompt}".
        Integrate the visual elements, characters, and styles from the provided reference images. 
        The result should look like a single, cohesive cinematic frame ready for video animation.
        High resolution, 16:9 aspect ratio.`
    });

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: {
            imageConfig: {
                aspectRatio: '16:9',
                imageSize: '2K'
            }
        }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    throw new Error("Failed to merge images.");
}

// --- Veo Video Generation ---
export const generateVideo = async (config: VideoGenerationConfig) => {
  const apiKey = (window as any).GEMINI_API_KEY_OVERRIDE || process.env.API_KEY || '';
  const ai = new GoogleGenAI({ apiKey });

  const imageCount = config.images?.length || 0;
  let operation: any;
  let modelUsed = 'veo-3.1-fast-generate-preview';

  // MULTI-IMAGE MODE (2-3 Images)
  // Must use 'veo-3.1-generate-preview' (Base model)
  // Must use 720p, 16:9
  if (imageCount > 1) {
     modelUsed = 'veo-3.1-generate-preview';
     const referenceImagesPayload = config.images!.map(img => ({
         image: {
             imageBytes: img,
             mimeType: 'image/png'
         },
         referenceType: VideoGenerationReferenceType.ASSET
     }));

     operation = await ai.models.generateVideos({
         model: modelUsed,
         prompt: config.prompt,
         config: {
             numberOfVideos: 1,
             referenceImages: referenceImagesPayload,
             resolution: '720p', // Enforced by model for multi-ref
             aspectRatio: '16:9' // Enforced by model for multi-ref
         }
     });
  } 
  // SINGLE/NO IMAGE MODE
  // Uses 'veo-3.1-fast-generate-preview'
  else {
     let payload: any = {
        model: modelUsed,
        prompt: config.prompt,
        config: {
          numberOfVideos: 1,
          resolution: config.resolution,
          aspectRatio: config.aspectRatio
        }
     };

     if (imageCount === 1) {
        payload.image = {
          imageBytes: config.images![0],
          mimeType: 'image/png'
        };
     }

     operation = await ai.models.generateVideos(payload);
  }

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
  const fetchUrl = `${videoUri}&key=${apiKey}`;
  const res = await fetch(fetchUrl);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};


// --- Image Generation (Gemini 3 Pro Image) ---
export const generateHighQualityImage = async (config: ImageGenerationConfig) => {
  const apiKey = (window as any).GEMINI_API_KEY_OVERRIDE || process.env.API_KEY || '';
  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [{ text: config.prompt }]
    },
    config: {
      imageConfig: {
        imageSize: config.size,
        aspectRatio: config.aspectRatio
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
  const apiKey = (window as any).GEMINI_API_KEY_OVERRIDE || process.env.API_KEY || '';
  const ai = new GoogleGenAI({ apiKey });

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

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No edited image returned. The model might have refused the edit or returned text only.");
};