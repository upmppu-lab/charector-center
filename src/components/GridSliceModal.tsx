import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Grid30Layout,
  ProcessingSettings,
  SheetMode,
  SheetSliceConfig,
} from '../types';
import {
  autoCalculateSpriteGrid,
  detectConnectedSpriteBlobs,
  getSliceBoxes,
  tightenBoxToContent,
} from '../utils/imageProcessor';
import {
  Check,
  Maximize2,
  RotateCcw,
  Sparkles,
  Wand2,
  X,
  Sliders,
  Move,
  ArrowRight,
  ArrowDown,
  Columns,
  Grid,
  Scissors,
  Trash2,
  Plus,
  Target,
  ArrowUpDown,
} from 'lucide-react';

interface GridSliceModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetImage: HTMLImageElement | null;
  imageLabel: string;
  sheetMode: SheetMode;
  initialRows?: number;
  initialCols?: number;
  currentSliceConfig?: SheetSliceConfig;
  onApplySliceConfig: (config: SheetSliceConfig) => void;
  processingSettings: ProcessingSettings;
}

export const GridSliceModal: React.FC<GridSliceModalProps> = ({
  isOpen,
  onClose,
  targetImage,
  imageLabel,
  sheetMode,
  initialRows = sheetMode === 30 ? 5 : 3,
  initialCols = sheetMode === 30 ? 6 : 5,
  currentSliceConfig,
  onApplySliceConfig,
  processingSettings,
}) => {
  const [rows, setRows] = useState<number>(initialRows);
  const [cols, setCols] = useState<number>(initialCols);

  const [marginTop, setMarginTop] = useState<number>(0);
  const [marginBottom, setMarginBottom] = useState<number>(0);
  const [marginLeft, setMarginLeft] = useState<number>(0);
  const [marginRight, setMarginRight] = useState<number>(0);

  const [gapX, setGapX] = useState<number>(0);
  const [gapY, setGapY] = useState<number>(0);

  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);

  const [customCellBoxes, setCustomCellBoxes] = useState<
    Array<{ x: number; y: number; width: number; height: number }> | undefined
  >(undefined);

  const [selectedBoxIdx, setSelectedBoxIdx] = useState<number | null>(null);
  const [autoCalculatedMsg, setAutoCalculatedMsg] = useState<string | null>(null);

  // Mouse drag & resize state on canvas
  const [dragMode, setDragMode] = useState<'move' | 'resize' | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragInitialBox, setDragInitialBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevIsOpenRef = useRef<boolean>(false);

  // Run Valley & Projection Auto-Calculation
  const runAutoCalculation = useCallback(
    (targetR: number, targetC: number) => {
      if (!targetImage) return;
      const detected = autoCalculateSpriteGrid(
        targetImage,
        targetR,
        targetC,
        processingSettings.tolerance
      );

      setRows(targetR);
      setCols(targetC);
      setMarginTop(detected.marginTop);
      setMarginBottom(detected.marginBottom);
      setMarginLeft(detected.marginLeft);
      setMarginRight(detected.marginRight);
      setGapX(detected.gapX);
      setGapY(detected.gapY);
      setOffsetX(0);
      setOffsetY(0);
      setCustomCellBoxes(detected.customCellBoxes);
      setSelectedBoxIdx(null);

      setAutoCalculatedMsg(
        `자동 계산 완료: 상하여백 ${detected.marginTop}px/${detected.marginBottom}px, 좌우여백 ${detected.marginLeft}px/${detected.marginRight}px, ${targetR}행×${targetC}열 최적 절단선이 설정되었습니다.`
      );
    },
    [targetImage, processingSettings.tolerance]
  );

  // Run AI Connected Component Blob Detection
  const runAiBlobDetection = useCallback(() => {
    if (!targetImage) return;
    const detected = detectConnectedSpriteBlobs(
      targetImage,
      rows * cols,
      processingSettings.tolerance
    );

    if (detected.length > 0) {
      setCustomCellBoxes(detected);
      setSelectedBoxIdx(0);
      setAutoCalculatedMsg(
        `AI 개별 캐릭터 감지 완료: ${detected.length}개의 캐릭터를 독립된 박스로 분리했습니다.`
      );
    } else {
      runAutoCalculation(rows, cols);
    }
  }, [targetImage, rows, cols, processingSettings.tolerance, runAutoCalculation]);

  // Switch grid layout directly without resetting custom state
  const handleSwitchGrid = useCallback(
    (targetR: number, targetC: number) => {
      setRows(targetR);
      setCols(targetC);
      runAutoCalculation(targetR, targetC);
    },
    [runAutoCalculation]
  );

  // Initialize only when modal opens
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current && targetImage) {
      if (currentSliceConfig) {
        setRows(currentSliceConfig.rows || initialRows);
        setCols(currentSliceConfig.cols || initialCols);
        setMarginTop(currentSliceConfig.marginTop || 0);
        setMarginBottom(currentSliceConfig.marginBottom || 0);
        setMarginLeft(currentSliceConfig.marginLeft || 0);
        setMarginRight(currentSliceConfig.marginRight || 0);
        setGapX(currentSliceConfig.gapX || 0);
        setGapY(currentSliceConfig.gapY || 0);
        setOffsetX(currentSliceConfig.offsetX || 0);
        setOffsetY(currentSliceConfig.offsetY || 0);
        setCustomCellBoxes(currentSliceConfig.customCellBoxes);
        setSelectedBoxIdx(null);
      } else {
        runAutoCalculation(initialRows, initialCols);
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, targetImage, currentSliceConfig, initialRows, initialCols, runAutoCalculation]);

  const activeConfig: SheetSliceConfig = {
    autoDetect: false,
    rows,
    cols,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    gapX,
    gapY,
    offsetX,
    offsetY,
    customCellBoxes,
  };

  const imgW = targetImage?.naturalWidth || targetImage?.width || 1200;
  const imgH = targetImage?.naturalHeight || targetImage?.height || 1000;
  const boxes = getSliceBoxes(imgW, imgH, activeConfig);

  // Redraw preview canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !targetImage) return;

    const maxViewW = 860;
    const maxViewH = 480;
    const scale = Math.min(maxViewW / imgW, maxViewH / imgH, 1);

    canvas.width = Math.round(imgW * scale);
    canvas.height = Math.round(imgH * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw uploaded image
    ctx.drawImage(targetImage, 0, 0, canvas.width, canvas.height);

    // Draw outer margin boundaries (pink dashed line)
    ctx.save();
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    const mLeft = marginLeft * scale;
    const mTop = marginTop * scale;
    const mRight = (imgW - marginRight) * scale;
    const mBot = (imgH - marginBottom) * scale;

    ctx.strokeRect(mLeft, mTop, Math.max(0, mRight - mLeft), Math.max(0, mBot - mTop));
    ctx.restore();

    // Draw slice cell boxes and labels
    boxes.forEach((box, idx) => {
      const isSelected = selectedBoxIdx === idx;
      const bx = box.x * scale;
      const by = box.y * scale;
      const bw = box.width * scale;
      const bh = box.height * scale;

      // Box border
      ctx.save();
      if (isSelected) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;
        ctx.strokeRect(bx, by, bw, bh);

        // Resize handle at bottom-right corner
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(bx + bw - 7, by + bh - 7, 7, 7);
      } else {
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx, by, bw, bh);
      }
      ctx.restore();

      // Semi-transparent overlay to highlight captured area
      ctx.fillStyle = isSelected ? 'rgba(245, 158, 11, 0.15)' : 'rgba(6, 182, 212, 0.08)';
      ctx.fillRect(bx, by, bw, bh);

      // Number badge
      ctx.fillStyle = isSelected ? 'rgba(245, 158, 11, 0.95)' : 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(bx + 2, by + 2, 26, 15);

      ctx.fillStyle = isSelected ? '#ffffff' : '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`#${idx + 1}`, bx + 4, by + 13);
    });
  }, [targetImage, boxes, imgW, imgH, marginLeft, marginTop, marginRight, marginBottom, selectedBoxIdx]);

  // Canvas Mouse Interactions: Select, Drag Box, Resize Box
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const scale = canvas.width / imgW;
    const mouseImgX = clientX / scale;
    const mouseImgY = clientY / scale;

    // Check if clicked near resize handle of selected box
    if (selectedBoxIdx !== null && boxes[selectedBoxIdx]) {
      const sBox = boxes[selectedBoxIdx];
      const handleDist = Math.hypot(mouseImgX - (sBox.x + sBox.width), mouseImgY - (sBox.y + sBox.height));
      if (handleDist <= 18 / scale) {
        setDragMode('resize');
        setDragStartPos({ x: mouseImgX, y: mouseImgY });
        setDragInitialBox({ ...sBox });
        return;
      }
    }

    // Check if clicked inside any box (check in reverse to pick top box)
    for (let i = boxes.length - 1; i >= 0; i--) {
      const b = boxes[i];
      if (
        mouseImgX >= b.x &&
        mouseImgX <= b.x + b.width &&
        mouseImgY >= b.y &&
        mouseImgY <= b.y + b.height
      ) {
        setSelectedBoxIdx(i);
        setDragMode('move');
        setDragStartPos({ x: mouseImgX, y: mouseImgY });
        setDragInitialBox({ ...b });
        return;
      }
    }

    setSelectedBoxIdx(null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragMode || selectedBoxIdx === null || !dragInitialBox) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const scale = canvas.width / imgW;
    const mouseImgX = clientX / scale;
    const mouseImgY = clientY / scale;

    const dx = Math.round(mouseImgX - dragStartPos.x);
    const dy = Math.round(mouseImgY - dragStartPos.y);

    const nextBoxes = [...boxes];
    if (dragMode === 'move') {
      nextBoxes[selectedBoxIdx] = {
        ...dragInitialBox,
        x: Math.max(0, Math.min(imgW - dragInitialBox.width, dragInitialBox.x + dx)),
        y: Math.max(0, Math.min(imgH - dragInitialBox.height, dragInitialBox.y + dy)),
      };
    } else if (dragMode === 'resize') {
      nextBoxes[selectedBoxIdx] = {
        ...dragInitialBox,
        width: Math.max(20, Math.min(imgW - dragInitialBox.x, dragInitialBox.width + dx)),
        height: Math.max(20, Math.min(imgH - dragInitialBox.y, dragInitialBox.height + dy)),
      };
    }
    setCustomCellBoxes(nextBoxes);
  };

  const handleCanvasMouseUp = () => {
    setDragMode(null);
  };

  // 1. Split Selected Box into 2 Top/Bottom boxes (Solves: "2개가 잘라져 있네" / 상하 2개 캐릭터 분할)
  const handleSplitSelectedBox = () => {
    if (selectedBoxIdx === null || !boxes[selectedBoxIdx]) return;
    const b = boxes[selectedBoxIdx];

    let splitYRel = Math.floor(b.height / 2);

    // Try finding the valley (gap) between top and bottom character inside the box
    if (targetImage) {
      try {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = b.width;
        offCanvas.height = b.height;
        const oCtx = offCanvas.getContext('2d', { willReadFrequently: true });
        if (oCtx) {
          oCtx.drawImage(targetImage, b.x, b.y, b.width, b.height, 0, 0, b.width, b.height);
          const imgData = oCtx.getImageData(0, 0, b.width, b.height);
          const d = imgData.data;

          const bgR = d[0], bgG = d[1], bgB = d[2];
          const startScan = Math.floor(b.height * 0.25);
          const endScan = Math.floor(b.height * 0.75);

          let minCount = Infinity;
          let bestY = splitYRel;

          for (let y = startScan; y <= endScan; y++) {
            let fgCount = 0;
            for (let x = 0; x < b.width; x++) {
              const idx = (y * b.width + x) * 4;
              const a = d[idx + 3];
              if (a > 20) {
                const diff = Math.abs(d[idx] - bgR) + Math.abs(d[idx + 1] - bgG) + Math.abs(d[idx + 2] - bgB);
                if (diff > 40) fgCount++;
              }
            }
            const distFromMid = Math.abs(y - b.height / 2);
            const score = fgCount + distFromMid * 0.15;
            if (score < minCount) {
              minCount = score;
              bestY = y;
            }
          }
          if (bestY > 10 && bestY < b.height - 10) {
            splitYRel = bestY;
          }
        }
      } catch (err) {
        console.warn('Auto split valley check failed, using half height', err);
      }
    }

    const topBox = { x: b.x, y: b.y, width: b.width, height: splitYRel };
    const botBox = { x: b.x, y: b.y + splitYRel, width: b.width, height: b.height - splitYRel };

    const nextBoxes = [...boxes];
    nextBoxes.splice(selectedBoxIdx, 1, topBox, botBox);
    setCustomCellBoxes(nextBoxes);
    setSelectedBoxIdx(selectedBoxIdx);
    setAutoCalculatedMsg(`슬롯 #${selectedBoxIdx + 1}을(를) 상/하 2개의 개별 박스로 분할했습니다. (총 ${nextBoxes.length}개 슬롯)`);
  };

  // 1-2. Split Selected Box into 2 Left/Right boxes (좌/우 2개 캐릭터 분할)
  const handleSplitLeftRightSelectedBox = () => {
    if (selectedBoxIdx === null || !boxes[selectedBoxIdx]) return;
    const b = boxes[selectedBoxIdx];

    const halfW = Math.floor(b.width / 2);
    const leftBox = { x: b.x, y: b.y, width: halfW, height: b.height };
    const rightBox = { x: b.x + halfW, y: b.y, width: b.width - halfW, height: b.height };

    const nextBoxes = [...boxes];
    nextBoxes.splice(selectedBoxIdx, 1, leftBox, rightBox);
    setCustomCellBoxes(nextBoxes);
    setSelectedBoxIdx(selectedBoxIdx);
    setAutoCalculatedMsg(`슬롯 #${selectedBoxIdx + 1}을(를) 좌/우 2개의 개별 박스로 분할했습니다. (총 ${nextBoxes.length}개 슬롯)`);
  };

  // 2. Tighten Selected Box to Content
  const handleTightenSelectedBox = () => {
    if (selectedBoxIdx === null || !boxes[selectedBoxIdx] || !targetImage) return;
    const tightened = tightenBoxToContent(targetImage, boxes[selectedBoxIdx], processingSettings.tolerance, 8);
    const nextBoxes = [...boxes];
    nextBoxes[selectedBoxIdx] = tightened;
    setCustomCellBoxes(nextBoxes);
    setAutoCalculatedMsg(`슬롯 #${selectedBoxIdx + 1}의 여백을 캐릭터 실체에 맞게 자동 밀착했습니다.`);
  };

  // 3. Tighten All Boxes to Content
  const handleTightenAllBoxes = () => {
    if (!targetImage) return;
    const nextBoxes = boxes.map((b) =>
      tightenBoxToContent(targetImage, b, processingSettings.tolerance, 8)
    );
    setCustomCellBoxes(nextBoxes);
    setAutoCalculatedMsg(`전체 ${boxes.length}개 슬롯의 여백을 캐릭터 실체에 맞게 자동 밀착했습니다.`);
  };

  // 4. Delete Selected Box
  const handleDeleteSelectedBox = () => {
    if (selectedBoxIdx === null || !boxes[selectedBoxIdx]) return;
    const nextBoxes = [...boxes];
    nextBoxes.splice(selectedBoxIdx, 1);
    setCustomCellBoxes(nextBoxes);
    setSelectedBoxIdx(null);
  };

  // 5. Add New Box
  const handleAddNewBox = () => {
    const avgW = Math.round(boxes.reduce((s, b) => s + b.width, 0) / (boxes.length || 1));
    const avgH = Math.round(boxes.reduce((s, b) => s + b.height, 0) / (boxes.length || 1));
    const newBox = {
      x: Math.round(imgW / 2 - avgW / 2),
      y: Math.round(imgH / 2 - avgH / 2),
      width: avgW || 120,
      height: avgH || 150,
    };
    const nextBoxes = [...boxes, newBox];
    setCustomCellBoxes(nextBoxes);
    setSelectedBoxIdx(nextBoxes.length - 1);
  };

  // 6. Sort Boxes top-to-bottom, left-to-right
  const handleSortBoxes = () => {
    const avgH = boxes.reduce((s, b) => s + b.height, 0) / (boxes.length || 1);
    const rowThresh = avgH * 0.55;

    const rowsGroup: Array<Array<{ x: number; y: number; width: number; height: number }>> = [];
    const sorted = [...boxes].sort((a, b) => a.y - b.y);

    sorted.forEach((b) => {
      const cy = b.y + b.height / 2;
      let placed = false;
      for (const r of rowsGroup) {
        const rowAvgY = r.reduce((sum, item) => sum + item.y + item.height / 2, 0) / r.length;
        if (Math.abs(cy - rowAvgY) < rowThresh) {
          r.push(b);
          placed = true;
          break;
        }
      }
      if (!placed) {
        rowsGroup.push([b]);
      }
    });

    rowsGroup.sort((rA, rB) => {
      const avgYA = rA.reduce((sum, i) => sum + i.y, 0) / rA.length;
      const avgYB = rB.reduce((sum, i) => sum + i.y, 0) / rB.length;
      return avgYA - avgYB;
    });

    const ordered: Array<{ x: number; y: number; width: number; height: number }> = [];
    rowsGroup.forEach((r) => {
      r.sort((a, b) => a.x - b.x);
      ordered.push(...r);
    });

    setCustomCellBoxes(ordered);
    setAutoCalculatedMsg('1번부터 차례대로 상하/좌우 순서로 자동 재정렬했습니다.');
  };

  const handleApply = () => {
    onApplySliceConfig(activeConfig);
    onClose();
  };

  if (!isOpen || !targetImage) return null;

  const currentSelectedBox = selectedBoxIdx !== null ? boxes[selectedBoxIdx] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in text-white select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-inner">
              <Grid className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                스마트 분할 간격 자동 계산 & 박스 편집기
                <span className="text-[11px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                  {imageLabel}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {imgW} × {imgH}px ({boxes.length}개 슬롯)
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                캔버스 위 박스를 직접 마우스로 드래그·크기 조절하거나, 2개가 겹친 박스는 상하로 즉시 분할할 수 있습니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Banner */}
        {autoCalculatedMsg && (
          <div className="bg-emerald-950/70 border-b border-emerald-500/40 px-4 py-2 flex items-center justify-between text-xs text-emerald-300">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              {autoCalculatedMsg}
            </span>
            <button
              onClick={() => setAutoCalculatedMsg(null)}
              className="text-emerald-400 hover:text-white font-bold ml-2 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col lg:flex-row gap-4">
          {/* Left Canvas Preview with Interactive Drag */}
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 rounded-xl p-2 border border-slate-800 overflow-hidden relative">
            <div className="relative border border-slate-800 rounded-lg overflow-hidden shadow-inner cursor-crosshair">
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                className="block max-w-full max-h-[50vh] object-contain"
              />
            </div>

            {/* Quick helper tip below canvas */}
            <div className="flex flex-wrap items-center justify-between w-full px-2 mt-2.5 text-[11px] text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded border border-cyan-400 bg-cyan-400/20 inline-block" />
                  분할 박스 ({boxes.length}개)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded border border-amber-400 bg-amber-400/30 inline-block" />
                  선택된 박스 (마우스로 이동/우하단 크기조절)
                </span>
              </div>
              <span className="text-slate-400">💡 박스를 클릭하여 선택하면 상하 분할 및 미세 조절이 가능합니다.</span>
            </div>
          </div>

          {/* Right Controls Panel */}
          <div className="w-full lg:w-84 flex flex-col gap-3 text-xs">
            {/* 1. Core AI Auto Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={runAiBlobDetection}
                className="py-2.5 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-md transition flex flex-col items-center justify-center gap-0.5 active:scale-95 border border-purple-400/40 text-[11px]"
                title="불규칙한 간격의 캐릭터 섬들을 AI 연결요소로 자동 분리합니다."
              >
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span>AI 캐릭터 개별 분리</span>
                </div>
                <span className="text-[9px] font-normal opacity-90">불규칙 간격 자동 해결</span>
              </button>

              <button
                type="button"
                onClick={() => runAutoCalculation(rows, cols)}
                className="py-2.5 px-3 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white rounded-xl font-bold shadow-md transition flex flex-col items-center justify-center gap-0.5 active:scale-95 border border-cyan-400/40 text-[11px]"
                title="투영 곡선과 빈 공간(계곡)을 측정하여 분할합니다."
              >
                <div className="flex items-center gap-1">
                  <Wand2 className="w-3.5 h-3.5 text-amber-200" />
                  <span>스마트 간격 자동 계산</span>
                </div>
                <span className="text-[9px] font-normal opacity-90">그리드 여백 & 간격</span>
              </button>
            </div>

            {/* 2. Selected Box Specific Actions (Split in half, Tighten, Delete) */}
            <div className="p-3 bg-amber-950/20 rounded-xl border border-amber-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Scissors className="w-4 h-4 text-amber-400" />
                  {selectedBoxIdx !== null ? `선택된 #${selectedBoxIdx + 1}번 박스 도구` : '박스 개별 편집 도구'}
                </span>
                {currentSelectedBox && (
                  <span className="font-mono text-[10px] text-amber-200 bg-amber-500/20 px-1.5 py-0.5 rounded">
                    {currentSelectedBox.width}×{currentSelectedBox.height}px
                  </span>
                )}
              </div>

              {selectedBoxIdx !== null && currentSelectedBox ? (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={handleSplitSelectedBox}
                      className="py-2 px-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg font-bold shadow transition flex items-center justify-center gap-1 text-[11px] active:scale-95"
                      title="한 박스 안에 위아래 2개의 캐릭터가 들어있는 경우, 상하 2개의 개별 슬롯으로 나눕니다."
                    >
                      <Scissors className="w-3.5 h-3.5 text-amber-100 shrink-0" />
                      <span>✂️ 상/하 2개 분할</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSplitLeftRightSelectedBox}
                      className="py-2 px-1 bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white rounded-lg font-bold shadow transition flex items-center justify-center gap-1 text-[11px] active:scale-95"
                      title="한 박스 안에 좌우 2개의 캐릭터가 들어있는 경우, 좌우 2개의 개별 슬롯으로 나눕니다."
                    >
                      <Scissors className="w-3.5 h-3.5 text-amber-100 shrink-0" />
                      <span>✂️ 좌/우 2개 분할</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={handleTightenSelectedBox}
                      className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold border border-slate-700 transition flex items-center justify-center gap-1 text-[11px]"
                      title="선택된 박스 안의 캐릭터에 여백을 딱 맞춥니다."
                    >
                      <Target className="w-3 h-3 text-cyan-400" />
                      <span>캐릭터 밀착</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteSelectedBox}
                      className="py-1.5 bg-red-950/50 hover:bg-red-900/60 text-red-200 rounded-lg font-semibold border border-red-500/40 transition flex items-center justify-center gap-1 text-[11px]"
                      title="이 박스를 삭제합니다."
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                      <span>박스 삭제</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  캔버스 위의 박스를 클릭하면 <strong className="text-amber-300">상하/좌우 분할</strong>, 여백 밀착, 삭제를 실행할 수 있습니다.
                </p>
              )}
            </div>

            {/* 3. Global Box Operations: Tighten All, Add Box, Sort */}
            <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-800 grid grid-cols-3 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={handleTightenAllBoxes}
                className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold border border-slate-700 transition flex items-center justify-center gap-1"
                title="모든 박스를 캐릭터 크기에 맞춰 조입니다."
              >
                <Target className="w-3 h-3 text-cyan-400" />
                <span>전체 밀착</span>
              </button>
              <button
                type="button"
                onClick={handleAddNewBox}
                className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold border border-slate-700 transition flex items-center justify-center gap-1"
                title="새 슬롯 박스를 추가합니다."
              >
                <Plus className="w-3 h-3 text-emerald-400" />
                <span>박스 추가</span>
              </button>
              <button
                type="button"
                onClick={handleSortBoxes}
                className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold border border-slate-700 transition flex items-center justify-center gap-1"
                title="1번부터 30번까지 위치 순서로 번호를 재정렬합니다."
              >
                <ArrowUpDown className="w-3 h-3 text-purple-400" />
                <span>순서 정렬</span>
              </button>
            </div>

            {/* 4. Grid Layout Switcher */}
            <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-300">그리드 규격</span>
                <span className="font-mono text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                  {rows}행 × {cols}열 ({rows * cols}칸)
                </span>
              </div>

              {/* 30-slot Grid Buttons */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSwitchGrid(6, 5)}
                  className={`py-1.5 rounded-lg font-bold border transition text-[11px] flex items-center justify-center gap-1 ${
                    rows === 6 && cols === 5
                      ? 'bg-cyan-600 text-white border-cyan-400 shadow-md ring-1 ring-cyan-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750 hover:text-white'
                  }`}
                >
                  <span>6행 × 5열 (30칸)</span>
                  {rows === 6 && cols === 5 && <Check className="w-3 h-3 text-white" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchGrid(5, 6)}
                  className={`py-1.5 rounded-lg font-bold border transition text-[11px] flex items-center justify-center gap-1 ${
                    rows === 5 && cols === 6
                      ? 'bg-cyan-600 text-white border-cyan-400 shadow-md ring-1 ring-cyan-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750 hover:text-white'
                  }`}
                >
                  <span>5행 × 6열 (30칸)</span>
                  {rows === 5 && cols === 6 && <Check className="w-3 h-3 text-white" />}
                </button>
              </div>

              {sheetMode === 15 && (
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSwitchGrid(3, 5)}
                    className={`py-1 rounded-lg font-bold border transition text-[10px] ${
                      rows === 3 && cols === 5
                        ? 'bg-cyan-600 text-white border-cyan-400 shadow'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    3행 × 5열 (15칸)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchGrid(5, 3)}
                    className={`py-1 rounded-lg font-bold border transition text-[10px] ${
                      rows === 5 && cols === 3
                        ? 'bg-cyan-600 text-white border-cyan-400 shadow'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    5행 × 3열 (15칸)
                  </button>
                </div>
              )}

              {/* Precise Step adjustment for rows/cols */}
              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-800 text-slate-400">
                <div className="flex items-center gap-1">
                  <span>행(세로):</span>
                  <button
                    type="button"
                    onClick={() => handleSwitchGrid(Math.max(1, rows - 1), cols)}
                    className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center font-bold text-xs"
                    title="행 1개 감소"
                  >-</button>
                  <span className="font-mono text-cyan-300 font-bold px-1">{rows}</span>
                  <button
                    type="button"
                    onClick={() => handleSwitchGrid(rows + 1, cols)}
                    className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center font-bold text-xs"
                    title="행 1개 증가"
                  >+</button>
                </div>

                <div className="flex items-center gap-1">
                  <span>열(가로):</span>
                  <button
                    type="button"
                    onClick={() => handleSwitchGrid(rows, Math.max(1, cols - 1))}
                    className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center font-bold text-xs"
                    title="열 1개 감소"
                  >-</button>
                  <span className="font-mono text-cyan-300 font-bold px-1">{cols}</span>
                  <button
                    type="button"
                    onClick={() => handleSwitchGrid(rows, cols + 1)}
                    className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center font-bold text-xs"
                    title="열 1개 증가"
                  >+</button>
                </div>
              </div>
            </div>

            {/* 5. Fine Offsets */}
            <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
              <span className="font-semibold text-slate-300 block">전체 위치 미세 이동</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>가로 (X)</span>
                    <span className="font-mono text-indigo-400">{offsetX}px</span>
                  </div>
                  <input
                    type="range"
                    min={-150}
                    max={150}
                    value={offsetX}
                    onChange={(e) => setOffsetX(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>세로 (Y)</span>
                    <span className="font-mono text-indigo-400">{offsetY}px</span>
                  </div>
                  <input
                    type="range"
                    min={-150}
                    max={150}
                    value={offsetY}
                    onChange={(e) => setOffsetY(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            총 <strong className="text-cyan-400 font-bold">{boxes.length}개</strong>의 스프라이트 박스가
            설정되었습니다.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-900/40 transition flex items-center gap-1.5 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>✅ 이 간격으로 분할 적용</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
