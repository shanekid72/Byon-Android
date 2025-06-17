import React from 'react';

// Partner Configuration Types
export interface PartnerConfig {
  id?: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  website?: string;
  
  // Branding
  branding: BrandingConfig;
  
  // App Configuration
  appConfig: AppConfig;
  
  // Features
  features: FeatureConfig;
  
  // API Configuration
  apiConfig: ApiConfig;
  
  // Metadata
  createdAt?: string;
  updatedAt?: string;
  status: 'draft' | 'generating' | 'ready' | 'deployed';
}

export interface BrandingConfig {
  // Logo & Images
  logo?: File | string;
  logoUrl?: string;
  icon?: File | string;
  iconUrl?: string;
  splashScreen?: File | string;
  splashScreenUrl?: string;
  
  // Colors
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  
  // Typography
  fontFamily: string;
  
  // App Store Assets
  screenshots: (File | string)[];
  appStoreIcon?: File | string;
  appStoreIconUrl?: string;
}

export interface AppConfig {
  appName: string;
  packageName: string;
  bundleId: string;
  version: string;
  versionCode: number;
  
  // App Store Information
  description: string;
  shortDescription: string;
  keywords: string[];
  category: string;
  
  // Permissions
  permissions: Permission[];
  
  // Supported Countries
  supportedCountries: string[];
  
  // Languages
  supportedLanguages: string[];
}

export interface FeatureConfig {
  // Core Features
  remittance: boolean;
  billPayment: boolean;
  mobileRecharge: boolean;
  cardServices: boolean;
  
  // Advanced Features
  biometricAuth: boolean;
  pushNotifications: boolean;
  chatSupport: boolean;
  loyaltyProgram: boolean;
  referralProgram: boolean;
  
  // eKYC Features
  documentUpload: boolean;
  facialVerification: boolean;
  livenessDetection: boolean;
  
  // Payment Methods
  bankTransfer: boolean;
  cardPayment: boolean;
  digitalWallet: boolean;
  cryptocurrency: boolean;
}

export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  partnerId: string;
  environment: 'sandbox' | 'production';
  
  // Rate Limiting
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  
  // Webhook Configuration
  webhookUrl?: string;
  webhookSecret?: string;
}

export interface Permission {
  name: string;
  description: string;
  required: boolean;
  category: 'security' | 'communication' | 'storage' | 'location' | 'camera' | 'other';
}

// UI State Types
export interface AppPreview {
  currentScreen: AppScreen;
  isLoading: boolean;
  config: PartnerConfig;
}

export type AppScreen = 
  | 'splash'
  | 'login'
  | 'home'
  | 'send-money'
  | 'recipients'
  | 'profile'
  | 'settings';

// Form Types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  isValid: boolean;
  isCompleted: boolean;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ValidationError[];
}

export interface BuildStatus {
  id: string;
  status: 'pending' | 'building' | 'success' | 'failed';
  progress: number;
  logs: BuildLog[];
  downloadUrl?: string;
  error?: string;
}

export interface BuildLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
}

// File Upload Types
export interface FileUpload {
  file: File;
  preview?: string;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

// Color Palette Types
export interface ColorPalette {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  preview: string;
}

// Template Types
export interface AppTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
  features: string[];
  branding: Partial<BrandingConfig>;
  appConfig: Partial<AppConfig>;
  featureConfig: Partial<FeatureConfig>;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Event Types
export interface ConfigUpdateEvent {
  section: keyof PartnerConfig;
  field: string;
  value: any;
  oldValue?: any;
} 