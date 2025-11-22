
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

// --- Image Merging (Master Frame & Composition) ---
export const mergeImages = async (images: string[], prompt: string): Promise<string> => {
    const apiKey = (window as any).GEMINI_API_KEY_OVERRIDE || process.env.API_KEY || '';
    const ai = new GoogleGenAI({ apiKey });

    const parts: any[] = images.map(img => ({
        inlineData: {
            data: img,
            mimeType: 'image/png'
        }
    }));

    let compositionPrompt = "";
    
    // Specialized prompt logic
    if (images.length === 2 && prompt.toLowerCase().includes('subject') && prompt.toLowerCase().includes('background')) {
        // Veo Studio Case: Subject + Location
        compositionPrompt = `Perform a high-fidelity image composition.
        
        INPUTS:
        - Image 1: The SUBJECT (Character/Person).
        - Image 2: The BACKGROUND (Location/Scene).
        
        INSTRUCTIONS:
        1. Place the SUBJECT from Image 1 into the BACKGROUND from Image 2.
        2. IDENTITY PRESERVATION IS CRITICAL. The face, hair, and body features of the subject in the final image MUST be identical to Image 1.
        3. Adjust lighting and shadows on the subject to match the environment of Image 2 seamlessly.
        4. Maintain the perspective and depth of Image 2.
        5. The final output must look like a single, unedited photograph or cinematic frame.
        
        Context/Action: ${prompt}
        
        Output: A single high-resolution image.`;
    } else {
        // Image Studio Case / General Blending
        compositionPrompt = `Create a high-quality, seamless master composition based on these reference images and description.
        
        USER PROMPT: "${prompt || 'Combine these images artistically.'}"
        
        INSTRUCTIONS:
        1. Analyze the visual style, subjects, and elements of all input images.
        2. Blend them creatively according to the user prompt.
        3. If no specific instruction is given, create a balanced composition integrating key elements from all images.
        4. Ensure consistent lighting, style, and high aesthetic quality.
        
        Output: A single high-resolution image.`;
    }

    parts.push({ text: compositionPrompt });

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: {
            imageConfig: {
                aspectRatio: '16:9', // Default to cinematic, can be cropped later if needed
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

  // Default prompt if empty (Pure Image-to-Video)
  const safePrompt = config.prompt || "Cinematic movement, high quality, 4k";

  // If we have a single image (which might be a pre-merged Master Frame), we respect the requested resolution
  // Note: 1080p is only supported by the 'fast' model with 0 or 1 image input.
  // The 'base' model (veo-3.1-generate-preview) supports multi-image inputs but is locked to 720p.
  
  // MULTI-IMAGE MODE (Raw 2-3 Images passed directly to Veo)
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
         prompt: safePrompt,
         config: {
             numberOfVideos: 1,
             referenceImages: referenceImagesPayload,
             resolution: '720p', // Enforced by model for multi-ref
             aspectRatio: '16:9' // Enforced by model for multi-ref
         }
     });
  } 
  // SINGLE/NO IMAGE MODE (Master Frame or Text-to-Video)
  else {
     // We can use Fast model for 1080p support if we have <= 1 image
     let payload: any = {
        model: modelUsed,
        prompt: safePrompt,
        config: {
          numberOfVideos: 1,
          resolution: config.resolution || '1080p', // Use requested resolution
          aspectRatio: config.aspectRatio || '16:9' // Use requested aspect ratio
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
