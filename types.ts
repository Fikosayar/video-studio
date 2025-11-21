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

export interface CreationHistoryItem {
  id: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string; // For videos
  prompt: string;
  createdAt: number;
  metadata?: {
    width?: number;
    height?: number;
    model?: string;
  };
}

export interface VideoGenerationConfig {
  prompt: string;
  image?: string; // Base64
  aspectRatio: '16:9' | '9:16';
}

export interface ImageGenerationConfig {
  prompt: string;
  size: '1K' | '2K' | '4K';
}

export interface ImageEditConfig {
  prompt: string;
  imageBase64: string;
  mimeType: string;
}