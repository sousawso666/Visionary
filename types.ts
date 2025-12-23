
export enum ToolType {
  IMAGE_GEN = 'IMAGE_GEN',
  IMAGE_EDIT = 'IMAGE_EDIT',
  STORY_GEN = 'STORY_GEN',
  IMAGE_MERGE = 'IMAGE_MERGE',
  VIDEO_GEN = 'VIDEO_GEN',
  PRICING = 'PRICING',
  DEPLOY = 'DEPLOY'
}

export type Language = 'en' | 'pt';

export type UserTier = 'free' | 'start' | 'pro';

export type ImageStyle = 'none' | 'photorealistic' | 'cinematic' | 'anime' | '3d_render' | 'cyberpunk' | 'oil_painting';

export interface UsageStats {
  imagesGenerated: number;
  videosGenerated: number;
}

export interface User {
  email: string;
  name: string;
  isGoogle?: boolean;
  tier: UserTier;
  usage: UsageStats;
}

export interface GeneratedContent {
  id: string;
  type: 'image' | 'text' | 'video';
  content: string;
  audioContent?: string;
  prompt: string;
  timestamp: number;
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
export type VideoResolution = '720p' | '1080p';
