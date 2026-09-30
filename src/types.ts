export interface PartOffset {
  x: number;
  y: number;
  scale: number;
}

export interface SlotConfig {
  id: number; // 1 to 15
  name: string;
  head: PartOffset;
  body: PartOffset;
  leg: PartOffset;
  global: PartOffset;
  enabled: boolean;
  // Per-slot edge trim (e.g. for trimming adjacent hair #12 ponytail bleed)
  trimLeft?: number;
  trimRight?: number;
}

export interface GridDimensions {
  cols: number; // 5
  rows: number; // 3
  canvasWidth: number;
  canvasHeight: number;
  slotWidth: number;
  slotHeight: number;
  marginHorizontal: number;
  marginTop: number;
  gapX: number;
  gapY: number;
}

export interface GuideLineSettings {
  showGuideBackground: boolean;
  guideOpacity: number; // 0.0 to 1.0
  showEyeLine: boolean;
  showFootLine: boolean;
  eyeLineYOffset: number; // Pixels to move eye line up/down
  footLineYOffset: number; // Pixels to move foot line up/down
  showCenterLine: boolean;
  showBoxBorder: boolean;
  showNumbers: boolean;
  showCutMarks: boolean;
  cutMarkColor: string;
  cutMarkStyle: 'dashed' | 'solid' | 'cropmarks';
  cutMarkWidth: number;
  backgroundColor: 'white' | 'transparent' | 'dark' | 'grid';
}

export interface ProcessingSettings {
  bgRemovalMethod: 'floodfill' | 'whitekey' | 'none';
  tolerance: number; // 0 to 50
  smoothEdges: boolean;
  layerOrder: 'head-body-leg' | 'head-leg-body';
  autoCleanStrayHair: boolean; // Automatically detect and remove disconnected neighbor hair bleed
  sideTrimPx: number; // Margin trim on tile boundaries (0 to 30px)
}

export interface UploadedSheets {
  faceSheet: HTMLImageElement | null;
  bodySheet: HTMLImageElement | null;
  legSheet: HTMLImageElement | null;
  guideSheet: HTMLImageElement | null;
  faceFileName?: string;
  bodyFileName?: string;
  legFileName?: string;
  guideFileName?: string;
}

export type SelectedPart = 'global' | 'head' | 'body' | 'leg';
