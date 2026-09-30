import React, { useEffect, useRef, useState } from 'react';
import {
  calculateSlotBoxes,
  renderCompositeCanvas,
  SlotBox,
} from '../utils/imageProcessor';
import { GuideLineSettings, ProcessingSettings, SelectedPart, SlotConfig } from '../types';
import {
  Eye,
  EyeOff,
  Move,
  Scissors,
  Sparkles,
} from 'lucide-react';

interface CanvasStageProps {
  headTiles: HTMLCanvasElement[];
  bodyTiles: HTMLCanvasElement[];
  legTiles: HTMLCanvasElement[];
  slotConfigs: SlotConfig[];
  guideImage: HTMLImageElement | null;
  guideSettings: GuideLineSettings;
  processingSettings: ProcessingSettings;
  activeSlotId: number | null;
  onSelectSlot: (id: number | null) => void;
  selectedPart: SelectedPart;
  onSelectPart: (part: SelectedPart) => void;
  onUpdateSlotConfig: (id: number, updater: (prev: SlotConfig) => SlotConfig) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onUpdateGuideSettings: (settings: Partial<GuideLineSettings>) => void;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({
  headTiles,
  bodyTiles,
  legTiles,
  slotConfigs,
  guideImage,
  guideSettings,
  processingSettings,
  activeSlotId,
  onSelectSlot,
  selectedPart,
  onSelectPart,
  onUpdateSlotConfig,
  zoom,
  onZoomChange,
  onUpdateGuideSettings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoverSlotId, setHoverSlotId] = useState<number | null>(null);

  // Mouse drag moving of selected part
  const [isDraggingPart, setIsDraggingPart] = useState(false);
  const [partDragStart, setPartDragStart] = useState({ x: 0, y: 0 });

  const canvasWidth = guideImage?.naturalWidth || 2400;
  const canvasHeight = guideImage?.naturalHeight || 1700;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
    }

    renderCompositeCanvas(
      canvas,
      headTiles,
      bodyTiles,
      legTiles,
      slotConfigs,
      guideImage,
      guideSettings,
      processingSettings,
      activeSlotId,
      hoverSlotId
    );
  }, [
    headTiles,
    bodyTiles,
    legTiles,
    slotConfigs,
    guideImage,
    guideSettings,
    processingSettings,
    activeSlotId,
    hoverSlotId,
    canvasWidth,
    canvasHeight,
  ]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2 || e.shiftKey) {
      e.preventDefault();
      setIsPanning(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (e.button === 0 && activeSlotId) {
      // Start dragging active part if clicked inside active slot
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;

      const boxes = calculateSlotBoxes(
        canvas.width,
        canvas.height,
        !!guideImage,
        guideSettings.eyeLineYOffset || 0,
        guideSettings.footLineYOffset || 0
      );
      const activeBox = boxes.find((b) => b.id === activeSlotId);

      if (
        activeBox &&
        clickX >= activeBox.x &&
        clickX <= activeBox.x + activeBox.width &&
        clickY >= activeBox.y &&
        clickY <= activeBox.y + activeBox.height
      ) {
        setIsDraggingPart(true);
        setPartDragStart({ x: e.clientX, y: e.clientY });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPan({
        x: pan.x + (e.clientX - dragStart.x),
        y: pan.y + (e.clientY - dragStart.y),
      });
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (isDraggingPart && activeSlotId) {
      const dx = (e.clientX - partDragStart.x) / zoom;
      const dy = (e.clientY - partDragStart.y) / zoom;

      if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) {
        onUpdateSlotConfig(activeSlotId, (p) => {
          if (selectedPart === 'global') {
            return {
              ...p,
              global: {
                ...p.global,
                x: Math.round(p.global.x + dx),
                y: Math.round(p.global.y + dy),
              },
            };
          }
          return {
            ...p,
            [selectedPart]: {
              ...p[selectedPart],
              x: Math.round(p[selectedPart].x + dx),
              y: Math.round(p[selectedPart].y + dy),
            },
          };
        });
        setPartDragStart({ x: e.clientX, y: e.clientY });
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const boxes = calculateSlotBoxes(
      canvas.width,
      canvas.height,
      !!guideImage,
      guideSettings.eyeLineYOffset || 0,
      guideSettings.footLineYOffset || 0
    );
    const box = boxes.find(
      (b) =>
        mouseX >= b.x &&
        mouseX <= b.x + b.width &&
        mouseY >= b.y &&
        mouseY <= b.y + b.height
    );

    setHoverSlotId(box ? box.id : null);
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDraggingPart(false);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const boxes = calculateSlotBoxes(
      canvas.width,
      canvas.height,
      !!guideImage,
      guideSettings.eyeLineYOffset || 0,
      guideSettings.footLineYOffset || 0
    );
    const clickedBox = boxes.find(
      (b) =>
        clickX >= b.x &&
        clickX <= b.x + b.width &&
        clickY >= b.y &&
        clickY <= b.y + b.height
    );

    if (clickedBox) {
      onSelectSlot(clickedBox.id);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      onZoomChange(Math.min(2.5, Math.max(0.2, zoom + delta)));
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className="relative flex-1 h-full w-full bg-slate-950 overflow-hidden flex items-center justify-center select-none"
    >
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #64748b 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Floating Canvas Dock */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-xl">
        {/* Guide background toggle */}
        <button
          onClick={() =>
            onUpdateGuideSettings({
              showGuideBackground: !guideSettings.showGuideBackground,
            })
          }
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition ${
            guideSettings.showGuideBackground
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="4번 스크린샷 가이드 양식 배경을 끄거나 켭니다"
        >
          {guideSettings.showGuideBackground ? (
            <Eye className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <EyeOff className="w-3.5 h-3.5" />
          )}
          <span>가이드 배경</span>
        </button>

        {/* Eye line & foot line height adjusters */}
        <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[11px] text-blue-300 font-semibold">눈선:</span>
          <button
            onClick={() =>
              onUpdateGuideSettings({
                eyeLineYOffset: (guideSettings.eyeLineYOffset || 0) - 2,
              })
            }
            className="w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded text-xs"
            title="눈선 위로 이동"
          >
            ▲
          </button>
          <button
            onClick={() =>
              onUpdateGuideSettings({
                eyeLineYOffset: (guideSettings.eyeLineYOffset || 0) + 2,
              })
            }
            className="w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded text-xs"
            title="눈선 아래로 이동"
          >
            ▼
          </button>
        </div>

        <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-[11px] text-amber-300 font-semibold">발선:</span>
          <button
            onClick={() =>
              onUpdateGuideSettings({
                footLineYOffset: (guideSettings.footLineYOffset || 0) - 2,
              })
            }
            className="w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded text-xs"
            title="발끝선 위로 이동"
          >
            ▲
          </button>
          <button
            onClick={() =>
              onUpdateGuideSettings({
                footLineYOffset: (guideSettings.footLineYOffset || 0) + 2,
              })
            }
            className="w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded text-xs"
            title="발끝선 아래로 이동"
          >
            ▼
          </button>
        </div>

        {/* Cut line toggle */}
        <button
          onClick={() =>
            onUpdateGuideSettings({
              showCutMarks: !guideSettings.showCutMarks,
            })
          }
          className={`flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-lg transition ${
            guideSettings.showCutMarks
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="재단 칼선 표시"
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>칼선</span>
        </button>

        {/* Canvas Background switch */}
        <select
          value={guideSettings.backgroundColor}
          onChange={(e) =>
            onUpdateGuideSettings({
              backgroundColor: e.target.value as any,
            })
          }
          className="bg-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1 border border-slate-700 focus:outline-none"
        >
          <option value="white">흰색</option>
          <option value="transparent">투명 PNG</option>
          <option value="grid">체크</option>
          <option value="dark">다크</option>
        </select>
      </div>

      {/* Floating Status & Instruction badge at bottom */}
      <div className="absolute bottom-3 left-3 z-20 pointer-events-none flex items-center gap-2 text-xs text-slate-300 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 shadow-md">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>
          {activeSlotId ? (
            <>
              선택: <strong>#{activeSlotId}번</strong> | 현재 이동 대상:{' '}
              <strong className="text-indigo-400">
                {selectedPart === 'global'
                  ? '전신'
                  : selectedPart === 'head'
                  ? '머리'
                  : selectedPart === 'body'
                  ? '상의'
                  : '하의'}
              </strong>{' '}
              (방향키 또는 마우스 드래그로 이동 가능)
            </>
          ) : (
            '조정할 캐릭터(1~15)를 캔버스에서 클릭하세요'
          )}
        </span>
      </div>

      {/* Canvas */}
      <div
        className="transition-transform duration-75 cursor-crosshair shadow-2xl relative"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          className="rounded-lg shadow-2xl max-w-none block border border-slate-700/50"
          style={{ maxWidth: 'none' }}
        />
      </div>
    </div>
  );
};
