export enum AppRoute {
  HOME = '/',
  SCAN = '/scan',
  CONTINUOUS = '/continuous'
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
