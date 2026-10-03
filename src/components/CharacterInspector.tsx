import React, { useState } from 'react';
import {
  AnchorSettings,
  PartCategory,
  SlotConfig,
} from '../types';
import { CHARACTER_DESCRIPTIONS } from '../utils/sampleData';
import {
  downloadCanvas,
  renderSinglePartTile,
} from '../utils/imageProcessor';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Download,
  RotateCcw,
  Sliders,
  Sparkles,
  Scissors,
  Check,
  Maximize2,
  Wand2,
  Layers,
  Gamepad2,
} from 'lucide-react';

interface CharacterInspectorProps {
  partCategory: PartCategory;
  activeSlotId: number | null;
  onSelectSlot: (id: number | null) => void;
  slotConfigs: SlotConfig[];
  onUpdateSlotConfig: (id: number, updater: (prev: SlotConfig) => SlotConfig) => void;
  onBatchUpdateConfigs?: (updater: (prev: SlotConfig) => SlotConfig) => void;
  onResetSlotConfig: (id: number) => void;
  onAutoAlignSingle?: (id: number, category: PartCategory) => void;
  onAutoAlignCategory?: (category: PartCategory) => void;
  onAutoAlignAllParts?: () => void;
  tiles: HTMLCanvasElement[];
  anchorSettings: AnchorSettings;
  slotCount?: number;
  onNavigateToCustomizer?: () => void;
}

export const CharacterInspector: React.FC<CharacterInspectorProps> = ({
  partCategory,
  activeSlotId,
  onSelectSlot,
  slotConfigs,
  onUpdateSlotConfig,
  onBatchUpdateConfigs,
  onResetSlotConfig,
  onAutoAlignSingle,
  onAutoAlignCategory,
  onAutoAlignAllParts,
  tiles,
  anchorSettings,
  slotCount = 15,
  onNavigateToCustomizer,
}) => {
  const [inspectorMode, setInspectorMode] = useState<'single' | 'batch'>('single');
  const [batchCategory, setBatchCategory] = useState<PartCategory>(partCategory);
  const [nudgeStep, setNudgeStep] = useState<number>(2);
  const [batchStep, setBatchStep] = useState<number>(2);

  const totalSlots = slotCount || tiles.length || 15;

  // Keep batchCategory synced when view changes
  React.useEffect(() => {
    setBatchCategory(partCategory);
  }, [partCategory]);

  const currentId = activeSlotId || 1;
  const currentConfig = slotConfigs.find((s) => s.id === currentId) || {
    id: currentId,
    name: `캐릭터 #${currentId}`,
    face: { x: 0, y: 0, scale: 1 },
    hair: { x: 0, y: 0, scale: 1 },
    body: { x: 0, y: 0, scale: 1 },
    leg: { x: 0, y: 0, scale: 1 },
    outfit: { x: 0, y: 0, scale: 1 },
    fullbody: { x: 0, y: 0, scale: 1 },
    head: { x: 0, y: 0, scale: 1 },
    global: { x: 0, y: 0, scale: 1 },
    enabled: true,
  };

  const partOffset =
    partCategory === 'head'
      ? currentConfig.hair || currentConfig.head || { x: 0, y: 0, scale: 1 }
      : partCategory === 'outfit'
      ? currentConfig.outfit || currentConfig.body || { x: 0, y: 0, scale: 1 }
      : currentConfig[partCategory] || { x: 0, y: 0, scale: 1 };
  const currentTile = tiles[currentId - 1] || null;
  const desc = CHARACTER_DESCRIPTIONS.find((d) => d.id === currentId);

  // Single tile preview canvas
  const previewRef = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || !currentTile) return;

    const rendered = renderSinglePartTile(currentTile, partOffset, 320);
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw dark background & grid
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 320, 320);

    // Draw Part first
    ctx.drawImage(rendered, 0, 0, 320, 320);

    // Draw high-visibility vertical center line (세로 중심선 - 듀얼 스트로크)
    ctx.save();
    // 1. Dark outer border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(160, 0);
    ctx.lineTo(160, 320);
    ctx.stroke();

    // 2. Vivid neon inner core
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(160, 0);
    ctx.lineTo(160, 320);
    ctx.stroke();

    // Horizontal faint helper
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, 160);
    ctx.lineTo(320, 160);
    ctx.stroke();
    ctx.restore();

    // Draw specific Anchor marker
    const cx = 160;
    let anchorY = 160;
    let strokeColor = '#f97316';

    if (partCategory === 'face') {
      anchorY = 160 + (anchorSettings.faceNoseY ?? anchorSettings.headNoseY ?? 10) * (320 / 400);
      strokeColor = '#f97316'; // Orange Nose for Face
    } else if (partCategory === 'hair' || partCategory === 'head') {
      anchorY = 160 + (anchorSettings.hairNoseY ?? anchorSettings.headNoseY ?? 10) * (320 / 400);
      strokeColor = '#c084fc'; // Purple Nose for Hair
    } else if (partCategory === 'body') {
      anchorY = 160 + anchorSettings.bodyNeckY * (320 / 400);
      strokeColor = '#38bdf8'; // Blue Neck
    } else if (partCategory === 'outfit') {
      anchorY = 160 + (anchorSettings.outfitNeckY ?? anchorSettings.bodyNeckY ?? -95) * (320 / 400);
      strokeColor = '#38bdf8'; // Blue Neck

      // Draw pink waist guide for outfit
      ctx.save();
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, 160 + 10 * (320 / 400));
      ctx.lineTo(320, 160 + 10 * (320 / 400));
      ctx.stroke();
      ctx.restore();
    } else if (partCategory === 'fullbody') {
      anchorY = 160 + (anchorSettings.fullbodyFootY ?? anchorSettings.legFootY ?? 130) * (320 / 400);
      strokeColor = '#eab308'; // Amber Ground Line

      // Draw head top and waist guidelines
      ctx.save();
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, 160 - 130 * (320 / 400));
      ctx.lineTo(320, 160 - 130 * (320 / 400));
      ctx.stroke();
      ctx.restore();
    } else {
      anchorY = 160 + anchorSettings.legFootY * (320 / 400);
      strokeColor = '#eab308'; // Amber Foot
    }

    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(0, anchorY);
    ctx.lineTo(320, anchorY);
    ctx.stroke();

    ctx.fillStyle = strokeColor;
    ctx.beginPath();
    ctx.arc(cx, anchorY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, [currentTile, partOffset, partCategory, anchorSettings]);

  const handleNudge = (dx: number, dy: number) => {
    onUpdateSlotConfig(currentId, (prev) => ({
      ...prev,
      [partCategory]: {
        ...prev[partCategory],
        x: prev[partCategory].x + dx,
        y: prev[partCategory].y + dy,
      },
    }));
  };

  // Batch actions on 15 items
  const handleBatchScaleDelta = (delta: number) => {
    if (!onBatchUpdateConfigs) return;
    onBatchUpdateConfigs((prev) => {
      const current = prev[batchCategory];
      const newScale = Math.max(0.3, Math.min(2.0, Number((current.scale + delta).toFixed(2))));
      return {
        ...prev,
        [batchCategory]: {
          ...current,
          scale: newScale,
        },
      };
    });
  };

  const handleBatchScaleExact = (exactScale: number) => {
    if (!onBatchUpdateConfigs) return;
    onBatchUpdateConfigs((prev) => ({
      ...prev,
      [batchCategory]: {
        ...prev[batchCategory],
        scale: exactScale,
      },
    }));
  };

  const handleBatchNudgePos = (dx: number, dy: number) => {
    if (!onBatchUpdateConfigs) return;
    onBatchUpdateConfigs((prev) => ({
      ...prev,
      [batchCategory]: {
        ...prev[batchCategory],
        x: prev[batchCategory].x + dx,
        y: prev[batchCategory].y + dy,
      },
    }));
  };

  const handleBatchResetPos = () => {
    if (!onBatchUpdateConfigs) return;
    onBatchUpdateConfigs((prev) => ({
      ...prev,
      [batchCategory]: {
        ...prev[batchCategory],
        x: 0,
        y: 0,
      },
    }));
  };

  const handleBatchResetAll = () => {
    if (!onBatchUpdateConfigs) return;
    onBatchUpdateConfigs((prev) => ({
      ...prev,
      [batchCategory]: {
        x: 0,
        y: 0,
        scale: 1,
      },
    }));
  };

  const handleDownloadSinglePng = () => {
    if (!currentTile) return;
    const canvas = renderSinglePartTile(currentTile, partOffset, 512);
    const prefix =
      partCategory === 'face'
        ? 'face'
        : partCategory === 'hair' || partCategory === 'head'
        ? 'hair'
        : partCategory === 'body'
        ? 'top'
        : partCategory === 'outfit'
        ? 'outfit'
        : partCategory === 'fullbody'
        ? 'character'
        : 'bottom';
    downloadCanvas(canvas, `${prefix}_${String(currentId).padStart(2, '0')}.png`);
  };

  // Calculate average scale for batchCategory
  const activeConfigs = slotConfigs.slice(0, totalSlots);
  const avgScale = Math.round(
    (activeConfigs.reduce((acc, cur) => acc + cur[batchCategory].scale, 0) /
      (activeConfigs.length || 1)) *
      100
  );

  return (
    <div className="w-80 border-l border-slate-800 bg-slate-900/95 flex flex-col h-full overflow-hidden text-white select-none">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            {inspectorMode === 'single'
              ? `슬롯 #${currentId} 정렬 인스펙터`
              : `⚡ ${totalSlots}개 일괄 조절 (얼굴/헤어/상의/하의)`}
          </span>
          <p className="text-[10px] text-slate-400">
            {inspectorMode === 'single'
              ? '개별 캐릭터의 오프셋 및 크기를 정밀 조정'
              : `${totalSlots}개 스프라이트 전체의 크기와 위치를 한 번에 조정`}
          </p>
        </div>

        {inspectorMode === 'single' && (
          <button
            onClick={handleDownloadSinglePng}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
            title="이 파트만 단독 PNG로 다운로드"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Mode Switcher Tabs: Single vs Batch */}
      <div className="flex border-b border-slate-800 bg-slate-950/70 p-1 gap-1">
        <button
          onClick={() => setInspectorMode('single')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
            inspectorMode === 'single'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          단일 #{currentId} 조절
        </button>
        <button
          onClick={() => setInspectorMode('batch')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
            inspectorMode === 'batch'
              ? 'bg-purple-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          ⚡ {totalSlots}개 일괄 조절
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 custom-scrollbar text-xs">
        {inspectorMode === 'single' ? (
          /* ================= SINGLE SLOT MODE ================= */
          <>
            {/* Quick Return to Customizer Button */}
            {onNavigateToCustomizer && (
              <button
                type="button"
                onClick={onNavigateToCustomizer}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 active:scale-95 border border-indigo-400/40"
                title="캐릭터 선택창으로 이동하여 상의와의 결합 상태를 바로 확인합니다."
              >
                <Gamepad2 className="w-4 h-4 text-pink-200" />
                <span>🎮 캐릭터 선택창에서 상의 결합 확인</span>
              </button>
            )}

            {/* Slot selector grid */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                {totalSlots}개 슬롯 빠른 선택
              </span>
              <div className="grid grid-cols-5 gap-1 max-h-40 overflow-y-auto custom-scrollbar p-0.5">
                {Array.from({ length: totalSlots }, (_, i) => i + 1).map((id) => (
                  <button
                    key={id}
                    onClick={() => onSelectSlot(id)}
                    className={`py-1 text-xs font-semibold rounded transition ${
                      currentId === id
                        ? 'bg-indigo-600 text-white shadow'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    #{id}
                  </button>
                ))}
              </div>
            </div>

            {/* Single Part Canvas Preview */}
            <div className="flex flex-col items-center">
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black/60 shadow-lg">
                <canvas ref={previewRef} width={320} height={320} className="w-44 h-44 block" />
                <div className="absolute top-1.5 left-2 text-[10px] font-mono text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded">
                  #{currentId}{' '}
                  {partCategory === 'face'
                    ? desc?.face
                    : partCategory === 'hair' || partCategory === 'head'
                    ? desc?.hair
                    : partCategory === 'body'
                    ? desc?.top
                    : partCategory === 'outfit'
                    ? `${desc?.top || ''} + ${desc?.bottom || ''}`
                    : partCategory === 'fullbody'
                    ? `전신 #${currentId} (${desc?.face || ''}, ${desc?.top || ''})`
                    : desc?.bottom}
                </div>
              </div>
            </div>

            {/* Single Slot Auto Align Button */}
            <button
              type="button"
              onClick={() => onAutoAlignSingle && onAutoAlignSingle(currentId, partCategory)}
              className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 active:scale-95 border border-emerald-400/40"
              title={`이 슬롯의 스프라이트를 분석하여 (${partCategory === 'face' ? '코 중심 사각형 중앙' : partCategory === 'hair' ? '코 기준점 결합' : partCategory === 'body' || partCategory === 'outfit' ? '목깃 상단' : partCategory === 'fullbody' ? '발끝 바닥 기준선' : '허리선'})에 자동 배치합니다`}
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-200" />
              <span>
                #{currentId} 스마트 자동 정렬 (
                {partCategory === 'face'
                  ? '코 중심'
                  : partCategory === 'hair' || partCategory === 'head'
                  ? '헤어 결합'
                  : partCategory === 'body' || partCategory === 'outfit'
                  ? '목끝 상단'
                  : partCategory === 'fullbody'
                  ? '발끝 바닥선'
                  : '허리선'}
                )
              </span>
            </button>

            {/* D-Pad Nudge Controls */}
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-300">위치 미세 이동 (Nudge)</span>
                {/* Step size */}
                <div className="flex items-center gap-1 bg-slate-800 rounded p-0.5 border border-slate-700">
                  {[1, 2, 5, 10].map((step) => (
                    <button
                      key={step}
                      onClick={() => setNudgeStep(step)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                        nudgeStep === step
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {step}px
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => handleNudge(0, -nudgeStep)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 border border-slate-700 transition"
                  title="위로 이동"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleNudge(-nudgeStep, 0)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 border border-slate-700 transition"
                    title="왼쪽으로 이동"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="w-14 text-center font-mono text-[11px] text-slate-300">
                    {partOffset.x},{partOffset.y}
                  </div>
                  <button
                    onClick={() => handleNudge(nudgeStep, 0)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 border border-slate-700 transition"
                    title="오른쪽으로 이동"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => handleNudge(0, nudgeStep)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 border border-slate-700 transition"
                  title="아래로 이동"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sliders: X, Y, Scale */}
            <div className="space-y-3 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>가로 위치 (X)</span>
                  <span className="font-mono text-indigo-400">{partOffset.x}px</span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={partOffset.x}
                  onChange={(e) =>
                    onUpdateSlotConfig(currentId, (prev) => ({
                      ...prev,
                      [partCategory]: {
                        ...prev[partCategory],
                        x: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>세로 위치 (Y)</span>
                  <span className="font-mono text-indigo-400">{partOffset.y}px</span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={partOffset.y}
                  onChange={(e) =>
                    onUpdateSlotConfig(currentId, (prev) => ({
                      ...prev,
                      [partCategory]: {
                        ...prev[partCategory],
                        y: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>크기 비율 (Scale)</span>
                  <span className="font-mono text-indigo-400">
                    {Math.round(partOffset.scale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={150}
                  value={Math.round(partOffset.scale * 100)}
                  onChange={(e) =>
                    onUpdateSlotConfig(currentId, (prev) => ({
                      ...prev,
                      [partCategory]: {
                        ...prev[partCategory],
                        scale: Number(e.target.value) / 100,
                      },
                    }))
                  }
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Reset Button */}
            <button
              onClick={() => onResetSlotConfig(currentId)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>#{currentId} 오프셋 초기화</span>
            </button>
          </>
        ) : (
          /* ================= BATCH MODE ================= */
          <>
            {/* Part Category Selector (얼굴 / 헤어 / 상의 / 하의 / 상의+하의 선택) */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                일괄 조절할 대상 파트 선택
              </span>
              <div className="grid grid-cols-5 gap-1">
                <button
                  onClick={() => setBatchCategory('face')}
                  className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition flex flex-col items-center gap-0.5 border ${
                    batchCategory === 'face'
                      ? 'bg-orange-500/20 text-orange-300 border-orange-500/50 shadow'
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
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow'
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
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow'
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
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow'
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
                      ? 'bg-pink-500/20 text-pink-300 border-pink-500/50 shadow'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                  title="상의+하의 일체형 의상 30종 일괄 조절"
                >
                  <span className="text-sm">👗</span>
                  <span>상의+하의</span>
                </button>

                <button
                  onClick={() => setBatchCategory('fullbody')}
                  className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition flex flex-col items-center gap-0.5 border ${
                    batchCategory === 'fullbody'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                  title="얼굴과 몸이 합쳐진 전신 캐릭터 30종 일괄 조절"
                >
                  <span className="text-sm">🧍</span>
                  <span>전신</span>
                </button>
              </div>
            </div>

            {/* AI Smart Auto-Align Section */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
                  <Wand2 className="w-4 h-4 text-emerald-400" />
                  스마트 AI 특징점 자동 정렬
                </span>
                <span className="text-[10px] text-emerald-300/80 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 font-semibold">
                  원클릭 감지
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                얼굴은 코 중심을 정중앙에, 상의는 목깃을 맨 위에, 하의는 허리를 결합선에 맞추어 자동으로 배치합니다.
              </p>
              <div className="flex flex-col gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => onAutoAlignCategory && onAutoAlignCategory(batchCategory)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow transition flex items-center justify-center gap-1.5 active:scale-95 border border-emerald-400/40"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span>
                    {batchCategory === 'face'
                      ? '얼굴'
                      : batchCategory === 'hair'
                      ? '헤어'
                      : batchCategory === 'body'
                      ? '상의'
                      : batchCategory === 'outfit'
                      ? '상의+하의 의상'
                      : '하의'}{' '}
                    {totalSlots}개 전체 자동 정렬
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onAutoAlignAllParts && onAutoAlignAllParts()}
                  className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-lg shadow transition flex items-center justify-center gap-1.5 active:scale-95 border border-purple-400/40"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-200" />
                  <span>4개 파트 ({totalSlots * 4}개) 원클릭 전체 결합</span>
                </button>
              </div>
            </div>

            {/* 1. Batch Scale Controls (일괄 크기 변경) */}
            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/50 space-y-3">
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
              <div className="flex items-center gap-1 pt-1">
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
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3">
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
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 border border-slate-700 transition flex items-center gap-1 font-semibold"
                  title="전체 위로 이동"
                >
                  <ArrowUp className="w-4 h-4 text-indigo-400" />
                  <span>↑ 위로 ({batchStep}px)</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBatchNudgePos(-batchStep, 0)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 border border-slate-700 transition flex items-center gap-1 font-semibold"
                    title="전체 왼쪽으로 이동"
                  >
                    <ArrowLeft className="w-4 h-4 text-indigo-400" />
                    <span>← 좌</span>
                  </button>

                  <button
                    onClick={handleBatchResetPos}
                    className="px-2.5 py-2 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white border border-slate-700 text-[10px]"
                    title="전체 위치를 0,0 원점으로 초기화"
                  >
                    0,0 리셋
                  </button>

                  <button
                    onClick={() => handleBatchNudgePos(batchStep, 0)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 border border-slate-700 transition flex items-center gap-1 font-semibold"
                    title="전체 오른쪽으로 이동"
                  >
                    <span>우 →</span>
                    <ArrowRight className="w-4 h-4 text-indigo-400" />
                  </button>
                </div>

                <button
                  onClick={() => handleBatchNudgePos(0, batchStep)}
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 border border-slate-700 transition flex items-center gap-1 font-semibold"
                  title="전체 아래로 이동"
                >
                  <ArrowDown className="w-4 h-4 text-indigo-400" />
                  <span>↓ 아래로 ({batchStep}px)</span>
                </button>
              </div>
            </div>

            {/* 3. Reset All for Selected Category */}
            <div className="pt-2">
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
          </>
        )}
      </div>
    </div>
  );
};
