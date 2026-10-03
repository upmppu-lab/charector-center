import React, { useEffect, useRef, useState } from 'react';
import {
  AnchorSettings,
  CompositionMode,
  PartCategory,
  ProcessingSettings,
  SlotConfig,
} from '../types';
import {
  downloadCanvas,
  renderAssembledCharacter,
} from '../utils/imageProcessor';
import {
  Dice5,
  Download,
  Layers,
  Sparkles,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Check,
  Wand2,
  Grid,
  Scissors,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Crosshair,
  ExternalLink,
  Move,
  Maximize2,
  ChevronRight,
  Focus,
} from 'lucide-react';

interface GameCharacterCustomizerProps {
  faceTiles: HTMLCanvasElement[];
  hairTiles: HTMLCanvasElement[];
  bodyTiles: HTMLCanvasElement[];
  legTiles: HTMLCanvasElement[];
  headTiles?: HTMLCanvasElement[]; // 호환성
  outfitTiles?: HTMLCanvasElement[]; // 상의+하의 30종
  fullbodyTiles?: HTMLCanvasElement[]; // 전신 캐릭터 30종
  slotConfigs: SlotConfig[];
  anchorSettings: AnchorSettings;
  onUpdateAnchorSettings: (settings: Partial<AnchorSettings>) => void;
  processingSettings: ProcessingSettings;
  onUpdateProcessingSettings: (settings: Partial<ProcessingSettings>) => void;
  sheetMode?: 15 | 30;
  compositionMode?: CompositionMode;
  onAutoAlignAllParts?: () => void;
  onOpenGridSliceModal?: (target?: 'face' | 'hair' | 'body' | 'leg' | 'outfit' | 'fullbody') => void;
  // Navigation & Real-time position editing props
  onNavigateToPartAlign?: (category: PartCategory, slotId: number) => void;
  onUpdateSlotConfig?: (id: number, updater: (prev: SlotConfig) => SlotConfig) => void;
  onAutoAlignSingleSlot?: (id: number, category: PartCategory) => void;
  onResetSlotConfig?: (id: number) => void;
  selectedFace?: number;
  onSelectFace?: (id: number) => void;
  selectedHair?: number;
  onSelectHair?: (id: number) => void;
  selectedTop?: number;
  onSelectTop?: (id: number) => void;
  selectedBottom?: number;
  onSelectBottom?: (id: number) => void;
  selectedOutfit?: number;
  onSelectOutfit?: (id: number) => void;
  selectedFullbody?: number;
  onSelectFullbody?: (id: number) => void;
  onSplitFullbodyToFaceAndOutfit?: () => void;
  onAutoAlignToFirst?: (category: PartCategory) => void;
}

export const GameCharacterCustomizer: React.FC<GameCharacterCustomizerProps> = ({
  faceTiles,
  hairTiles,
  bodyTiles,
  legTiles,
  headTiles,
  outfitTiles,
  fullbodyTiles,
  slotConfigs,
  anchorSettings,
  onUpdateAnchorSettings,
  processingSettings,
  onUpdateProcessingSettings,
  sheetMode = 15,
  compositionMode = '2part',
  onAutoAlignAllParts,
  onOpenGridSliceModal,
  onNavigateToPartAlign,
  onUpdateSlotConfig,
  onAutoAlignSingleSlot,
  onResetSlotConfig,
  onAutoAlignToFirst,
  selectedFace: propFace,
  onSelectFace: propOnSelectFace,
  selectedHair: propHair,
  onSelectHair: propOnSelectHair,
  selectedTop: propTop,
  onSelectTop: propOnSelectTop,
  selectedBottom: propBottom,
  onSelectBottom: propOnSelectBottom,
  selectedOutfit: propOutfit,
  onSelectOutfit: propOnSelectOutfit,
  selectedFullbody: propFullbody,
  onSelectFullbody: propOnSelectFullbody,
  onSplitFullbodyToFaceAndOutfit,
}) => {
  // Resolved tiles (support headTiles fallback for hair)
  const actualHairTiles = hairTiles && hairTiles.length > 0 ? hairTiles : (headTiles || []);
  const actualOutfitTiles = outfitTiles && outfitTiles.length > 0 ? outfitTiles : bodyTiles;
  const actualCount =
    sheetMode ||
    Math.max(faceTiles.length, actualHairTiles.length, bodyTiles.length, legTiles.length, actualOutfitTiles.length, fullbodyTiles?.length || 0, 15);

  // Selected indices (with internal fallback if not controlled by parent)
  const [localFace, setLocalFace] = useState<number>(1);
  const [localHair, setLocalHair] = useState<number>(1);
  const [localTop, setLocalTop] = useState<number>(1);
  const [localBottom, setLocalBottom] = useState<number>(1);
  const [localOutfit, setLocalOutfit] = useState<number>(1);
  const [localFullbody, setLocalFullbody] = useState<number>(1);

  const selectedFace = propFace !== undefined ? propFace : localFace;
  const setSelectedFace = (id: number) => {
    setLocalFace(id);
    if (propOnSelectFace) propOnSelectFace(id);
  };

  const selectedHair = propHair !== undefined ? propHair : localHair;
  const setSelectedHair = (id: number) => {
    setLocalHair(id);
    if (propOnSelectHair) propOnSelectHair(id);
  };

  const selectedTop = propTop !== undefined ? propTop : localTop;
  const setSelectedTop = (id: number) => {
    setLocalTop(id);
    if (propOnSelectTop) propOnSelectTop(id);
  };

  const selectedBottom = propBottom !== undefined ? propBottom : localBottom;
  const setSelectedBottom = (id: number) => {
    setLocalBottom(id);
    if (propOnSelectBottom) propOnSelectBottom(id);
  };

  const selectedOutfit = propOutfit !== undefined ? propOutfit : localOutfit;
  const setSelectedOutfit = (id: number) => {
    setLocalOutfit(id);
    if (propOnSelectOutfit) propOnSelectOutfit(id);
  };

  const selectedFullbody = propFullbody !== undefined ? propFullbody : localFullbody;
  const setSelectedFullbody = (id: number) => {
    setLocalFullbody(id);
    if (propOnSelectFullbody) propOnSelectFullbody(id);
  };

  // Animation, notifications, and background settings
  const [isIdleAnimation, setIsIdleAnimation] = useState<boolean>(true);
  const [bgStyle, setBgStyle] = useState<'studio' | 'neon' | 'pastel' | 'transparent'>('studio');
  const [showJointControls, setShowJointControls] = useState(false);
  const [showPositionControls, setShowPositionControls] = useState(true);
  const [activeAdjustTarget, setActiveAdjustTarget] = useState<'face' | 'outfit' | 'fullbody'>(
    compositionMode === 'fullbody' ? 'fullbody' : 'face'
  );
  const [nudgeStep, setNudgeStep] = useState<number>(2);
  const [autoAlignNotification, setAutoAlignNotification] = useState<string | null>(null);

  // Keep adjust target synced with compositionMode
  useEffect(() => {
    if (compositionMode === 'fullbody') {
      setActiveAdjustTarget('fullbody');
    } else if (compositionMode === '2part') {
      setActiveAdjustTarget('face');
    }
  }, [compositionMode]);

  // Interactive face dragging state on canvas
  const [isDraggingFace, setIsDraggingFace] = useState<boolean>(false);
  const [isFaceHovered, setIsFaceHovered] = useState<boolean>(false);
  const [dragStartPos, setDragStartPos] = useState({ clientX: 0, clientY: 0, initialX: 0, initialY: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Helper to get thumbnails
  const getThumbnailDataUrl = (tile: HTMLCanvasElement | undefined) => {
    if (!tile) return '';
    return tile.toDataURL();
  };

  // Randomize parts
  const handleRandomize = () => {
    if (compositionMode === 'fullbody') {
      setSelectedFullbody(Math.floor(Math.random() * actualCount) + 1);
    } else {
      setSelectedFace(Math.floor(Math.random() * actualCount) + 1);
      setSelectedHair(Math.floor(Math.random() * actualCount) + 1);
      setSelectedTop(Math.floor(Math.random() * actualCount) + 1);
      setSelectedBottom(Math.floor(Math.random() * actualCount) + 1);
      setSelectedOutfit(Math.floor(Math.random() * actualCount) + 1);
    }
  };

  // Apply complete set #N
  const handleApplyPresetSet = (id: number) => {
    setSelectedFullbody(id);
    setSelectedFace(id);
    setSelectedHair(id);
    setSelectedTop(id);
    setSelectedBottom(id);
    setSelectedOutfit(id);
  };

  // Current configurations
  const currentFaceConfig = slotConfigs.find((s) => s.id === selectedFace)?.face || { x: 0, y: 0, scale: 1 };
  const currentOutfitConfig = slotConfigs.find((s) => s.id === selectedOutfit)?.outfit ||
    slotConfigs.find((s) => s.id === selectedOutfit)?.body || { x: 0, y: 0, scale: 1 };
  const currentFullbodyConfig = slotConfigs.find((s) => s.id === selectedFullbody)?.fullbody || { x: 0, y: 0, scale: 1 };

  // Fullbody Nudge Handlers
  const handleNudgeFullbody = (dx: number, dy: number) => {
    if (!onUpdateSlotConfig) return;
    onUpdateSlotConfig(selectedFullbody, (prev) => ({
      ...prev,
      fullbody: {
        ...prev.fullbody,
        x: Math.max(-150, Math.min(150, (prev.fullbody?.x || 0) + dx)),
        y: Math.max(-150, Math.min(150, (prev.fullbody?.y || 0) + dy)),
      },
    }));
  };

  const handleSetFullbodyScale = (scale: number) => {
    if (!onUpdateSlotConfig) return;
    onUpdateSlotConfig(selectedFullbody, (prev) => ({
      ...prev,
      fullbody: {
        ...prev.fullbody,
        scale: Math.max(0.5, Math.min(1.8, Number(scale.toFixed(2)))),
      },
    }));
  };

  const handleResetFullbody = () => {
    if (!onUpdateSlotConfig) return;
    onUpdateSlotConfig(selectedFullbody, (prev) => ({
      ...prev,
      fullbody: { x: 0, y: 0, scale: 1 },
    }));
  };

  const handleJumpToFullbodyAlign = () => {
    if (onNavigateToPartAlign) {
      onNavigateToPartAlign('fullbody', selectedFullbody);
    }
  };

  // Face Nudge Handlers (Direct live movement in Character Customizer)
  const handleNudgeFace = (dx: number, dy: number) => {
    if (!onUpdateSlotConfig) return;
    onUpdateSlotConfig(selectedFace, (prev) => ({
      ...prev,
      face: {
        ...prev.face,
        x: Math.max(-150, Math.min(150, (prev.face?.x || 0) + dx)),
        y: Math.max(-150, Math.min(150, (prev.face?.y || 0) + dy)),
      },
    }));
  };

  const handleSetFaceScale = (scale: number) => {
    if (!onUpdateSlotConfig) return;
    onUpdateSlotConfig(selectedFace, (prev) => ({
      ...prev,
      face: {
        ...prev.face,
        scale: Math.max(0.5, Math.min(1.8, Number(scale.toFixed(2)))),
      },
    }));
  };

  const handleResetFace = () => {
    if (onResetSlotConfig) {
      if (!onUpdateSlotConfig) return;
      onUpdateSlotConfig(selectedFace, (prev) => ({
        ...prev,
        face: { x: 0, y: 0, scale: 1 },
      }));
    } else if (onUpdateSlotConfig) {
      onUpdateSlotConfig(selectedFace, (prev) => ({
        ...prev,
        face: { x: 0, y: 0, scale: 1 },
      }));
    }
  };

  // Outfit Nudge Handlers
  const handleNudgeOutfit = (dx: number, dy: number) => {
    if (!onUpdateSlotConfig) return;
    const targetKey = compositionMode === '2part' ? 'outfit' : 'body';
    onUpdateSlotConfig(selectedOutfit, (prev) => ({
      ...prev,
      [targetKey]: {
        ...prev[targetKey],
        x: Math.max(-150, Math.min(150, (prev[targetKey]?.x || 0) + dx)),
        y: Math.max(-150, Math.min(150, (prev[targetKey]?.y || 0) + dy)),
      },
    }));
  };

  const handleResetOutfit = () => {
    if (!onUpdateSlotConfig) return;
    const targetKey = compositionMode === '2part' ? 'outfit' : 'body';
    onUpdateSlotConfig(selectedOutfit, (prev) => ({
      ...prev,
      [targetKey]: { x: 0, y: 0, scale: 1 },
    }));
  };

  // Quick Jump Handlers to Alignment Tabs
  const handleJumpToFaceAlign = () => {
    if (onNavigateToPartAlign) {
      onNavigateToPartAlign('face', selectedFace);
    }
  };

  const handleJumpToOutfitAlign = () => {
    if (onNavigateToPartAlign) {
      onNavigateToPartAlign(compositionMode === '2part' ? 'outfit' : 'body', selectedOutfit);
    }
  };

  // Auto-align current single face
  const handleAutoAlignCurrentFace = () => {
    if (onAutoAlignSingleSlot) {
      onAutoAlignSingleSlot(selectedFace, 'face');
      setAutoAlignNotification(`✨ 얼굴 #${selectedFace} 코 중심이 자동 정렬되었습니다!`);
      setTimeout(() => setAutoAlignNotification(null), 3000);
    }
  };

  // Keyboard shortcut listener for fine-tuning face position
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when focusing inputs or textareas
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag)) {
        return;
      }
      if (!onUpdateSlotConfig) return;

      const step = e.shiftKey ? 5 : 1;
      let dx = 0;
      let dy = 0;

      if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      else if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else return;

      e.preventDefault();

      if (activeAdjustTarget === 'face') {
        handleNudgeFace(dx, dy);
      } else {
        handleNudgeOutfit(dx, dy);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFace, selectedOutfit, activeAdjustTarget, compositionMode, onUpdateSlotConfig]);

  // Real-time render loop with breathing idle motion & alignment overlay
  useEffect(() => {
    let startTime = Date.now();

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const faceTile = faceTiles[selectedFace - 1] || null;
      const hairTile = actualHairTiles[selectedHair - 1] || null;
      const bodyTile = bodyTiles[selectedTop - 1] || null;
      const legTile = legTiles[selectedBottom - 1] || null;
      const outfitTile = actualOutfitTiles[selectedOutfit - 1] || null;
      const fullbodyTile = fullbodyTiles?.[selectedFullbody - 1] || null;

      const faceConfig = slotConfigs.find((s) => s.id === selectedFace)?.face || { x: 0, y: 0, scale: 1 };
      const hairConfig = slotConfigs.find((s) => s.id === selectedHair)?.hair ||
        slotConfigs.find((s) => s.id === selectedHair)?.head || { x: 0, y: 0, scale: 1 };
      const bodyConfig = slotConfigs.find((s) => s.id === selectedTop)?.body || { x: 0, y: 0, scale: 1 };
      const legConfig = slotConfigs.find((s) => s.id === selectedBottom)?.leg || { x: 0, y: 0, scale: 1 };
      const outfitConfig = slotConfigs.find((s) => s.id === selectedOutfit)?.outfit || { x: 0, y: 0, scale: 1 };
      const fullbodyConfig = slotConfigs.find((s) => s.id === selectedFullbody)?.fullbody || { x: 0, y: 0, scale: 1 };

      // Calculate idle animation offsets (paused during direct dragging)
      let breathY = 0;
      let breathHeadY = 0;
      if (isIdleAnimation && !isDraggingFace) {
        const elapsed = (Date.now() - startTime) / 1000;
        breathY = Math.sin(elapsed * 2.5) * 2;
        breathHeadY = Math.sin(elapsed * 2.5 - 0.3) * 3;
      }

      // Render character
      const charCanvas = renderAssembledCharacter(
        faceTile,
        compositionMode === '2part' ? null : hairTile,
        bodyTile,
        legTile,
        { ...faceConfig, y: faceConfig.y + breathHeadY },
        { ...hairConfig, y: hairConfig.y + breathHeadY },
        { ...bodyConfig, y: bodyConfig.y + breathY },
        legConfig,
        anchorSettings,
        600,
        900,
        processingSettings.layerOrder,
        compositionMode === '2part' ? outfitTile : null,
        compositionMode === '2part' ? { ...outfitConfig, y: outfitConfig.y + breathY } : undefined,
        compositionMode === 'fullbody' ? fullbodyTile : null,
        compositionMode === 'fullbody' ? { ...fullbodyConfig, y: fullbodyConfig.y + breathY } : undefined
      );

      // Draw background
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (bgStyle === 'studio') {
        const grad = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height / 2,
          50,
          canvas.width / 2,
          canvas.height / 2,
          canvas.height / 1.2
        );
        grad.addColorStop(0, '#1e293b');
        grad.addColorStop(1, '#090d16');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(canvas.width / 2, canvas.height * 0.9, 130, 24, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (bgStyle === 'neon') {
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, '#2e1065');
        grad.addColorStop(0.5, '#0f172a');
        grad.addColorStop(1, '#022c22');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(236, 72, 153, 0.2)';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height * 0.4, 200, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(canvas.width / 2, canvas.height * 0.9, 140, 26, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (bgStyle === 'pastel') {
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#fdf4ff');
        grad.addColorStop(1, '#e0f2fe');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.beginPath();
        ctx.ellipse(canvas.width / 2, canvas.height * 0.9, 130, 22, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw assembled character on canvas
      ctx.drawImage(charCanvas, 0, 0, canvas.width, canvas.height);

      // Real-time Visual Guidelines when Dragging or Hovering Face
      if (isDraggingFace || isFaceHovered) {
        ctx.save();
        const faceCx = 300 + faceConfig.x * 1.5;
        const faceCy = 252 + (faceConfig.y + breathHeadY) * 1.5;

        // Subtle neon outline around face area
        ctx.strokeStyle = isDraggingFace ? '#f97316' : 'rgba(249, 115, 22, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(faceCx - 130, faceCy - 130, 260, 260);

        // Center crosshair target
        ctx.strokeStyle = isDraggingFace ? '#00f0ff' : 'rgba(0, 240, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(faceCx - 24, faceCy);
        ctx.lineTo(faceCx + 24, faceCy);
        ctx.moveTo(faceCx, faceCy - 24);
        ctx.lineTo(faceCx, faceCy + 24);
        ctx.stroke();

        // Central nose anchor point
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(faceCx, faceCy, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [
    faceTiles,
    actualHairTiles,
    bodyTiles,
    legTiles,
    actualOutfitTiles,
    fullbodyTiles,
    selectedFace,
    selectedHair,
    selectedTop,
    selectedBottom,
    selectedOutfit,
    selectedFullbody,
    slotConfigs,
    anchorSettings,
    processingSettings,
    isIdleAnimation,
    bgStyle,
    compositionMode,
    isDraggingFace,
    isFaceHovered,
  ]);

  // Canvas Mouse Coordinates Helper
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 300, y: 252 };
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 600;
    const y = ((e.clientY - rect.top) / rect.height) * 900;
    return { x, y };
  };

  const isInsideFaceArea = (canvasX: number, canvasY: number) => {
    const faceCx = 300 + currentFaceConfig.x * 1.5;
    const faceCy = 252 + currentFaceConfig.y * 1.5;
    return Math.abs(canvasX - faceCx) <= 150 && Math.abs(canvasY - faceCy) <= 140;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    if (isInsideFaceArea(coords.x, coords.y)) {
      setIsDraggingFace(true);
      setDragStartPos({
        clientX: e.clientX,
        clientY: e.clientY,
        initialX: currentFaceConfig.x,
        initialY: currentFaceConfig.y,
      });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    setIsFaceHovered(isInsideFaceArea(coords.x, coords.y));

    if (isDraggingFace && onUpdateSlotConfig) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const displayScaleX = rect.width / 600;
      const displayScaleY = rect.height / 900;

      const deltaX = Math.round((e.clientX - dragStartPos.clientX) / (displayScaleX * 1.5));
      const deltaY = Math.round((e.clientY - dragStartPos.clientY) / (displayScaleY * 1.5));

      const newX = Math.max(-150, Math.min(150, dragStartPos.initialX + deltaX));
      const newY = Math.max(-150, Math.min(150, dragStartPos.initialY + deltaY));

      onUpdateSlotConfig(selectedFace, (prev) => ({
        ...prev,
        face: {
          ...prev.face,
          x: newX,
          y: newY,
        },
      }));
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDraggingFace) {
      setIsDraggingFace(false);
    }
  };

  // Download high-resolution PNG
  const handleDownloadSinglePng = () => {
    if (compositionMode === 'fullbody') {
      const fullbodyTile = fullbodyTiles?.[selectedFullbody - 1] || null;
      const fullbodyConfig = slotConfigs.find((s) => s.id === selectedFullbody)?.fullbody || { x: 0, y: 0, scale: 1 };
      const assembled = renderAssembledCharacter(
        null,
        null,
        null,
        null,
        { x: 0, y: 0, scale: 1 },
        { x: 0, y: 0, scale: 1 },
        { x: 0, y: 0, scale: 1 },
        { x: 0, y: 0, scale: 1 },
        anchorSettings,
        600,
        900,
        processingSettings.layerOrder,
        null,
        undefined,
        fullbodyTile,
        fullbodyConfig
      );
      downloadCanvas(assembled, `character_fullbody_${selectedFullbody}.png`);
      return;
    }

    const faceTile = faceTiles[selectedFace - 1] || null;
    const hairTile = actualHairTiles[selectedHair - 1] || null;
    const bodyTile = bodyTiles[selectedTop - 1] || null;
    const legTile = legTiles[selectedBottom - 1] || null;
    const outfitTile = actualOutfitTiles[selectedOutfit - 1] || null;

    const faceConfig = slotConfigs.find((s) => s.id === selectedFace)?.face || { x: 0, y: 0, scale: 1 };
    const hairConfig = slotConfigs.find((s) => s.id === selectedHair)?.hair ||
      slotConfigs.find((s) => s.id === selectedHair)?.head || { x: 0, y: 0, scale: 1 };
    const bodyConfig = slotConfigs.find((s) => s.id === selectedTop)?.body || { x: 0, y: 0, scale: 1 };
    const legConfig = slotConfigs.find((s) => s.id === selectedBottom)?.leg || { x: 0, y: 0, scale: 1 };
    const outfitConfig = slotConfigs.find((s) => s.id === selectedOutfit)?.outfit || { x: 0, y: 0, scale: 1 };

    const assembled = renderAssembledCharacter(
      faceTile,
      compositionMode === '2part' ? null : hairTile,
      bodyTile,
      legTile,
      faceConfig,
      hairConfig,
      bodyConfig,
      legConfig,
      anchorSettings,
      600,
      900,
      processingSettings.layerOrder,
      compositionMode === '2part' ? outfitTile : null,
      compositionMode === '2part' ? outfitConfig : undefined
    );

    const filename =
      compositionMode === '2part'
        ? `character_face${selectedFace}_outfit${selectedOutfit}.png`
        : `character_f${selectedFace}_h${selectedHair}_t${selectedTop}_b${selectedBottom}.png`;

    downloadCanvas(assembled, filename);
  };

  const handleAutoAlignWithFeedback = () => {
    if (onAutoAlignAllParts) {
      onAutoAlignAllParts();
      setAutoAlignNotification(
        compositionMode === '2part'
          ? `✨ ${actualCount}개 얼굴(코 중심)과 상의+하의(목선/허리 기준)가 완벽하게 자동 정렬되었습니다!`
          : `✨ ${actualCount}개 슬롯의 4개 파트가 모두 자동 정렬되었습니다!`
      );
      setTimeout(() => setAutoAlignNotification(null), 3500);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full w-full bg-slate-950 overflow-hidden select-none relative">
      {/* Toast Notification for Auto-alignment */}
      {autoAlignNotification && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-emerald-600/90 border border-emerald-400 text-white text-xs font-bold shadow-2xl backdrop-blur flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-200" />
          <span>{autoAlignNotification}</span>
        </div>
      )}

      {/* LEFT / CENTER: Live Render Stage */}
      <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-5 relative overflow-hidden">
        {/* Floating Top Info Pill & Quick Action Buttons */}
        <div className="absolute top-3 sm:top-4 z-20 flex flex-wrap items-center justify-center gap-2 max-w-full px-2">
          {/* Current Selection Pill */}
          <div className="px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700 backdrop-blur shadow-xl text-xs text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">
              {compositionMode === 'fullbody'
                ? `전신 캐릭터: #${selectedFullbody} (총 ${actualCount}종)`
                : compositionMode === '2part'
                ? `조합: 얼굴 #${selectedFace} + 상의·하의 #${selectedOutfit}`
                : `조합: 얼굴 #${selectedFace} · 헤어 #${selectedHair} · 상의 #${selectedTop} · 하의 #${selectedBottom}`}
            </span>
          </div>

          {/* 🎯 USER REQUEST: Direct Jump to Alignment Tab Button */}
          {onNavigateToPartAlign && (
            <button
              onClick={compositionMode === 'fullbody' ? handleJumpToFullbodyAlign : handleJumpToFaceAlign}
              className="px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-400 text-white border border-orange-400/60 shadow-xl backdrop-blur text-xs font-bold transition flex items-center gap-1.5 active:scale-95 ring-2 ring-orange-500/20"
              title={
                compositionMode === 'fullbody'
                  ? `전신 #${selectedFullbody} 정렬 탭으로 바로 이동하여 바닥선 및 중심 가이드라인과 함께 정밀 편집합니다.`
                  : `얼굴 #${selectedFace} 정렬 탭으로 바로 이동하여 중심 가이드라인과 함께 정밀 편집합니다.`
              }
            >
              <Crosshair className="w-3.5 h-3.5 text-amber-200" />
              <span>
                {compositionMode === 'fullbody'
                  ? `#{selectedFullbody} 전신 정렬로 이동`
                  : `#{selectedFace} 얼굴 정렬로 이동`}
              </span>
              <ExternalLink className="w-3 h-3 text-orange-200" />
            </button>
          )}

          {/* Fullbody to 2part Automatic Split Button */}
          {compositionMode === 'fullbody' && onSplitFullbodyToFaceAndOutfit && (
            <button
              onClick={onSplitFullbodyToFaceAndOutfit}
              className="px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white border border-pink-400/60 shadow-xl backdrop-blur text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
              title="30종 전신 캐릭터를 목선 기준으로 얼굴과 의상으로 자동 분할하여 900가지 조합 모드로 전환합니다."
            >
              <Scissors className="w-3.5 h-3.5 text-pink-200" />
              <span>✂️ 얼굴+의상 자동 분할</span>
            </button>
          )}

          {/* Smart Auto-Alignment One-Click Trigger */}
          <button
            onClick={handleAutoAlignWithFeedback}
            className="px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/50 shadow-xl backdrop-blur text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
            title="코 중심 얼굴과 목선 기준 상의+하의를 픽셀 단위로 분석하여 캐릭터를 완벽하게 자동 결합합니다."
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-200" />
            <span>⚡ 스마트 자동 정렬</span>
          </button>

          {/* 🎯 1번 캐릭터처럼 자동 중앙 정렬 Button */}
          <button
            onClick={() => {
              if (onAutoAlignToFirst) {
                if (compositionMode === 'fullbody') {
                  onAutoAlignToFirst('fullbody');
                } else if (compositionMode === '2part') {
                  onAutoAlignToFirst('face');
                  onAutoAlignToFirst('outfit');
                } else {
                  onAutoAlignToFirst('face');
                  onAutoAlignToFirst('hair');
                  onAutoAlignToFirst('body');
                  onAutoAlignToFirst('leg');
                }
              } else if (onAutoAlignAllParts) {
                onAutoAlignAllParts();
              }
              setAutoAlignNotification(
                `🎯 1번 캐릭터의 중심축과 기준선에 맞춰 전체 ${actualCount}개 캐릭터가 자동 중앙 정렬되었습니다!`
              );
              setTimeout(() => setAutoAlignNotification(null), 3500);
            }}
            className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white border border-amber-300/60 shadow-xl backdrop-blur text-xs font-bold transition flex items-center gap-1.5 active:scale-95 shadow-amber-500/25 ring-2 ring-amber-400/20"
            title="1번 첫 번째 캐릭터의 중심축과 발끝선에 맞춰 전체 캐릭터를 똑같이 자동 중앙/바닥 정렬합니다."
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-100" />
            <span>🎯 1번 캐릭터처럼 자동 중앙 정렬</span>
          </button>

          {/* Randomizer */}
          <button
            onClick={handleRandomize}
            className="px-3 py-1.5 rounded-full bg-indigo-600/80 hover:bg-indigo-600 border border-indigo-400/50 shadow-xl backdrop-blur text-xs font-semibold text-white transition flex items-center gap-1.5 active:scale-95"
            title="랜덤 캐릭터 조합 생성"
          >
            <Dice5 className="w-3.5 h-3.5" />
            <span>랜덤</span>
          </button>

          {/* Download Single PNG */}
          <button
            onClick={handleDownloadSinglePng}
            className="px-3 py-1.5 rounded-full bg-pink-600/80 hover:bg-pink-600 border border-pink-400/50 shadow-xl backdrop-blur text-xs font-semibold text-white transition flex items-center gap-1.5 active:scale-95"
            title="현재 조합된 캐릭터 고화질 PNG 다운로드"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PNG 저장</span>
          </button>

          {/* Quick Calibration / 2-overlap Fix Button */}
          {onOpenGridSliceModal && (
            <button
              onClick={() => onOpenGridSliceModal()}
              className="px-3 py-1.5 rounded-full bg-cyan-600/80 hover:bg-cyan-600 border border-cyan-400/50 shadow-xl backdrop-blur text-xs font-semibold text-white transition flex items-center gap-1.5 active:scale-95"
              title="원본 시트의 여백/간격을 자동 감지하거나, 2개가 겹쳐 잘린 박스를 상하로 분할합니다."
            >
              <Scissors className="w-3.5 h-3.5 text-cyan-200" />
              <span>간격/겹침 보정</span>
            </button>
          )}
        </div>

        {/* Main Canvas Container with Interactive Face Dragging */}
        <div className="relative w-full max-w-[420px] aspect-[2/3] rounded-3xl overflow-hidden shadow-2xl border border-slate-800 group my-auto">
          {/* Real-time Hover / Drag Information Badge */}
          {(isFaceHovered || isDraggingFace) && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-900/90 border border-orange-500/60 shadow-xl backdrop-blur text-[11px] text-white flex items-center gap-2 pointer-events-none z-10 animate-fade-in">
              <span className={`w-2 h-2 rounded-full ${isDraggingFace ? 'bg-orange-400 animate-ping' : 'bg-orange-400'}`} />
              <span className="font-semibold text-orange-300">
                {isDraggingFace ? `얼굴 #${selectedFace} 실시간 이동 중` : `얼굴 #${selectedFace} 드래그 이동 가능`}
              </span>
              <span className="font-mono text-slate-300">
                X: {currentFaceConfig.x > 0 ? `+${currentFaceConfig.x}` : currentFaceConfig.x}px, Y:{' '}
                {currentFaceConfig.y > 0 ? `+${currentFaceConfig.y}` : currentFaceConfig.y}px
              </span>
            </div>
          )}

          {/* Canvas */}
          <canvas
            ref={canvasRef}
            width={600}
            height={900}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            className={`w-full h-full object-contain block select-none ${
              isDraggingFace ? 'cursor-grabbing' : isFaceHovered ? 'cursor-grab' : 'cursor-default'
            }`}
          />
        </div>

        {/* Bottom Stage Controls */}
        <div className="absolute bottom-3 sm:bottom-4 z-20 flex flex-wrap items-center justify-center gap-2 max-w-full px-2">
          {/* ⚡ DIRECT FEATURE: Face Move Controls Toggle Button */}
          <button
            onClick={() => setShowPositionControls(!showPositionControls)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur shadow-xl transition flex items-center gap-1.5 ${
              showPositionControls
                ? 'bg-orange-600 text-white border-orange-400 shadow-orange-500/20'
                : 'bg-slate-900/90 text-orange-300 border-slate-700 hover:text-white'
            }`}
            title="얼굴 위치 실시간 조절 컨트롤러 열기 / 닫기"
          >
            <Move className="w-3.5 h-3.5" />
            <span>얼굴 실시간 위치 조절</span>
          </button>

          {/* Idle animation toggle */}
          <button
            onClick={() => setIsIdleAnimation(!isIdleAnimation)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur shadow-xl transition flex items-center gap-1.5 ${
              isIdleAnimation
                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                : 'bg-slate-900/90 text-slate-400 border-slate-700'
            }`}
          >
            {isIdleAnimation ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isIdleAnimation ? '숨쉬기 ON' : '정지'}</span>
          </button>

          {/* Background selector */}
          <div className="flex items-center bg-slate-900/90 border border-slate-700 rounded-xl p-0.5 shadow-xl text-xs">
            {(['studio', 'neon', 'pastel', 'transparent'] as const).map((bg) => (
              <button
                key={bg}
                onClick={() => setBgStyle(bg)}
                className={`px-2 py-1 rounded-lg capitalize transition ${
                  bgStyle === bg
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {bg === 'studio' ? '다크' : bg === 'neon' ? '네온' : bg === 'pastel' ? '화이트' : '투명'}
              </button>
            ))}
          </div>

          {/* Joint fine-tuner toggle */}
          <button
            onClick={() => setShowJointControls(!showJointControls)}
            className={`p-2 rounded-xl border text-xs backdrop-blur shadow-xl transition ${
              showJointControls
                ? 'bg-purple-600/30 text-purple-300 border-purple-500/50'
                : 'bg-slate-900/90 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="목/허리 결합 간격 미세 조절"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>

        {/* 🌟 DIRECT REAL-TIME FACE POSITION CONTROLLER DRAWER 🌟 */}
        {showPositionControls && (
          <div className="absolute bottom-16 left-3 sm:left-6 z-30 w-80 sm:w-88 p-3.5 rounded-2xl bg-slate-900/95 border border-orange-500/40 backdrop-blur-xl shadow-2xl flex flex-col gap-2.5 text-xs text-white animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <Move className="w-4 h-4 text-orange-400" />
                <span className="font-bold text-slate-100">
                  {activeAdjustTarget === 'fullbody'
                    ? `전신 #${selectedFullbody} 실시간 위치 이동`
                    : activeAdjustTarget === 'face'
                    ? `얼굴 #${selectedFace} 실시간 위치 이동`
                    : `의상 #${selectedOutfit} 실시간 위치 이동`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {/* Target switch */}
                <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                  {compositionMode === 'fullbody' ? (
                    <button
                      onClick={() => setActiveAdjustTarget('fullbody')}
                      className={`px-2 py-0.5 rounded font-semibold transition ${
                        activeAdjustTarget === 'fullbody' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🧍 전신
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setActiveAdjustTarget('face')}
                        className={`px-2 py-0.5 rounded font-semibold transition ${
                          activeAdjustTarget === 'face' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        😊 얼굴
                      </button>
                      <button
                        onClick={() => setActiveAdjustTarget('outfit')}
                        className={`px-2 py-0.5 rounded font-semibold transition ${
                          activeAdjustTarget === 'outfit' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        👗 의상
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setShowPositionControls(false)}
                  className="text-slate-400 hover:text-white text-xs px-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Current Offset Info & Step Selector */}
            <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <div className="font-mono text-[11px] text-slate-300 flex items-center gap-2">
                <span>
                  X: <strong className="text-orange-400 font-bold">{activeAdjustTarget === 'fullbody' ? currentFullbodyConfig.x : activeAdjustTarget === 'face' ? currentFaceConfig.x : currentOutfitConfig.x}px</strong>
                </span>
                <span>
                  Y: <strong className="text-orange-400 font-bold">{activeAdjustTarget === 'fullbody' ? currentFullbodyConfig.y : activeAdjustTarget === 'face' ? currentFaceConfig.y : currentOutfitConfig.y}px</strong>
                </span>
                <span>
                  크기: <strong className="text-orange-400 font-bold">{Math.round((activeAdjustTarget === 'fullbody' ? currentFullbodyConfig.scale : activeAdjustTarget === 'face' ? currentFaceConfig.scale : currentOutfitConfig.scale) * 100)}%</strong>
                </span>
              </div>

              {/* Step buttons */}
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-slate-400">단위:</span>
                {[1, 2, 5, 10].map((s) => (
                  <button
                    key={s}
                    onClick={() => setNudgeStep(s)}
                    className={`px-1.5 py-0.5 rounded font-mono font-bold transition ${
                      nudgeStep === s
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {s}px
                  </button>
                ))}
              </div>
            </div>

            {/* D-Pad & Sliders Grid */}
            <div className="grid grid-cols-12 gap-2.5 items-center">
              {/* D-Pad 4-way Nudge Controls */}
              <div className="col-span-5 flex flex-col items-center justify-center p-2 bg-slate-950/80 rounded-xl border border-slate-800">
                <button
                  onClick={() => (
                    activeAdjustTarget === 'fullbody'
                      ? handleNudgeFullbody(0, -nudgeStep)
                      : activeAdjustTarget === 'face'
                      ? handleNudgeFace(0, -nudgeStep)
                      : handleNudgeOutfit(0, -nudgeStep)
                  )}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-orange-600 text-slate-200 hover:text-white transition shadow active:scale-90"
                  title="위로 이동"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3 my-0.5">
                  <button
                    onClick={() => (
                      activeAdjustTarget === 'fullbody'
                        ? handleNudgeFullbody(-nudgeStep, 0)
                        : activeAdjustTarget === 'face'
                        ? handleNudgeFace(-nudgeStep, 0)
                        : handleNudgeOutfit(-nudgeStep, 0)
                    )}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-orange-600 text-slate-200 hover:text-white transition shadow active:scale-90"
                    title="왼쪽으로 이동"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => (
                      activeAdjustTarget === 'fullbody'
                        ? handleResetFullbody()
                        : activeAdjustTarget === 'face'
                        ? handleResetFace()
                        : handleResetOutfit()
                    )}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-mono transition"
                    title="중앙 (0,0)으로 리셋"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => (
                      activeAdjustTarget === 'fullbody'
                        ? handleNudgeFullbody(nudgeStep, 0)
                        : activeAdjustTarget === 'face'
                        ? handleNudgeFace(nudgeStep, 0)
                        : handleNudgeOutfit(nudgeStep, 0)
                    )}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-orange-600 text-slate-200 hover:text-white transition shadow active:scale-90"
                    title="오른쪽으로 이동"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => (
                    activeAdjustTarget === 'fullbody'
                      ? handleNudgeFullbody(0, nudgeStep)
                      : activeAdjustTarget === 'face'
                      ? handleNudgeFace(0, nudgeStep)
                      : handleNudgeOutfit(0, nudgeStep)
                  )}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-orange-600 text-slate-200 hover:text-white transition shadow active:scale-90"
                  title="아래로 이동"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>

              {/* Sliders & Direct Inputs */}
              <div className="col-span-7 flex flex-col gap-1.5">
                {/* X slider */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>좌우 X 오프셋</span>
                    <span className="font-mono text-orange-400">
                      {activeAdjustTarget === 'fullbody' ? currentFullbodyConfig.x : activeAdjustTarget === 'face' ? currentFaceConfig.x : currentOutfitConfig.x}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-80}
                    max={80}
                    value={activeAdjustTarget === 'fullbody' ? currentFullbodyConfig.x : activeAdjustTarget === 'face' ? currentFaceConfig.x : currentOutfitConfig.x}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (activeAdjustTarget === 'fullbody') {
                        onUpdateSlotConfig && onUpdateSlotConfig(selectedFullbody, (p) => ({ ...p, fullbody: { ...p.fullbody, x: val } }));
                      } else if (activeAdjustTarget === 'face') {
                        onUpdateSlotConfig && onUpdateSlotConfig(selectedFace, (p) => ({ ...p, face: { ...p.face, x: val } }));
                      } else {
                        const targetKey = compositionMode === '2part' ? 'outfit' : 'body';
                        onUpdateSlotConfig && onUpdateSlotConfig(selectedOutfit, (p) => ({ ...p, [targetKey]: { ...p[targetKey], x: val } }));
                      }
                    }}
                    className="w-full accent-orange-500 cursor-pointer h-1.5"
                  />
                </div>

                {/* Y slider */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>상하 Y 오프셋</span>
                    <span className="font-mono text-orange-400">
                      {activeAdjustTarget === 'fullbody' ? currentFullbodyConfig.y : activeAdjustTarget === 'face' ? currentFaceConfig.y : currentOutfitConfig.y}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-80}
                    max={80}
                    value={activeAdjustTarget === 'fullbody' ? currentFullbodyConfig.y : activeAdjustTarget === 'face' ? currentFaceConfig.y : currentOutfitConfig.y}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (activeAdjustTarget === 'fullbody') {
                        onUpdateSlotConfig && onUpdateSlotConfig(selectedFullbody, (p) => ({ ...p, fullbody: { ...p.fullbody, y: val } }));
                      } else if (activeAdjustTarget === 'face') {
                        onUpdateSlotConfig && onUpdateSlotConfig(selectedFace, (p) => ({ ...p, face: { ...p.face, y: val } }));
                      } else {
                        const targetKey = compositionMode === '2part' ? 'outfit' : 'body';
                        onUpdateSlotConfig && onUpdateSlotConfig(selectedOutfit, (p) => ({ ...p, [targetKey]: { ...p[targetKey], y: val } }));
                      }
                    }}
                    className="w-full accent-orange-500 cursor-pointer h-1.5"
                  />
                </div>

                {/* Scale slider */}
                {(activeAdjustTarget === 'face' || activeAdjustTarget === 'fullbody') && (
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-300">
                      <span>{activeAdjustTarget === 'fullbody' ? '전신 크기 비율' : '얼굴 크기 비율'}</span>
                      <span className="font-mono text-orange-400">
                        {Math.round((activeAdjustTarget === 'fullbody' ? currentFullbodyConfig.scale : currentFaceConfig.scale) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.7}
                      max={1.4}
                      step={0.01}
                      value={activeAdjustTarget === 'fullbody' ? currentFullbodyConfig.scale : currentFaceConfig.scale}
                      onChange={(e) =>
                        activeAdjustTarget === 'fullbody'
                          ? handleSetFullbodyScale(Number(e.target.value))
                          : handleSetFaceScale(Number(e.target.value))
                      }
                      className="w-full accent-orange-500 cursor-pointer h-1.5"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Quick Action Buttons & Navigation to Alignment Tab */}
            <div className="flex items-center gap-1.5 pt-1">
              {activeAdjustTarget === 'face' && onAutoAlignSingleSlot && (
                <button
                  onClick={handleAutoAlignCurrentFace}
                  className="flex-1 py-1.5 px-2 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg font-bold text-[11px] shadow transition flex items-center justify-center gap-1 active:scale-95"
                  title="현재 얼굴의 코 중심을 자동 감지하여 중앙에 정렬합니다."
                >
                  <Sparkles className="w-3 h-3 text-amber-200" />
                  <span>코 중심 자동정렬</span>
                </button>
              )}

              <button
                onClick={() => (
                  activeAdjustTarget === 'fullbody'
                    ? handleResetFullbody()
                    : activeAdjustTarget === 'face'
                    ? handleResetFace()
                    : handleResetOutfit()
                )}
                className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] border border-slate-700 transition"
                title="위치와 크기를 초기화합니다"
              >
                리셋
              </button>

              {/* 🎯 Jump to Alignment Tab */}
              {onNavigateToPartAlign && (
                <button
                  onClick={
                    activeAdjustTarget === 'fullbody'
                      ? handleJumpToFullbodyAlign
                      : activeAdjustTarget === 'face'
                      ? handleJumpToFaceAlign
                      : handleJumpToOutfitAlign
                  }
                  className="py-1.5 px-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-lg font-bold text-[11px] shadow transition flex items-center justify-center gap-1 active:scale-95 border border-orange-400/40"
                  title="정렬 탭으로 이동하여 전체 시트 가이드라인 및 기준선과 함께 정밀 편집합니다."
                >
                  <Crosshair className="w-3 h-3 text-amber-200" />
                  <span>
                    {activeAdjustTarget === 'fullbody'
                      ? '전신 정렬 탭 열기'
                      : activeAdjustTarget === 'face'
                      ? '얼굴 정렬 탭 열기'
                      : '의상 정렬 탭 열기'}
                  </span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Keyboard shortcut hint */}
            <p className="text-[10px] text-slate-400 bg-slate-950/40 px-2 py-1 rounded border border-slate-800/80">
              💡 캔버스에서 마우스 드래그 또는 <strong className="text-orange-300">키보드 방향키(↑↓←→)</strong>로 1px씩 미세이동 (Shift+방향키 5px)
            </p>
          </div>
        )}

        {/* Floating Joint Fine-Tuning Drawer */}
        {showJointControls && (
          <div className="absolute bottom-16 right-3 sm:right-6 z-30 w-80 p-4 rounded-2xl bg-slate-900/95 border border-slate-700 backdrop-blur shadow-2xl flex flex-col gap-3 animate-fade-in text-xs text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                목 / 의상 결합 높이 미세 조절
              </span>
              <button
                onClick={() => setShowJointControls(false)}
                className="text-slate-400 hover:text-white"
              >
                닫기
              </button>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>목-의상 결합 간격 (Neck Joint Gap)</span>
                <span className="font-mono text-purple-400">{anchorSettings.neckJointGap}px</span>
              </div>
              <input
                type="range"
                min={-50}
                max={50}
                value={anchorSettings.neckJointGap}
                onChange={(e) =>
                  onUpdateAnchorSettings({ neckJointGap: Number(e.target.value) })
                }
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            {compositionMode !== '2part' && (
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>허리 결합 간격 (Waist Joint Gap)</span>
                  <span className="font-mono text-purple-400">{anchorSettings.waistJointGap}px</span>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  value={anchorSettings.waistJointGap}
                  onChange={(e) =>
                    onUpdateAnchorSettings({ waistJointGap: Number(e.target.value) })
                  }
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>
            )}

            <button
              onClick={() => onUpdateAnchorSettings({ neckJointGap: 0, waistJointGap: 0 })}
              className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-center"
            >
              간격 0으로 리셋
            </button>
          </div>
        )}
      </div>

      {/* RIGHT SIDE: Game Character Selection Tabs */}
      <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/70 flex flex-col h-[480px] lg:h-full overflow-hidden">
        {/* Header */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              {compositionMode === 'fullbody'
                ? `전신 캐릭터 선택창 (${actualCount}종)`
                : compositionMode === '2part'
                ? `캐릭터 선택창 (얼굴 ${actualCount}종 + 상의/하의 ${actualCount}종)`
                : `캐릭터 선택창 슬롯 (4파트)`}
            </h2>
            <p className="text-[11px] text-slate-400">
              {compositionMode === 'fullbody'
                ? `얼굴과 몸이 일체형인 30종 전신 캐릭터를 선택하거나, 2파트(얼굴+의상)로 분할하여 조합하세요`
                : compositionMode === '2part'
                ? `얼굴과 상의+하의(의상)를 선택해 나만의 캐릭터를 조합하세요 (총 ${actualCount * actualCount}가지 조합)`
                : `얼굴(표정) → 헤어 → 상의 → 하의를 선택해 나만의 캐릭터를 완성하세요`}
            </p>
          </div>
        </div>

        {/* Scrollable selectors */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {/* Quick 1~N Preset Buttons */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>원클릭 1~{actualCount}번 풀세트</span>
              <span className="text-[10px] text-indigo-400">
                {compositionMode === 'fullbody'
                  ? '전신 캐릭터 선택'
                  : compositionMode === '2part'
                  ? '얼굴+의상 매칭'
                  : '4개 파트 동시 적용'}
              </span>
            </div>
            <div className={`grid ${actualCount > 15 ? 'grid-cols-6' : 'grid-cols-5'} gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-0.5`}>
              {Array.from({ length: actualCount }, (_, i) => i + 1).map((id) => {
                const isMatched =
                  compositionMode === 'fullbody'
                    ? selectedFullbody === id
                    : compositionMode === '2part'
                    ? selectedFace === id && selectedOutfit === id
                    : selectedFace === id && selectedHair === id && selectedTop === id && selectedBottom === id;
                return (
                  <button
                    key={id}
                    onClick={() => handleApplyPresetSet(id)}
                    className={`py-1.5 text-xs font-semibold rounded border transition ${
                      isMatched
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    #{id}
                  </button>
                );
              })}
            </div>
          </div>

          {compositionMode === 'fullbody' ? (
            <div className="space-y-4">
              {/* One-click Split into Face + Outfit Banner */}
              {onSplitFullbodyToFaceAndOutfit && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-pink-950/80 via-purple-950/70 to-slate-900 border border-pink-500/40 shadow-xl flex flex-col gap-2.5 animate-fade-in">
                  <div className="flex items-center gap-2 text-pink-300 font-bold text-xs">
                    <Scissors className="w-4 h-4 text-pink-400" />
                    <span>✨ 2파트 조합 모드로 변환</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    얼굴과 몸이 일체형인 30종 전신 캐릭터를 <strong>얼굴 30종 + 의상(상의+하의) 30종</strong>으로 지능형 자동 분할하여 자유롭게 교차 조립(총 900가지 조합)할 수 있습니다!
                  </p>
                  <button
                    onClick={onSplitFullbodyToFaceAndOutfit}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 active:scale-98"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                    <span>얼굴 30종 + 의상 30종 자동 분할 실행</span>
                  </button>
                </div>
              )}

              {/* Fullbody Character Selector */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    🧍 전신 캐릭터 ({actualCount}종)
                  </span>
                  <div className="flex items-center gap-1.5">
                    {onNavigateToPartAlign && (
                      <button
                        type="button"
                        onClick={handleJumpToFullbodyAlign}
                        className="text-[10px] font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-400/50 px-2 py-0.5 rounded transition flex items-center gap-1 shadow-sm active:scale-95"
                        title={`전신 #${selectedFullbody} 정렬 탭으로 바로 이동하여 바닥선/머리선 가이드라인과 함께 편집합니다.`}
                      >
                        <Crosshair className="w-3 h-3 text-purple-200" />
                        <span>#{selectedFullbody} 전신 정렬 이동</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    )}
                    {onOpenGridSliceModal && (
                      <button
                        type="button"
                        onClick={() => onOpenGridSliceModal('fullbody')}
                        className="text-[10px] text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 px-2 py-0.5 rounded transition flex items-center gap-1"
                        title="전신 시트의 분할 간격을 자동 계산하거나 2개 겹친 박스를 상하로 자릅니다."
                      >
                        <Scissors className="w-3 h-3 text-cyan-400" />
                        <span>간격/겹침</span>
                      </button>
                    )}
                    <span className="text-[11px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30">
                      선택 #{selectedFullbody}
                    </span>
                  </div>
                </div>

                {/* Thumbnails grid */}
                <div className={`grid ${actualCount > 15 ? 'grid-cols-6' : 'grid-cols-5'} gap-1.5 max-h-72 overflow-y-auto custom-scrollbar p-0.5`}>
                  {Array.from({ length: actualCount }, (_, i) => i + 1).map((id) => {
                    const isSelected = selectedFullbody === id;
                    const tile = fullbodyTiles?.[id - 1];
                    return (
                      <button
                        key={id}
                        onClick={() => setSelectedFullbody(id)}
                        className={`group relative rounded-lg border p-1 aspect-square flex flex-col items-center justify-center transition-all ${
                          isSelected
                            ? 'border-purple-500 bg-purple-500/25 shadow-lg shadow-purple-500/30 ring-2 ring-purple-500/50'
                            : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                        }`}
                      >
                        {tile ? (
                          <img
                            src={getThumbnailDataUrl(tile)}
                            alt={`전신 캐릭터 #${id}`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-xs text-slate-500">#{id}</span>
                        )}
                        <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-slate-400 group-hover:text-white">
                          #{id}
                        </span>
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-purple-500 flex items-center justify-center">
                            <Check className="w-2 h-2 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Mini Fullbody Position Adjuster Bar */}
                <div className="p-2 rounded-lg bg-slate-900/90 border border-purple-500/30 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 font-mono text-slate-300">
                    <span className="text-purple-400 font-bold">#{selectedFullbody} 위치:</span>
                    <span>X: {currentFullbodyConfig.x}px</span>
                    <span>Y: {currentFullbodyConfig.y}px</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleNudgeFullbody(-2, 0)}
                      className="w-5 h-5 bg-slate-800 hover:bg-purple-600 rounded text-slate-300 hover:text-white flex items-center justify-center transition"
                      title="왼쪽 2px"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => handleNudgeFullbody(2, 0)}
                      className="w-5 h-5 bg-slate-800 hover:bg-purple-600 rounded text-slate-300 hover:text-white flex items-center justify-center transition"
                      title="오른쪽 2px"
                    >
                      →
                    </button>
                    <button
                      onClick={() => handleNudgeFullbody(0, -2)}
                      className="w-5 h-5 bg-slate-800 hover:bg-purple-600 rounded text-slate-300 hover:text-white flex items-center justify-center transition"
                      title="위로 2px"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleNudgeFullbody(0, 2)}
                      className="w-5 h-5 bg-slate-800 hover:bg-purple-600 rounded text-slate-300 hover:text-white flex items-center justify-center transition"
                      title="아래로 2px"
                    >
                      ↓
                    </button>
                    <button
                      onClick={handleResetFullbody}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-[10px] transition"
                      title="리셋"
                    >
                      리셋
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* 1. Face Selector (얼굴 / 표정) */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-orange-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-orange-300 flex items-center gap-1.5">
                😊 1. 얼굴 / 표정 ({actualCount}종)
              </span>
              <div className="flex items-center gap-1.5">
                {/* 🎯 Direct Jump Button to Face Alignment Tab */}
                {onNavigateToPartAlign && (
                  <button
                    type="button"
                    onClick={handleJumpToFaceAlign}
                    className="text-[10px] font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 border border-orange-400/50 px-2 py-0.5 rounded transition flex items-center gap-1 shadow-sm active:scale-95"
                    title={`얼굴 #${selectedFace} 정렬 탭으로 바로 이동하여 정밀 가이드라인과 함께 편집합니다.`}
                  >
                    <Crosshair className="w-3 h-3 text-amber-200" />
                    <span>#{selectedFace} 얼굴 정렬 이동</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                )}
                {onOpenGridSliceModal && (
                  <button
                    type="button"
                    onClick={() => onOpenGridSliceModal('face')}
                    className="text-[10px] text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 px-2 py-0.5 rounded transition flex items-center gap-1"
                    title="얼굴 시트의 분할 간격을 자동 계산하거나 2개 겹친 박스를 상하로 자릅니다."
                  >
                    <Scissors className="w-3 h-3 text-cyan-400" />
                    <span>간격/겹침</span>
                  </button>
                )}
                <span className="text-[11px] font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/30">
                  선택 #{selectedFace}
                </span>
              </div>
            </div>

            {/* Thumbnail Grid */}
            <div className={`grid ${actualCount > 15 ? 'grid-cols-6' : 'grid-cols-5'} gap-1.5 max-h-56 overflow-y-auto custom-scrollbar p-0.5`}>
              {Array.from({ length: actualCount }, (_, i) => i + 1).map((id) => {
                const isSelected = selectedFace === id;
                const tile = faceTiles[id - 1];
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedFace(id)}
                    className={`group relative rounded-lg border p-1 aspect-square flex flex-col items-center justify-center transition-all ${
                      isSelected
                        ? 'border-orange-500 bg-orange-500/20 shadow-lg shadow-orange-500/25 ring-2 ring-orange-500/40'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    {tile ? (
                      <img
                        src={getThumbnailDataUrl(tile)}
                        alt={`얼굴 #${id}`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-slate-500">#{id}</span>
                    )}
                    <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-slate-400 group-hover:text-white">
                      #{id}
                    </span>
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-orange-500 flex items-center justify-center">
                        <Check className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Mini Face Position Adjuster Bar for Selected Face */}
            <div className="p-2 rounded-lg bg-slate-900/90 border border-orange-500/30 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 font-mono text-slate-300">
                <span className="text-orange-400 font-bold">#{selectedFace} 위치:</span>
                <span>X: {currentFaceConfig.x}px</span>
                <span>Y: {currentFaceConfig.y}px</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleNudgeFace(-2, 0)}
                  className="w-5 h-5 bg-slate-800 hover:bg-orange-600 rounded text-slate-300 hover:text-white flex items-center justify-center transition"
                  title="왼쪽 2px"
                >
                  ←
                </button>
                <button
                  onClick={() => handleNudgeFace(2, 0)}
                  className="w-5 h-5 bg-slate-800 hover:bg-orange-600 rounded text-slate-300 hover:text-white flex items-center justify-center transition"
                  title="오른쪽 2px"
                >
                  →
                </button>
                <button
                  onClick={() => handleNudgeFace(0, -2)}
                  className="w-5 h-5 bg-slate-800 hover:bg-orange-600 rounded text-slate-300 hover:text-white flex items-center justify-center transition"
                  title="위로 2px"
                >
                  ↑
                </button>
                <button
                  onClick={() => handleNudgeFace(0, 2)}
                  className="w-5 h-5 bg-slate-800 hover:bg-orange-600 rounded text-slate-300 hover:text-white flex items-center justify-center transition"
                  title="아래로 2px"
                >
                  ↓
                </button>
                <button
                  onClick={handleResetFace}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-[10px] transition"
                  title="리셋"
                >
                  리셋
                </button>
              </div>
            </div>
          </div>

          {/* 2-Part Mode: Outfit Selector (상의+하의 일체형 의상 30종) */}
          {compositionMode === '2part' ? (
            <div className="p-3 rounded-xl bg-slate-950/60 border border-pink-500/25 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                  👗 2. 상의+하의 / 의상 ({actualCount}종)
                </span>
                <div className="flex items-center gap-1.5">
                  {onNavigateToPartAlign && (
                    <button
                      type="button"
                      onClick={handleJumpToOutfitAlign}
                      className="text-[10px] font-bold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 border border-pink-400/50 px-2 py-0.5 rounded transition flex items-center gap-1 shadow-sm active:scale-95"
                      title={`의상 #${selectedOutfit} 정렬 탭으로 바로 이동하여 정밀 가이드라인과 함께 편집합니다.`}
                    >
                      <Crosshair className="w-3 h-3 text-pink-200" />
                      <span>#{selectedOutfit} 의상 정렬 이동</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  )}
                  {onOpenGridSliceModal && (
                    <button
                      type="button"
                      onClick={() => onOpenGridSliceModal('outfit')}
                      className="text-[10px] text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 px-2 py-0.5 rounded transition flex items-center gap-1"
                      title="의상 시트의 분할 간격을 자동 계산하거나 2개 겹친 박스를 상하로 자릅니다."
                    >
                      <Scissors className="w-3 h-3 text-cyan-400" />
                      <span>간격/겹침</span>
                    </button>
                  )}
                  <span className="text-[11px] font-mono text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/30">
                    선택 #{selectedOutfit}
                  </span>
                </div>
              </div>

              <div className={`grid ${actualCount > 15 ? 'grid-cols-6' : 'grid-cols-5'} gap-1.5 max-h-64 overflow-y-auto custom-scrollbar p-0.5`}>
                {Array.from({ length: actualCount }, (_, i) => i + 1).map((id) => {
                  const isSelected = selectedOutfit === id;
                  const tile = actualOutfitTiles[id - 1];
                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedOutfit(id)}
                      className={`group relative rounded-lg border p-1 aspect-square flex flex-col items-center justify-center transition-all ${
                        isSelected
                          ? 'border-pink-500 bg-pink-500/20 shadow-lg shadow-pink-500/25 ring-2 ring-pink-500/40'
                          : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                      }`}
                    >
                      {tile ? (
                        <img
                          src={getThumbnailDataUrl(tile)}
                          alt={`의상 #${id}`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-slate-500">#{id}</span>
                      )}
                      <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-slate-400 group-hover:text-white">
                        #{id}
                      </span>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-pink-500 flex items-center justify-center">
                          <Check className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Mini Outfit Position Adjuster */}
              <div className="p-2 rounded-lg bg-slate-900/90 border border-pink-500/30 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 font-mono text-slate-300">
                  <span className="text-pink-400 font-bold">#{selectedOutfit} 위치:</span>
                  <span>X: {currentOutfitConfig.x}px</span>
                  <span>Y: {currentOutfitConfig.y}px</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleNudgeOutfit(-2, 0)}
                    className="w-5 h-5 bg-slate-800 hover:bg-pink-600 rounded text-slate-300 hover:text-white flex items-center justify-center transition"
                    title="왼쪽 2px"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => handleNudgeOutfit(2, 0)}
                    className="w-5 h-5 bg-slate-800 hover:bg-pink-600 rounded text-slate-300 hover:text-white flex items-center justify-center transition"
                    title="오른쪽 2px"
                  >
                    →
                  </button>
                  <button
                    onClick={() => handleNudgeOutfit(0, -2)}
                    className="w-5 h-5 bg-slate-800 hover:bg-pink-600 rounded text-slate-300 hover:text-white flex items-center justify-center transition"
                    title="위로 2px"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleNudgeOutfit(0, 2)}
                    className="w-5 h-5 bg-slate-800 hover:bg-pink-600 rounded text-slate-300 hover:text-white flex items-center justify-center transition"
                    title="아래로 2px"
                  >
                    ↓
                  </button>
                  <button
                    onClick={handleResetOutfit}
                    className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-[10px] transition"
                    title="리셋"
                  >
                    리셋
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* 4-Part Mode: Hair, Top, Bottom */
            <>
              {/* Hair Selector */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-purple-500/25">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    💇 2. 헤어 스타일 ({actualCount}종)
                  </span>
                  <div className="flex items-center gap-1.5">
                    {onNavigateToPartAlign && (
                      <button
                        type="button"
                        onClick={() => onNavigateToPartAlign('hair', selectedHair)}
                        className="text-[10px] text-purple-300 hover:text-white bg-purple-950/60 border border-purple-500/40 px-2 py-0.5 rounded transition flex items-center gap-1"
                      >
                        <Crosshair className="w-3 h-3" />
                        <span>#{selectedHair} 정렬</span>
                      </button>
                    )}
                    <span className="text-[11px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30">
                      선택 #{selectedHair}
                    </span>
                  </div>
                </div>

                <div className={`grid ${actualCount > 15 ? 'grid-cols-6' : 'grid-cols-5'} gap-1.5 max-h-56 overflow-y-auto custom-scrollbar p-0.5`}>
                  {Array.from({ length: actualCount }, (_, i) => i + 1).map((id) => {
                    const isSelected = selectedHair === id;
                    const tile = actualHairTiles[id - 1];
                    return (
                      <button
                        key={id}
                        onClick={() => setSelectedHair(id)}
                        className={`group relative rounded-lg border p-1 aspect-square flex flex-col items-center justify-center transition-all ${
                          isSelected
                            ? 'border-purple-500 bg-purple-500/20 shadow-lg ring-2 ring-purple-500/40'
                            : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                        }`}
                      >
                        {tile ? (
                          <img
                            src={getThumbnailDataUrl(tile)}
                            alt={`헤어 #${id}`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-xs text-slate-500">#{id}</span>
                        )}
                        <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-slate-400 group-hover:text-white">
                          #{id}
                        </span>
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-purple-500 flex items-center justify-center">
                            <Check className="w-2 h-2 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Top Selector */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-sky-500/25">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                    👕 3. 상의 / 의상 ({actualCount}종)
                  </span>
                  <div className="flex items-center gap-1.5">
                    {onNavigateToPartAlign && (
                      <button
                        type="button"
                        onClick={() => onNavigateToPartAlign('body', selectedTop)}
                        className="text-[10px] text-sky-300 hover:text-white bg-sky-950/60 border border-sky-500/40 px-2 py-0.5 rounded transition flex items-center gap-1"
                      >
                        <Crosshair className="w-3 h-3" />
                        <span>#{selectedTop} 정렬</span>
                      </button>
                    )}
                    <span className="text-[11px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">
                      선택 #{selectedTop}
                    </span>
                  </div>
                </div>

                <div className={`grid ${actualCount > 15 ? 'grid-cols-6' : 'grid-cols-5'} gap-1.5 max-h-56 overflow-y-auto custom-scrollbar p-0.5`}>
                  {Array.from({ length: actualCount }, (_, i) => i + 1).map((id) => {
                    const isSelected = selectedTop === id;
                    const tile = bodyTiles[id - 1];
                    return (
                      <button
                        key={id}
                        onClick={() => setSelectedTop(id)}
                        className={`group relative rounded-lg border p-1 aspect-square flex flex-col items-center justify-center transition-all ${
                          isSelected
                            ? 'border-sky-500 bg-sky-500/20 shadow-lg ring-2 ring-sky-500/40'
                            : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                        }`}
                      >
                        {tile ? (
                          <img
                            src={getThumbnailDataUrl(tile)}
                            alt={`상의 #${id}`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-xs text-slate-500">#{id}</span>
                        )}
                        <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-slate-400 group-hover:text-white">
                          #{id}
                        </span>
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-sky-500 flex items-center justify-center">
                            <Check className="w-2 h-2 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Selector */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-amber-500/25">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    👖 4. 하의 / 신발 ({actualCount}종)
                  </span>
                  <div className="flex items-center gap-1.5">
                    {onNavigateToPartAlign && (
                      <button
                        type="button"
                        onClick={() => onNavigateToPartAlign('leg', selectedBottom)}
                        className="text-[10px] text-amber-300 hover:text-white bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded transition flex items-center gap-1"
                      >
                        <Crosshair className="w-3 h-3" />
                        <span>#{selectedBottom} 정렬</span>
                      </button>
                    )}
                    <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      선택 #{selectedBottom}
                    </span>
                  </div>
                </div>

                <div className={`grid ${actualCount > 15 ? 'grid-cols-6' : 'grid-cols-5'} gap-1.5 max-h-56 overflow-y-auto custom-scrollbar p-0.5`}>
                  {Array.from({ length: actualCount }, (_, i) => i + 1).map((id) => {
                    const isSelected = selectedBottom === id;
                    const tile = legTiles[id - 1];
                    return (
                      <button
                        key={id}
                        onClick={() => setSelectedBottom(id)}
                        className={`group relative rounded-lg border p-1 aspect-square flex flex-col items-center justify-center transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/20 shadow-lg ring-2 ring-amber-500/40'
                            : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                        }`}
                      >
                        {tile ? (
                          <img
                            src={getThumbnailDataUrl(tile)}
                            alt={`하의 #${id}`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-xs text-slate-500">#{id}</span>
                        )}
                        <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-slate-400 group-hover:text-white">
                          #{id}
                        </span>
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-amber-500 flex items-center justify-center">
                            <Check className="w-2 h-2 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  </div>
</div>
);
};
