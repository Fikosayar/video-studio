export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO'
}

export interface User {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
}

export interface Asset {
  id: string;
  userId: string;
  name: string; // The "Tag" or name of the character
  url: string; // Base64 data
  createdAt: number;
}

export interface CreationHistoryItem {
  id: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string; // For videos
  prompt: string;
  tags: string[]; // New: Tags for organization
  createdAt: number;
  metadata?: {
    width?: number;
    height?: number;
    model?: string;
    aspectRatio?: string;
    resolution?: string;
  };
}

export interface VideoGenerationConfig {
  prompt: string;
  images?: string[]; // Changed from single image to array
  aspectRatio: '16:9' | '9:16';
  resolution: '720p' | '1080p';
}

export interface ImageGenerationConfig {
  prompt: string;
  size: '1K' | '2K' | '4K';
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3';
  tags: string[];
}

export interface ImageEditConfig {
  prompt: string;
  imageBase64: string;
  mimeType: string;
}