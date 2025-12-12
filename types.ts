export enum AppRoute {
  HOME = '/',
  NAVIGATION = '/navigation'
}

export interface AnalysisResult {
  text: string;
  timestamp: number;
}

export interface CameraHandle {
  captureFrame: () => string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}