import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  calculateSlotBoxes,
  renderPartGridCanvas,
  SlotBox,
} from '../utils/imageProcessor';
import {
  AnchorSettings,
  GuideDisplaySettings,
  PartCategory,
  SlotConfig,
} from '../types';
import {
  Crosshair,
  Grid,
  Maximize2,
  Move,
  RotateCcw,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Sliders,
  Check,
  ChevronDown,
  ChevronUp,
  Columns,
  Palette,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Wand2,
  Layers,
} from 'lucide-react';

interface CanvasStageProps {
  partCategory: PartCategory;
  tiles: HTMLCanvasElement[];
  slotConfigs: SlotConfig[];
  anchorSettings: AnchorSettings;
  onUpdateAnchorSettings: (settings: Partial<AnchorSettings>) => void;
  guideSettings: GuideDisplaySettings;
  onUpdateGuideSettings: (settings: Partial<GuideDisplaySettings>) => void;
  activeSlotId: number | null;
  onSelectSlot: (id: number | null) => void;
  onUpdateSlotConfig: (id: number, updater: (prev: SlotConfig) => SlotConfig) => void;
  onBatchUpdateConfigs: (updater: (prev: SlotConfig) => SlotConfig) => void;
  onAutoAlignCategory?: (category: PartCategory) => void;
  onAutoAlignAllParts?: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  rows?: number;
  cols?: number;
  sheetMode?: 15 | 30;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({
  partCategory,
  tiles,
  slotConfigs,
  anchorSettings,
  onUpdateAnchorSettings,
  guideSettings,
  onUpdateGuideSettings,
  activeSlotId,
  onSelectSlot,
  onUpdateSlotConfig,
  onBatchUpdateConfigs,
  onAutoAlignCategory,
  onAutoAlignAllParts,
  zoom,
  onZoomChange,
  rows,
  cols,
  sheetMode = 15,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [hoverSlotId, setHoverSlotId] = useState<number | null>(null);

  // Direct dragging of part offset on canvas
  const [isDraggingPart, setIsDraggingPart] = useState(false);
  const [partDragStart, setPartDragStart] = useState({ x: 0, y: 0 });
  const [showBatchControls, setShowBatchControls] = useState(false);
  const [batchCategory, setBatchCategory] = useState<PartCategory>(partCategory);
  const [batchStep, setBatchStep] = useState<number>(3);

  // Grid dimensions
  const actualRows = rows || (sheetMode === 30 ? 5 : 3);
  const actualCols = cols || (sheetMode === 30 ? 6 : 5);
  const totalSlots = actualRows * actualCols;

  // Sync batchCategory when parent partCategory view changes
  useEffect(() => {
    setBatchCategory(partCategory);
  }, [partCategory]);

  const canvasWidth = actualCols === 6 ? 2640 : actualCols === 10 ? 3200 : 2400;
  const canvasHeight = actualRows === 6 ? 2700 : actualRows === 5 ? 2300 : 1500;

  // Batch actions on all items
  const handleBatchScaleDelta = (delta: number) => {
    onBatchUpdateConfigs((prev) => {
      const current = prev[batchCategory] || (batchCategory === 'outfit' ? prev.body : null) || { x: 0, y: 0, scale: 1 };
      const newScale = Math.max(0.3, Math.min(2.0, Number((current.scale + delta).toFixed(2))));
      return {
        ...prev,
        [batchCategory]: {
          ...current,
          scale: newScale,
        },
        ...(batchCategory === 'outfit' ? { body: { ...(prev.body || current), scale: newScale } } : {}),
      };
    });
  };

  const handleBatchScaleExact = (exactScale: number) => {
    onBatchUpdateConfigs((prev) => {
      const current = prev[batchCategory] || (batchCategory === 'outfit' ? prev.body : null) || { x: 0, y: 0, scale: 1 };
      return {
        ...prev,
        [batchCategory]: {
          ...current,
          scale: exactScale,
        },
        ...(batchCategory === 'outfit' ? { body: { ...(prev.body || current), scale: exactScale } } : {}),
      };
    });
  };

  const handleBatchNudgePos = (dx: number, dy: number) => {
    onBatchUpdateConfigs((prev) => {
      const current = prev[batchCategory] || (batchCategory === 'outfit' ? prev.body : null) || { x: 0, y: 0, scale: 1 };
      return {
        ...prev,
        [batchCategory]: {
          ...current,
          x: current.x + dx,
          y: current.y + dy,
        },
        ...(batchCategory === 'outfit' ? { body: { ...(prev.body || current), x: current.x + dx, y: current.y + dy } } : {}),
      };
    });
  };

  const handleBatchResetPos = () => {
    onBatchUpdateConfigs((prev) => ({
      ...prev,
      [batchCategory]: {
        ...(prev[batchCategory] || { scale: 1 }),
        x: 0,
        y: 0,
      },
      ...(batchCategory === 'outfit' ? { body: { ...(prev.body || { scale: 1 }), x: 0, y: 0 } } : {}),
    }));
  };

  const handleBatchResetAll = () => {
    onBatchUpdateConfigs((prev) => ({
      ...prev,
      [batchCategory]: {
        x: 0,
        y: 0,
        scale: 1,
      },
      ...(batchCategory === 'outfit' ? { body: { x: 0, y: 0, scale: 1 } } : {}),
    }));
  };

  // Average scale calculation for the currently selected batch category
  const activeConfigs = slotConfigs.slice(0, totalSlots);
  const avgScale = Math.round(
    (activeConfigs.reduce((acc, cur) => {
      const part = cur[batchCategory] || (batchCategory === 'outfit' ? cur.body : null) || { scale: 1 };
      return acc + (part.scale || 1);
    }, 0) /
      (activeConfigs.length || 1)) *
      100
  );

  // Calculate Fit-to-screen scale so all slots fit on screen
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const availableW = containerRef.current.clientWidth - 48;
    const availableH = containerRef.current.clientHeight - 48;
    if (availableW <= 0 || availableH <= 0) return;

    const fitScale = Math.min(availableW / canvasWidth, availableH / canvasHeight);
    const clamped = Math.max(0.18, Math.min(1.0, Number(fitScale.toFixed(3))));
    onZoomChange(clamped);

    containerRef.current.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
  }, [canvasWidth, canvasHeight, onZoomChange]);

  // Auto-fit on initial mount or when rows/cols change
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFitToScreen();
    }, 100);
    return () => clearTimeout(timer);
  }, [handleFitToScreen, actualRows, actualCols]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
    }

    renderPartGridCanvas(
      canvas,
      partCategory,
      tiles,
      slotConfigs,
      anchorSettings,
      guideSettings,
      activeSlotId,
      hoverSlotId,
      actualRows,
      actualCols
    );
  }, [
    partCategory,
    tiles,
    slotConfigs,
    anchorSettings,
    guideSettings,
    activeSlotId,
    hoverSlotId,
    canvasWidth,
    canvasHeight,
    actualRows,
    actualCols,
  ]);

  // Convert mouse coordinates to canvas coordinates (100% accurate regardless of scroll/zoom)
  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvasWidth / rect.width;
      const scaleY = canvasHeight / rect.height;

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    [canvasWidth, canvasHeight]
  );

  // Find slot at canvas coords
  const getSlotAtCoords = useCallback(
    (x: number, y: number): SlotBox | null => {
      const boxes = calculateSlotBoxes(canvasWidth, canvasHeight, actualRows, actualCols);
      return (
        boxes.find(
          (b) => x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height
        ) || null
      );
    },
    [canvasWidth, canvasHeight, actualRows, actualCols]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    const coords = getCanvasCoords(e.clientX, e.clientY);
    const clickedSlot = getSlotAtCoords(coords.x, coords.y);

    if (clickedSlot) {
      onSelectSlot(clickedSlot.id);
      setIsDraggingPart(true);
      setPartDragStart({ x: coords.x, y: coords.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);

    if (isDraggingPart && activeSlotId !== null) {
      const deltaX = coords.x - partDragStart.x;
      const deltaY = coords.y - partDragStart.y;

      if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
        onUpdateSlotConfig(activeSlotId, (prev) => {
          const key = partCategory;
          const current = prev[key] || (key === 'outfit' ? prev.body : null) || { x: 0, y: 0, scale: 1 };
          return {
            ...prev,
            [key]: {
              ...current,
              x: Math.round(current.x + deltaX),
              y: Math.round(current.y + deltaY),
            },
            ...(key === 'outfit'
              ? { body: { ...(prev.body || current), x: Math.round(current.x + deltaX), y: Math.round(current.y + deltaY) } }
              : {}),
          };
        });
        setPartDragStart({ x: coords.x, y: coords.y });
      }
      return;
    }

    // Hover detection
    const hovered = getSlotAtCoords(coords.x, coords.y);
    setHoverSlotId(hovered ? hovered.id : null);
  };

  const handleMouseUp = () => {
    setIsDraggingPart(false);
  };

  // Wheel event: Ctrl/Cmd + wheel zooms, normal wheel scrolls naturally!
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      onZoomChange(Math.min(2.0, Math.max(0.18, Number((zoom * zoomFactor).toFixed(3)))));
    }
  };

  // Smooth scroll to specific row
  const scrollToRow = (rowIndex: number) => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const displayHeight = canvasHeight * zoom;
    const rowHeight = displayHeight / actualRows;
    const targetScrollY = rowIndex * rowHeight;
    container.scrollTo({ top: targetScrollY, behavior: 'smooth' });
  };

  // Keyboard navigation for fine-grained nudging
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeSlotId) return;

      const step = e.shiftKey ? 10 : 1;
      let dx = 0;
      let dy = 0;

      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      else return;

      e.preventDefault();
      onUpdateSlotConfig(activeSlotId, (prev) => {
        const key = partCategory;
        const current = prev[key] || (key === 'outfit' ? prev.body : null) || { x: 0, y: 0, scale: 1 };
        return {
          ...prev,
          [key]: {
            ...current,
            x: current.x + dx,
            y: current.y + dy,
          },
          ...(key === 'outfit'
            ? { body: { ...(prev.body || current), x: current.x + dx, y: current.y + dy } }
            : {}),
        };
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSlotId, partCategory, onUpdateSlotConfig]);

  const activeConfig = slotConfigs.find((s) => s.id === activeSlotId);
  const activePartOffset = activeConfig
    ? partCategory === 'outfit'
      ? activeConfig.outfit || activeConfig.body || { x: 0, y: 0, scale: 1 }
      : activeConfig[partCategory] || { x: 0, y: 0, scale: 1 }
    : { x: 0, y: 0, scale: 1 };

  return (
    <div className="relative flex-1 w-full h-full bg-slate-950 overflow-hidden flex flex-col select-none">
      {/* Top Floating Control Bar: Part info & Row navigation buttons */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between gap-2 pointer-events-none">
        {/* Category banner */}
        <div className="pointer-events-auto px-3 py-1.5 rounded-xl bg-slate-900/95 border border-slate-700 backdrop-blur shadow-xl flex items-center gap-2.5">
          <div
            className={`w-3 h-3 rounded-full animate-pulse ${
              partCategory === 'face'
                ? 'bg-orange-500 shadow-orange-500/50'
                : partCategory === 'hair' || partCategory === 'head'
                ? 'bg-purple-500 shadow-purple-500/50'
                : partCategory === 'body'
                ? 'bg-sky-500 shadow-sky-500/50'
                : partCategory === 'outfit'
                ? 'bg-pink-500 shadow-pink-500/50'
                : 'bg-amber-400 shadow-amber-400/50'
            }`}
          />
          <div>
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              {partCategory === 'face' && `😊 ${totalSlots}종 얼굴 정렬 — 기준점: 🟠 코 중심선`}
              {(partCategory === 'hair' || partCategory === 'head') && `💇 ${totalSlots}종 헤어 정렬 — 기준점: 🟣 코 중심선`}
              {partCategory === 'body' && `👕 ${totalSlots}종 상의 정렬 — 기준점: 🔵 목끝 결합선`}
              {partCategory === 'outfit' && `👗 ${totalSlots}종 상의+하의 정렬 — 기준점: 🔵 목선(상단) & 🌸 허리선`}
              {partCategory === 'leg' && `👖 ${totalSlots}종 하의 정렬 — 기준점: 🟡 발끝/바닥선`}
            </span>
          </div>

          <button
            onClick={() => onAutoAlignCategory && onAutoAlignCategory(partCategory)}
            className="ml-2 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 text-xs font-bold shadow-lg shadow-emerald-500/30 transition flex items-center gap-1.5"
            title={`현재 파트(${partCategory === 'face' ? '얼굴: 코 중심' : partCategory === 'hair' ? '헤어: 코 기준' : partCategory === 'body' ? '상의: 목끝' : '하의: 허리'}) ${totalSlots}개 전체를 자동 분석하여 기준점에 배치합니다`}
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-200" />
            <span>🎯 스마트 자동 정렬</span>
          </button>

          <button
            onClick={() => setShowBatchControls(!showBatchControls)}
            className={`ml-1 px-3 py-1 rounded-lg border text-xs font-bold shadow-lg transition flex items-center gap-1.5 ${
              showBatchControls
                ? 'bg-purple-600 text-white border-purple-400 shadow-purple-500/40'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400 shadow-indigo-500/30'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>⚡ {totalSlots}개 일괄 조절</span>
          </button>
        </div>

        {/* Quick Row Navigation Buttons (행 빠른 이동) */}
        <div className="pointer-events-auto flex items-center bg-slate-900/95 border border-slate-700 rounded-xl p-1 gap-1 shadow-xl overflow-x-auto max-w-[60vw]">
          <button
            onClick={handleFitToScreen}
            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition flex items-center gap-1 shrink-0"
            title={`${totalSlots}개 스프라이트 전체를 현재 화면 크기에 딱 맞춥니다`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{totalSlots}개 한눈에 보기</span>
          </button>

          <span className="w-px h-4 bg-slate-700 mx-0.5 shrink-0" />

          {Array.from({ length: actualRows }, (_, r) => {
            const startId = r * actualCols + 1;
            const endId = Math.min((r + 1) * actualCols, totalSlots);
            return (
              <button
                key={r}
                onClick={() => scrollToRow(r)}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition whitespace-nowrap shrink-0"
                title={`${r + 1}행 (#${startId} ~ #${endId})으로 스크롤`}
              >
                {r + 1}행 (#{startId}~{endId})
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Batch / Anchor Adjuster Modal */}
      {showBatchControls && (
        <div className="absolute top-14 left-3 z-40 w-96 p-4 rounded-2xl bg-slate-900/98 border border-slate-700 backdrop-blur-xl shadow-2xl flex flex-col gap-3.5 animate-fade-in text-xs max-h-[85vh] overflow-y-auto custom-scrollbar">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <span className="font-bold text-white flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-purple-400" />
              {totalSlots}개 스프라이트 일괄 조절
            </span>
            <button
              onClick={() => setShowBatchControls(false)}
              className="text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800"
            >
              ✕ 닫기
            </button>
          </div>

          {/* Part Category Selector (얼굴 / 헤어 / 상의 / 하의 / 상의+하의 선택) */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
              조절 대상 파트 선택
            </span>
            <div className="grid grid-cols-5 gap-1">
              <button
                onClick={() => setBatchCategory('face')}
                className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition flex flex-col items-center gap-0.5 border ${
                  batchCategory === 'face'
                    ? 'bg-orange-500/20 text-orange-300 border-orange-500/50 shadow-md'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <span className="text-sm">😊</span>
                <span>얼굴</span>
              </button>

              <button
                onClick={() => setBatchCategory('hair')}
                className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition flex flex-col items-center gap-0.5 border ${
                  batchCategory === 'hair' || batchCategory === 'head'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-md'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <span className="text-sm">💇</span>
                <span>헤어</span>
              </button>

              <button
                onClick={() => setBatchCategory('body')}
                className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition flex flex-col items-center gap-0.5 border ${
                  batchCategory === 'body'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-md'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <span className="text-sm">👕</span>
                <span>상의</span>
              </button>

              <button
                onClick={() => setBatchCategory('leg')}
                className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition flex flex-col items-center gap-0.5 border ${
                  batchCategory === 'leg'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <span className="text-sm">👖</span>
                <span>하의</span>
              </button>

              <button
                onClick={() => setBatchCategory('outfit')}
                className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition flex flex-col items-center gap-0.5 border ${
                  batchCategory === 'outfit'
                    ? 'bg-pink-500/20 text-pink-300 border-pink-500/50 shadow-md'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'
                }`}
                title="상의+하의 30종 일체형 의상 일괄 조절"
              >
                <span className="text-sm">👗</span>
                <span>상의+하의</span>
              </button>
            </div>
          </div>

          {/* AI Smart Auto-Align Section */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
                <Wand2 className="w-4 h-4 text-emerald-400" />
                스마트 AI 기준점 자동 정렬
              </span>
              <span className="text-[10px] text-emerald-300/80 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 font-semibold">
                원클릭 감지
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              얼굴은 코 중심을 정중앙에, 상의는 목깃을 맨 위에, 하의는 허리를 결합선에 맞추어 자동으로 배치합니다.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onAutoAlignCategory && onAutoAlignCategory(batchCategory)}
                className="py-2 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>{batchCategory === 'face' ? '얼굴' : batchCategory === 'hair' ? '헤어' : batchCategory === 'body' ? '상의' : batchCategory === 'outfit' ? '상의+하의' : '하의'} {totalSlots}개 정렬</span>
              </button>
              <button
                type="button"
                onClick={() => onAutoAlignAllParts && onAutoAlignAllParts()}
                className="py-2 px-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow transition flex items-center justify-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-amber-200" />
                <span>전체 파트 자동 결합</span>
              </button>
            </div>
          </div>

          {/* 1. Batch Scale Controls (일괄 크기 변경) */}
          <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
                일괄 크기 변경 ({totalSlots}개 전체)
              </span>
              <span className="font-mono text-purple-300 font-bold px-2 py-0.5 bg-purple-900/40 rounded border border-purple-700/50">
                {avgScale}%
              </span>
            </div>

            {/* Slider for exact scale */}
            <div>
              <input
                type="range"
                min={50}
                max={150}
                value={avgScale}
                onChange={(e) => handleBatchScaleExact(Number(e.target.value) / 100)}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            {/* Step scale buttons */}
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">미세 확대 / 축소 버튼</span>
              <div className="grid grid-cols-5 gap-1 text-[11px] font-semibold">
                <button
                  onClick={() => handleBatchScaleDelta(-0.05)}
                  className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
                  title="전체 5% 축소"
                >
                  -5%
                </button>
                <button
                  onClick={() => handleBatchScaleDelta(-0.02)}
                  className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
                  title="전체 2% 축소"
                >
                  -2%
                </button>
                <button
                  onClick={() => handleBatchScaleExact(1.0)}
                  className="py-1 bg-purple-600 hover:bg-purple-500 text-white rounded shadow transition font-bold"
                  title="전체 100% 원본 크기로 복원"
                >
                  100%
                </button>
                <button
                  onClick={() => handleBatchScaleDelta(0.02)}
                  className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
                  title="전체 2% 확대"
                >
                  +2%
                </button>
                <button
                  onClick={() => handleBatchScaleDelta(0.05)}
                  className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
                  title="전체 5% 확대"
                >
                  +5%
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1 pt-0.5">
              <span className="text-[10px] text-slate-400">빠른 비율:</span>
              {[80, 90, 100, 110, 120].map((val) => (
                <button
                  key={val}
                  onClick={() => handleBatchScaleExact(val / 100)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition ${
                    avgScale === val
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {val}%
                </button>
              ))}
            </div>
          </div>

          {/* 2. Batch Position Controls (일괄 위치 변경) */}
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                일괄 위치 이동 ({totalSlots}개 전체)
              </span>
              {/* Step size */}
              <div className="flex items-center gap-1 bg-slate-800 rounded p-0.5 border border-slate-700">
                {[1, 3, 10].map((step) => (
                  <button
                    key={step}
                    onClick={() => setBatchStep(step)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      batchStep === step
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {step}px
                  </button>
                ))}
              </div>
            </div>

            {/* Direction Pad */}
            <div className="flex flex-col items-center gap-1 py-1">
              <button
                onClick={() => handleBatchNudgePos(0, -batchStep)}
                className="px-6 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 border border-slate-700 transition flex items-center gap-1 font-semibold"
                title="전체 위로 이동"
              >
                <ArrowUp className="w-4 h-4 text-indigo-400" />
                <span>↑ 위로 ({batchStep}px)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBatchNudgePos(-batchStep, 0)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 border border-slate-700 transition flex items-center gap-1 font-semibold"
                  title="전체 왼쪽으로 이동"
                >
                  <ArrowLeft className="w-4 h-4 text-indigo-400" />
                  <span>← 좌</span>
                </button>

                <button
                  onClick={handleBatchResetPos}
                  className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white border border-slate-700 text-[10px]"
                  title="전체 위치를 0,0 원점으로 초기화"
                >
                  0,0 리셋
                </button>

                <button
                  onClick={() => handleBatchNudgePos(batchStep, 0)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 border border-slate-700 transition flex items-center gap-1 font-semibold"
                  title="전체 오른쪽으로 이동"
                >
                  <span>우 →</span>
                  <ArrowRight className="w-4 h-4 text-indigo-400" />
                </button>
              </div>

              <button
                onClick={() => handleBatchNudgePos(0, batchStep)}
                className="px-6 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 border border-slate-700 transition flex items-center gap-1 font-semibold"
                title="전체 아래로 이동"
              >
                <ArrowDown className="w-4 h-4 text-indigo-400" />
                <span>↓ 아래로 ({batchStep}px)</span>
              </button>
            </div>
          </div>

          {/* 3. Anchor Line Height Adjuster */}
          <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-slate-300">
              <span className="font-semibold flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-indigo-400" />
                {batchCategory === 'face' && '🟠 얼굴 코 중심 기준선 (Nose Y)'}
                {(batchCategory === 'hair' || batchCategory === 'head') && '🟣 헤어 코 기준선 (Nose Y)'}
                {batchCategory === 'body' && '🔵 목끝 결합 타겟선 높이 (Neck Y)'}
                {batchCategory === 'leg' && '🟡 발끝 바닥 타겟선 높이 (Foot Y)'}
              </span>
              <span className="font-mono text-indigo-400">
                {batchCategory === 'face' && `${anchorSettings.faceNoseY ?? anchorSettings.headNoseY}px`}
                {(batchCategory === 'hair' || batchCategory === 'head') && `${anchorSettings.hairNoseY ?? anchorSettings.headNoseY}px`}
                {batchCategory === 'body' && `${anchorSettings.bodyNeckY}px`}
                {batchCategory === 'leg' && `${anchorSettings.legFootY}px`}
              </span>
            </div>
            <input
              type="range"
              min={-200}
              max={200}
              value={
                batchCategory === 'face'
                  ? (anchorSettings.faceNoseY ?? anchorSettings.headNoseY)
                  : batchCategory === 'hair' || batchCategory === 'head'
                  ? (anchorSettings.hairNoseY ?? anchorSettings.headNoseY)
                  : batchCategory === 'body'
                  ? anchorSettings.bodyNeckY
                  : anchorSettings.legFootY
              }
              onChange={(e) => {
                const val = Number(e.target.value);
                if (batchCategory === 'face') onUpdateAnchorSettings({ faceNoseY: val });
                else if (batchCategory === 'hair' || batchCategory === 'head') onUpdateAnchorSettings({ hairNoseY: val, headNoseY: val });
                else if (batchCategory === 'body') onUpdateAnchorSettings({ bodyNeckY: val });
                else onUpdateAnchorSettings({ legFootY: val });
              }}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* 4. Vertical Center Line Visibility & Color Adjuster */}
          <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Columns className="w-3.5 h-3.5 text-cyan-400" />
                세로 중심선 설정
              </span>
              <button
                onClick={() =>
                  onUpdateGuideSettings({
                    showCenterLine: !guideSettings.showCenterLine,
                  })
                }
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition ${
                  guideSettings.showCenterLine
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {guideSettings.showCenterLine ? '세로선 켜짐' : '세로선 꺼짐'}
              </button>
            </div>

            {/* Color swatches */}
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">세로선 색상 선택</span>
              <div className="flex items-center gap-1.5">
                {[
                  { label: '청록', color: '#00f0ff' },
                  { label: '노랑', color: '#fde047' },
                  { label: '주황', color: '#f97316' },
                  { label: '화이트', color: '#ffffff' },
                  { label: '핑크', color: '#f43f5e' },
                  { label: '연두', color: '#22c55e' },
                ].map((item) => (
                  <button
                    key={item.color}
                    onClick={() => onUpdateGuideSettings({ centerLineColor: item.color })}
                    className={`w-6 h-6 rounded-full border-2 transition flex items-center justify-center ${
                      (guideSettings.centerLineColor || '#00f0ff') === item.color
                        ? 'border-white scale-110 shadow-lg'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: item.color }}
                    title={item.label}
                  >
                    {(guideSettings.centerLineColor || '#00f0ff') === item.color && (
                      <Check className="w-3 h-3 text-black stroke-[3]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Line thickness and style */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">선 굵기</span>
                <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded border border-slate-700">
                  {[
                    { label: '보통', width: 2 },
                    { label: '굵게', width: 3.5 },
                    { label: '특대', width: 5 },
                  ].map((w) => (
                    <button
                      key={w.width}
                      onClick={() => onUpdateGuideSettings({ centerLineWidth: w.width })}
                      className={`flex-1 py-1 rounded text-[10px] font-semibold transition ${
                        (guideSettings.centerLineWidth || 2.5) === w.width
                          ? 'bg-cyan-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1">선 형태</span>
                <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded border border-slate-700">
                  <button
                    onClick={() => onUpdateGuideSettings({ centerLineStyle: 'solid' })}
                    className={`flex-1 py-1 rounded text-[10px] font-semibold transition ${
                      (guideSettings.centerLineStyle || 'solid') === 'solid'
                        ? 'bg-cyan-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    실선
                  </button>
                  <button
                    onClick={() => onUpdateGuideSettings({ centerLineStyle: 'dashed' })}
                    className={`flex-1 py-1 rounded text-[10px] font-semibold transition ${
                      guideSettings.centerLineStyle === 'dashed'
                        ? 'bg-cyan-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    점선
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Reset All */}
          <div>
            <button
              onClick={handleBatchResetAll}
              className="w-full py-2 bg-slate-800 hover:bg-red-950/40 text-slate-300 hover:text-red-300 rounded-lg text-xs font-semibold border border-slate-700 hover:border-red-800 transition flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>
                {batchCategory === 'face' && '😊 얼굴 15개 전체 오프셋 및 크기 초기화'}
                {(batchCategory === 'hair' || batchCategory === 'head') && '💇 헤어 15개 전체 오프셋 및 크기 초기화'}
                {batchCategory === 'body' && '👕 상의 15개 전체 오프셋 및 크기 초기화'}
                {batchCategory === 'leg' && '👖 하의 15개 전체 오프셋 및 크기 초기화'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Main Scrollable Viewport: Natural scrollbars (vertical & horizontal) */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        className="flex-1 w-full h-full overflow-x-auto overflow-y-auto pt-16 pb-20 px-6 flex items-start justify-center custom-scrollbar"
      >
        <div
          style={{
            width: `${Math.round(canvasWidth * zoom)}px`,
            height: `${Math.round(canvasHeight * zoom)}px`,
            minWidth: `${Math.round(canvasWidth * zoom)}px`,
            minHeight: `${Math.round(canvasHeight * zoom)}px`,
          }}
          className="relative m-auto shadow-2xl rounded-xl overflow-hidden border border-slate-800 bg-slate-900 transition-all duration-75"
        >
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ width: '100%', height: '100%' }}
            className="block cursor-crosshair"
          />
        </div>
      </div>

      {/* Floating Active Slot Quick Inspector Card (Bottom-Center) */}
      {activeSlotId !== null && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 px-3.5 py-2 rounded-2xl bg-slate-900/95 border border-slate-700 backdrop-blur shadow-2xl flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 border-r border-slate-800 pr-3">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
              #{activeSlotId}
            </div>
            <div>
              <span className="font-bold text-white">슬롯 #{activeSlotId}</span>
              <p className="text-[10px] text-slate-400">드래그/방향키 위치 조정</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 font-mono text-[11px]">
            <div>
              <span className="text-slate-400">X:</span>{' '}
              <span className="text-indigo-400">{activePartOffset.x}px</span>
            </div>
            <div>
              <span className="text-slate-400">Y:</span>{' '}
              <span className="text-indigo-400">{activePartOffset.y}px</span>
            </div>
            <div>
              <span className="text-slate-400">크기:</span>{' '}
              <span className="text-indigo-400">{Math.round(activePartOffset.scale * 100)}%</span>
            </div>
          </div>

          <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
            <button
              onClick={() =>
                onUpdateSlotConfig(activeSlotId, (prev) => ({
                  ...prev,
                  [partCategory]: {
                    ...prev[partCategory],
                    scale: Math.max(0.5, prev[partCategory].scale - 0.02),
                  },
                }))
              }
              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-[11px]"
              title="크기 축소"
            >
              -
            </button>
            <button
              onClick={() =>
                onUpdateSlotConfig(activeSlotId, (prev) => ({
                  ...prev,
                  [partCategory]: {
                    ...prev[partCategory],
                    scale: Math.min(1.5, prev[partCategory].scale + 0.02),
                  },
                }))
              }
              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-[11px]"
              title="크기 확대"
            >
              +
            </button>
            <button
              onClick={() =>
                onUpdateSlotConfig(activeSlotId, (prev) => ({
                  ...prev,
                  [partCategory]: { x: 0, y: 0, scale: 1 },
                }))
              }
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
              title="오프셋 초기화"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Zoom & Display Controls (Bottom-Right) */}
      <div className="absolute bottom-4 right-4 z-30 flex items-center gap-2">
        {/* Zoom Controls */}
        <div className="flex items-center bg-slate-900/95 border border-slate-700 rounded-xl p-1 shadow-xl">
          <button
            onClick={() => onZoomChange(Math.max(0.2, zoom - 0.05))}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
            title="축소"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono font-medium px-2 text-slate-300 min-w-[46px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => onZoomChange(Math.min(2.0, zoom + 0.05))}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
            title="확대"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleFitToScreen}
            className="px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-lg text-[11px] font-semibold border border-indigo-500/40 ml-1 transition"
            title="15개 스프라이트 전체를 화면 크기에 맞춤"
          >
            화면 맞춤
          </button>
        </div>

        {/* Toggle Vertical Center Line */}
        <button
          onClick={() =>
            onUpdateGuideSettings({
              showCenterLine: !guideSettings.showCenterLine,
            })
          }
          className={`p-2 rounded-xl border text-xs backdrop-blur shadow-xl transition flex items-center gap-1.5 ${
            guideSettings.showCenterLine
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : 'bg-slate-900/95 text-slate-400 border-slate-700 hover:text-white'
          }`}
          title="세로 중심선 (가운데 줄) 켜기 / 끄기"
        >
          <Columns className="w-4 h-4" />
          <span className="text-[11px] font-semibold hidden sm:inline">세로선</span>
        </button>

        {/* Toggle Crosshair */}
        <button
          onClick={() =>
            onUpdateGuideSettings({
              showAnchorCrosshair: !guideSettings.showAnchorCrosshair,
            })
          }
          className={`p-2 rounded-xl border text-xs backdrop-blur shadow-xl transition ${
            guideSettings.showAnchorCrosshair
              ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40'
              : 'bg-slate-900/95 text-slate-400 border-slate-700 hover:text-white'
          }`}
          title="기준점 십자선 토글"
        >
          <Crosshair className="w-4 h-4" />
        </button>

        {/* Toggle Background */}
        <button
          onClick={() => {
            const nextBg: Record<
              GuideDisplaySettings['backgroundColor'],
              GuideDisplaySettings['backgroundColor']
            > = {
              dark: 'grid',
              grid: 'white',
              white: 'dark',
              transparent: 'dark',
            };
            onUpdateGuideSettings({ backgroundColor: nextBg[guideSettings.backgroundColor] });
          }}
          className="p-2 rounded-xl bg-slate-900/95 text-slate-300 border border-slate-700 hover:text-white backdrop-blur shadow-xl text-xs transition"
          title="배경 스타일 변경 (다크 / 격자 / 화이트)"
        >
          <Grid className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
