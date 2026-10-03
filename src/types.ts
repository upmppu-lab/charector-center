export interface PartOffset {
  x: number;
  y: number;
  scale: number;
}

export interface SlotConfig {
  id: number; // 1 to 30
  name: string;
  face: PartOffset;    // 얼굴 (얼굴형, 눈, 코, 입, 볼터치)
  hair: PartOffset;    // 헤어 (앞머리, 뒷머리, 스타일)
  body: PartOffset;    // 상의
  leg: PartOffset;     // 하의
  outfit: PartOffset;  // 상의+하의 (일체형 의상 30종)
  fullbody: PartOffset; // 전신 캐릭터 (얼굴+몸 일체형 30종)
  head: PartOffset;    // 호환성 유지용 (hair와 동기화)
  global: PartOffset;
  enabled: boolean;
  trimLeft?: number;
  trimRight?: number;
}

export type PartCategory = 'face' | 'hair' | 'body' | 'leg' | 'head' | 'outfit' | 'fullbody';

export interface AnchorSettings {
  // Face & Hair anchor: nose center
  faceNoseY: number;
  hairNoseY: number;
  headNoseY: number; // 호환성
  // Top anchor: neck top center
  bodyNeckY: number;
  outfitNeckY?: number; // 상의+하의 목끝 결합 기준선
  // Bottom anchor: foot ground center
  legFootY: number;
  fullbodyFootY?: number; // 전신 캐릭터 발끝 기준선
  // Assembly joint spacing
  neckJointGap: number;
  waistJointGap: number;
}

export interface GuideDisplaySettings {
  showAnchorCrosshair: boolean;
  showCenterLine: boolean;
  centerLineColor?: string;
  centerLineWidth?: number;
  centerLineStyle?: 'solid' | 'dashed';
  showReferenceLines: boolean; // eye/nose line for head, neck/shoulder line for body, waist/foot line for leg
  showBoxBorder: boolean;
  showNumbers: boolean;
  showCutMarks: boolean;
  cutMarkColor: string;
  cutMarkStyle: 'dashed' | 'solid' | 'cropmarks';
  cutMarkWidth: number;
  backgroundColor: 'transparent' | 'dark' | 'grid' | 'white';
}

export type SheetMode = 15 | 30;
export type Grid30Layout = 'auto' | '6x5' | '5x6' | '10x3' | '3x10';
export type CompositionMode = '2part' | '4part' | 'fullbody'; // '2part': 얼굴+의상 | '4part': 세부4파트 | 'fullbody': 전신 30종 일체형

export interface SheetSliceConfig {
  autoDetect: boolean;
  rows: number;
  cols: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  gapX: number;
  gapY: number;
  offsetX: number;
  offsetY: number;
  customCellBoxes?: Array<{ x: number; y: number; width: number; height: number }>;
}

export interface ProcessingSettings {
  bgRemovalMethod: 'floodfill' | 'whitekey' | 'none';
  tolerance: number; // 0 to 50
  smoothEdges: boolean;
  layerOrder: 'hair-face-body-leg' | 'head-body-leg' | 'head-leg-body';
  autoCleanStrayHair: boolean;
  sideTrimPx: number;
  sheetMode?: SheetMode;
  grid30Layout?: Grid30Layout;
  compositionMode?: CompositionMode;
  sliceConfig?: SheetSliceConfig;
}

export interface UploadedSheets {
  faceSheet: HTMLImageElement | null;
  hairSheet: HTMLImageElement | null;
  bodySheet: HTMLImageElement | null;
  legSheet: HTMLImageElement | null;
  outfitSheet?: HTMLImageElement | null; // 상의+하의 30종 시트
  fullbodySheet?: HTMLImageElement | null; // 전신 30종 캐릭터 시트 (얼굴+몸 일체형)
  faceFileName?: string;
  hairFileName?: string;
  bodyFileName?: string;
  legFileName?: string;
  outfitFileName?: string;
  fullbodyFileName?: string;
}

export type ActiveAppView =
  | 'align-face'
  | 'align-hair'
  | 'align-body'
  | 'align-leg'
  | 'align-head'
  | 'align-outfit'
  | 'align-fullbody' // 전신 30종 정렬
  | 'game-customizer'
  | 'export';
