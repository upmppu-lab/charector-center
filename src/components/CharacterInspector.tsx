import React from 'react';
import { CHARACTER_DESCRIPTIONS } from '../utils/sampleData';
import { GuideLineSettings, ProcessingSettings, SelectedPart, SlotConfig } from '../types';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  Move,
  RotateCcw,
  Scissors,
  Shirt,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { renderSingleCharacter } from '../utils/imageProcessor';

interface CharacterInspectorProps {
  activeSlotId: number | null;
  onSelectSlot: (id: number | null) => void;
  selectedPart: SelectedPart;
  onSelectPart: (part: SelectedPart) => void;
  slotConfigs: SlotConfig[];
  onUpdateSlotConfig: (id: number, updater: (prev: SlotConfig) => SlotConfig) => void;
  onBatchUpdateConfigs: (updater: (prev: SlotConfig) => SlotConfig) => void;
  onResetSlotConfig: (id: number) => void;
  onResetAllConfigs: () => void;
  headTiles: HTMLCanvasElement[];
  bodyTiles: HTMLCanvasElement[];
  legTiles: HTMLCanvasElement[];
  guideSettings: GuideLineSettings;
  onUpdateGuideSettings: (settings: Partial<GuideLineSettings>) => void;
  processingSettings: ProcessingSettings;
  onUpdateProcessingSettings: (settings: Partial<ProcessingSettings>) => void;
  onReSliceSheets: () => void;
}

export const CharacterInspector: React.FC<CharacterInspectorProps> = ({
  activeSlotId,
  onSelectSlot,
  selectedPart,
  onSelectPart,
  slotConfigs,
  onUpdateSlotConfig,
  onBatchUpdateConfigs,
  onResetSlotConfig,
  onResetAllConfigs,
  headTiles,
  bodyTiles,
  legTiles,
  guideSettings,
  onUpdateGuideSettings,
  processingSettings,
  onUpdateProcessingSettings,
  onReSliceSheets,
}) => {
  const [activeTab, setActiveTab] = React.useState<'single' | 'guide' | 'batch'>('single');
  const [nudgeStep, setNudgeStep] = React.useState<number>(2);

  const currentId = activeSlotId || 1;
  const currentConfig = slotConfigs.find((s) => s.id === currentId) || {
    id: currentId,
    name: `캐릭터 #${currentId}`,
    head: { x: 0, y: 0, scale: 1 },
    body: { x: 0, y: 0, scale: 1 },
    leg: { x: 0, y: 0, scale: 1 },
    global: { x: 0, y: 0, scale: 1 },
    enabled: true,
  };

  const desc = CHARACTER_DESCRIPTIONS.find((d) => d.id === currentId);

  // Render preview for current single character
  const previewCanvasRef = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const head = headTiles[currentId - 1] || null;
    const body = bodyTiles[currentId - 1] || null;
    const leg = legTiles[currentId - 1] || null;

    const charCanvas = renderSingleCharacter(
      head,
      body,
      leg,
      currentConfig,
      360,
      processingSettings.layerOrder
    );

    canvas.width = charCanvas.width;
    canvas.height = charCanvas.height;
    ctx.drawImage(charCanvas, 0, 0);
  }, [currentId, currentConfig, headTiles, bodyTiles, legTiles, processingSettings.layerOrder]);

  // Helper for nudging a part
  const nudgePart = (part: SelectedPart, dx: number, dy: number) => {
    onUpdateSlotConfig(currentId, (p) => {
      if (part === 'global') {
        return {
          ...p,
          global: { ...p.global, x: p.global.x + dx, y: p.global.y + dy },
        };
      }
      return {
        ...p,
        [part]: { ...p[part], x: p[part].x + dx, y: p[part].y + dy },
      };
    });
  };

  return (
    <aside className="w-84 sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full overflow-hidden text-slate-200 select-none shadow-xl shrink-0">
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-800 bg-slate-950/50 p-1">
        <button
          onClick={() => setActiveTab('single')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'single'
              ? 'bg-slate-800 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-3.5 h-3.5 text-indigo-400" />
          <span>파츠별 이동/조절</span>
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'guide'
              ? 'bg-slate-800 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scissors className="w-3.5 h-3.5 text-amber-400" />
          <span>가이드선 이동 & 재단</span>
        </button>

        <button
          onClick={() => setActiveTab('batch')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'batch'
              ? 'bg-slate-800 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-sky-400" />
          <span>일괄 조정</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* ===================== TAB 1: INDIVIDUAL FINE-TUNING ===================== */}
        {activeTab === 'single' && (
          <div className="space-y-4">
            {/* Character Selector & Reset */}
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">
                  선택된 캐릭터: #{currentId}번
                </span>
                <button
                  onClick={() => onResetSlotConfig(currentId)}
                  className="text-[11px] text-slate-400 hover:text-indigo-400 flex items-center gap-1"
                  title="현재 캐릭터 위치 초기화"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>초기화</span>
                </button>
              </div>

              <div className="grid grid-cols-5 gap-1">
                {Array.from({ length: 15 }, (_, i) => i + 1).map((id) => (
                  <button
                    key={id}
                    onClick={() => onSelectSlot(id)}
                    className={`py-1 text-xs font-bold rounded-lg border transition ${
                      currentId === id
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    #{id}
                  </button>
                ))}
              </div>

              {desc && (
                <div className="text-[11px] text-slate-400 bg-slate-900/70 p-2 rounded-lg border border-slate-800 space-y-0.5">
                  <div className="font-semibold text-slate-200">
                    #{desc.id} {desc.hair}
                  </div>
                  <div className="text-sky-300">상의: {desc.top}</div>
                  <div className="text-pink-300">하의: {desc.bottom}</div>
                </div>
              )}
            </div>

            {/* PART SELECTOR FOR ARROW KEYS & DIRECT D-PAD */}
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5 text-indigo-400" />
                  이동할 파츠 선택
                </span>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <span>이동 단위:</span>
                  {[1, 3, 5, 10].map((step) => (
                    <button
                      key={step}
                      onClick={() => setNudgeStep(step)}
                      className={`px-1.5 py-0.5 rounded font-mono ${
                        nudgeStep === step
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {step}px
                    </button>
                  ))}
                </div>
              </div>

              {/* 4 Part Buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => onSelectPart('global')}
                  className={`py-2 px-1 text-xs font-bold rounded-lg border transition text-center ${
                    selectedPart === 'global'
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow'
                      : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  전신
                </button>
                <button
                  onClick={() => onSelectPart('head')}
                  className={`py-2 px-1 text-xs font-bold rounded-lg border transition text-center ${
                    selectedPart === 'head'
                      ? 'bg-purple-600 text-white border-purple-400 shadow'
                      : 'bg-slate-800/90 text-purple-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  💜 머리
                </button>
                <button
                  onClick={() => onSelectPart('body')}
                  className={`py-2 px-1 text-xs font-bold rounded-lg border transition text-center ${
                    selectedPart === 'body'
                      ? 'bg-sky-600 text-white border-sky-400 shadow'
                      : 'bg-slate-800/90 text-sky-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  👕 상의
                </button>
                <button
                  onClick={() => onSelectPart('leg')}
                  className={`py-2 px-1 text-xs font-bold rounded-lg border transition text-center ${
                    selectedPart === 'leg'
                      ? 'bg-pink-600 text-white border-pink-400 shadow'
                      : 'bg-slate-800/90 text-pink-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  👖 하의
                </button>
              </div>

              {/* D-Pad Buttons for immediate visible movement! */}
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/90 flex flex-col items-center gap-1.5">
                <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between w-full px-1">
                  <span>
                    현재 조작 대상:{' '}
                    <strong className="text-white">
                      {selectedPart === 'global'
                        ? '전신(전체)'
                        : selectedPart === 'head'
                        ? '머리/헤어'
                        : selectedPart === 'body'
                        ? '상의/의상'
                        : '하의/스커트'}
                    </strong>
                  </span>
                  <span className="font-mono text-xs text-indigo-400">
                    X:{' '}
                    {selectedPart === 'global'
                      ? currentConfig.global.x
                      : currentConfig[selectedPart].x}
                    px, Y:{' '}
                    {selectedPart === 'global'
                      ? currentConfig.global.y
                      : currentConfig[selectedPart].y}
                    px
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1 my-1">
                  <button
                    onClick={() => nudgePart(selectedPart, 0, -nudgeStep)}
                    className="p-2.5 bg-slate-800 hover:bg-indigo-600 text-white rounded-lg border border-slate-700 hover:border-indigo-500 shadow transition active:scale-95"
                    title={`위로 ${nudgeStep}px 이동`}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => nudgePart(selectedPart, -nudgeStep, 0)}
                      className="p-2.5 bg-slate-800 hover:bg-indigo-600 text-white rounded-lg border border-slate-700 hover:border-indigo-500 shadow transition active:scale-95"
                      title={`왼쪽으로 ${nudgeStep}px 이동`}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() =>
                        onUpdateSlotConfig(currentId, (p) => {
                          if (selectedPart === 'global') {
                            return { ...p, global: { ...p.global, x: 0, y: 0 } };
                          }
                          return {
                            ...p,
                            [selectedPart]: { ...p[selectedPart], x: 0, y: 0 },
                          };
                        })
                      }
                      className="px-2 py-1 text-[10px] font-bold bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-700"
                      title="중앙 원점 복귀"
                    >
                      (0,0)
                    </button>

                    <button
                      onClick={() => nudgePart(selectedPart, nudgeStep, 0)}
                      className="p-2.5 bg-slate-800 hover:bg-indigo-600 text-white rounded-lg border border-slate-700 hover:border-indigo-500 shadow transition active:scale-95"
                      title={`오른쪽으로 ${nudgeStep}px 이동`}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => nudgePart(selectedPart, 0, nudgeStep)}
                    className="p-2.5 bg-slate-800 hover:bg-indigo-600 text-white rounded-lg border border-slate-700 hover:border-indigo-500 shadow transition active:scale-95"
                    title={`아래로 ${nudgeStep}px 이동`}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 text-center">
                  키보드 방향키(↑ ↓ ← →)로도 실시간 이동 가능 (Shift 누르면 5배)
                </p>
              </div>
            </div>

            {/* DETAILED SLIDERS FOR BODY (상의), HEAD (머리), LEG (하의) */}
            <div className="space-y-3">
              {/* 상의 (Top) Dedicated Controls */}
              <div className="bg-slate-800/40 p-3 rounded-xl border border-sky-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    👕 상의(의상) 상세 슬라이더
                  </span>
                  <span className="text-[11px] font-mono text-sky-400">
                    X:{currentConfig.body.x} / Y:{currentConfig.body.y}px
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">
                      좌우 X 위치
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={currentConfig.body.x}
                      onChange={(e) =>
                        onUpdateSlotConfig(currentId, (p) => ({
                          ...p,
                          body: { ...p.body, x: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">
                      상하 Y 위치 (높낮이)
                    </label>
                    <input
                      type="range"
                      min="-120"
                      max="120"
                      value={currentConfig.body.y}
                      onChange={(e) =>
                        onUpdateSlotConfig(currentId, (p) => ({
                          ...p,
                          body: { ...p.body, y: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>상의 크기 배율</span>
                    <span className="font-mono text-sky-400">
                      {Math.round((currentConfig.body.scale || 1) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.7"
                    max="1.3"
                    step="0.01"
                    value={currentConfig.body.scale || 1}
                    onChange={(e) =>
                      onUpdateSlotConfig(currentId, (p) => ({
                        ...p,
                        body: { ...p.body, scale: Number(e.target.value) },
                      }))
                    }
                    className="w-full accent-sky-500"
                  />
                </div>
              </div>

              {/* 머리 (Head) Controls */}
              <div className="bg-slate-800/40 p-3 rounded-xl border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    💜 머리(헤어) 상세 슬라이더
                  </span>
                  <span className="text-[11px] font-mono text-purple-400">
                    X:{currentConfig.head.x} / Y:{currentConfig.head.y}px
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">
                      좌우 X 위치
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={currentConfig.head.x}
                      onChange={(e) =>
                        onUpdateSlotConfig(currentId, (p) => ({
                          ...p,
                          head: { ...p.head, x: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">
                      상하 Y 위치 (목 깊이)
                    </label>
                    <input
                      type="range"
                      min="-120"
                      max="120"
                      value={currentConfig.head.y}
                      onChange={(e) =>
                        onUpdateSlotConfig(currentId, (p) => ({
                          ...p,
                          head: { ...p.head, y: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* 하의 (Legs) Controls */}
              <div className="bg-slate-800/40 p-3 rounded-xl border border-pink-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-pink-400" />
                    👖 하의(스커트) 상세 슬라이더
                  </span>
                  <span className="text-[11px] font-mono text-pink-400">
                    X:{currentConfig.leg.x} / Y:{currentConfig.leg.y}px
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">
                      좌우 X 위치
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={currentConfig.leg.x}
                      onChange={(e) =>
                        onUpdateSlotConfig(currentId, (p) => ({
                          ...p,
                          leg: { ...p.leg, x: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-pink-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">
                      상하 Y 위치 (허리 연결)
                    </label>
                    <input
                      type="range"
                      min="-120"
                      max="120"
                      value={currentConfig.leg.y}
                      onChange={(e) =>
                        onUpdateSlotConfig(currentId, (p) => ({
                          ...p,
                          leg: { ...p.leg, y: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-pink-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: GUIDE LINES & CUTTING (가이드선 이동) ===================== */}
        {activeTab === 'guide' && (
          <div className="space-y-4">
            {/* Guide line 이동 설정 (눈선 & 발선 이동 기능!) */}
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-blue-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5 text-blue-400" />
                  가이드 기준선 위치 이동 (상하 조절)
                </span>
                <button
                  onClick={() =>
                    onUpdateGuideSettings({
                      eyeLineYOffset: 0,
                      footLineYOffset: 0,
                    })
                  }
                  className="text-[11px] text-slate-400 hover:text-white"
                >
                  기본 위치 복귀
                </button>
              </div>

              {/* 눈 중앙선 이동 (Blue) */}
              <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-blue-400 font-semibold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    눈 중앙선 높이 (파란선)
                  </span>
                  <span className="font-mono text-blue-300">
                    {guideSettings.eyeLineYOffset > 0
                      ? `+${guideSettings.eyeLineYOffset}`
                      : guideSettings.eyeLineYOffset}
                    px
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      onUpdateGuideSettings({
                        eyeLineYOffset: (guideSettings.eyeLineYOffset || 0) - 2,
                      })
                    }
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700"
                  >
                    위로 (-2px)
                  </button>
                  <input
                    type="range"
                    min="-80"
                    max="80"
                    value={guideSettings.eyeLineYOffset || 0}
                    onChange={(e) =>
                      onUpdateGuideSettings({
                        eyeLineYOffset: Number(e.target.value),
                      })
                    }
                    className="flex-1 accent-blue-500"
                  />
                  <button
                    onClick={() =>
                      onUpdateGuideSettings({
                        eyeLineYOffset: (guideSettings.eyeLineYOffset || 0) + 2,
                      })
                    }
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700"
                  >
                    아래로 (+2px)
                  </button>
                </div>
              </div>

              {/* 발끝 / 바닥선 이동 (Orange) */}
              <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    발끝 / 바닥선 높이 (주황선)
                  </span>
                  <span className="font-mono text-amber-300">
                    {guideSettings.footLineYOffset > 0
                      ? `+${guideSettings.footLineYOffset}`
                      : guideSettings.footLineYOffset}
                    px
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      onUpdateGuideSettings({
                        footLineYOffset: (guideSettings.footLineYOffset || 0) - 2,
                      })
                    }
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700"
                  >
                    위로 (-2px)
                  </button>
                  <input
                    type="range"
                    min="-80"
                    max="80"
                    value={guideSettings.footLineYOffset || 0}
                    onChange={(e) =>
                      onUpdateGuideSettings({
                        footLineYOffset: Number(e.target.value),
                      })
                    }
                    className="flex-1 accent-amber-500"
                  />
                  <button
                    onClick={() =>
                      onUpdateGuideSettings({
                        footLineYOffset: (guideSettings.footLineYOffset || 0) + 2,
                      })
                    }
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700"
                  >
                    아래로 (+2px)
                  </button>
                </div>
              </div>
            </div>

            {/* 인접 헤어 잘림/번짐 제거 설정 */}
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-purple-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    인접 헤어 파편/잘림 자동 제거
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    옆 칸에서 넘어온 잔여 머리카락 파편을 지웁니다
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={processingSettings.autoCleanStrayHair}
                  onChange={(e) => {
                    onUpdateProcessingSettings({
                      autoCleanStrayHair: e.target.checked,
                    });
                  }}
                  className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>경계 마진 잘라내기 (Side Margin Trim)</span>
                  <span className="font-mono text-purple-400">
                    {processingSettings.sideTrimPx}px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={processingSettings.sideTrimPx}
                  onChange={(e) => {
                    onUpdateProcessingSettings({
                      sideTrimPx: Number(e.target.value),
                    });
                  }}
                  className="w-full accent-purple-500"
                />
                <p className="text-[10px] text-slate-400">
                  수치를 높이면 칸 경계선에 걸친 옆 헤어가 더 깨끗하게 잘려나갑니다
                </p>
              </div>

              <button
                onClick={onReSliceSheets}
                className="w-full py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-semibold rounded-lg border border-purple-500/40 transition"
              >
                헤어 파편 제거 다시 적용하기
              </button>
            </div>

            {/* Guide background toggle */}
            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    4번 가이드 양식 배경
                  </div>
                  <div className="text-[11px] text-slate-400">
                    완성 후 삭제하여 캐릭터만 출력
                  </div>
                </div>
                <button
                  onClick={() =>
                    onUpdateGuideSettings({
                      showGuideBackground: !guideSettings.showGuideBackground,
                    })
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    guideSettings.showGuideBackground
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {guideSettings.showGuideBackground ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>표시 중</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>삭제/숨김</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Cut Line Settings */}
            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-emerald-400" />
                    자르기(재단) 가이드 칼선
                  </div>
                  <div className="text-[11px] text-slate-400">
                    자로 쉽게 자를 수 있는 외곽 가이드선
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={guideSettings.showCutMarks}
                  onChange={(e) =>
                    onUpdateGuideSettings({ showCutMarks: e.target.checked })
                  }
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {guideSettings.showCutMarks && (
                <div className="space-y-2 pt-1 border-t border-slate-700/60">
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() =>
                        onUpdateGuideSettings({ cutMarkStyle: 'dashed' })
                      }
                      className={`py-1 text-xs rounded border text-center ${
                        guideSettings.cutMarkStyle === 'dashed'
                          ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      점선
                    </button>
                    <button
                      onClick={() =>
                        onUpdateGuideSettings({ cutMarkStyle: 'solid' })
                      }
                      className={`py-1 text-xs rounded border text-center ${
                        guideSettings.cutMarkStyle === 'solid'
                          ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      실선
                    </button>
                    <button
                      onClick={() =>
                        onUpdateGuideSettings({ cutMarkStyle: 'cropmarks' })
                      }
                      className={`py-1 text-xs rounded border text-center ${
                        guideSettings.cutMarkStyle === 'cropmarks'
                          ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      크롭마크
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB 3: BATCH GLOBAL ADJUSTMENTS ===================== */}
        {activeTab === 'batch' && (
          <div className="space-y-4">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-xs text-indigo-300">
              <span className="font-bold block mb-0.5">15개 캐릭터 전체 일괄 조정</span>
              모든 상의, 머리, 하의 위치 및 크기를 15개 전체에 동시 적용합니다.
            </div>

            <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/80 space-y-4">
              <div>
                <span className="font-semibold text-sky-300 text-xs block mb-1.5">
                  전체 상의 상하 이동 (높낮이)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      onBatchUpdateConfigs((p) => ({
                        ...p,
                        body: { ...p.body, y: p.body.y - 3 },
                      }))
                    }
                    className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs"
                  >
                    위로 (-3px)
                  </button>
                  <button
                    onClick={() =>
                      onBatchUpdateConfigs((p) => ({
                        ...p,
                        body: { ...p.body, y: p.body.y + 3 },
                      }))
                    }
                    className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs"
                  >
                    아래로 (+3px)
                  </button>
                  <button
                    onClick={() =>
                      onBatchUpdateConfigs((p) => ({
                        ...p,
                        body: { ...p.body, y: 0 },
                      }))
                    }
                    className="ml-auto text-xs text-slate-400 hover:text-white"
                  >
                    리셋
                  </button>
                </div>
              </div>

              <div>
                <span className="font-semibold text-purple-300 text-xs block mb-1.5">
                  전체 머리 상하 이동 (목 깊이)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      onBatchUpdateConfigs((p) => ({
                        ...p,
                        head: { ...p.head, y: p.head.y - 3 },
                      }))
                    }
                    className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs"
                  >
                    위로 (-3px)
                  </button>
                  <button
                    onClick={() =>
                      onBatchUpdateConfigs((p) => ({
                        ...p,
                        head: { ...p.head, y: p.head.y + 3 },
                      }))
                    }
                    className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs"
                  >
                    아래로 (+3px)
                  </button>
                  <button
                    onClick={() =>
                      onBatchUpdateConfigs((p) => ({
                        ...p,
                        head: { ...p.head, y: 0 },
                      }))
                    }
                    className="ml-auto text-xs text-slate-400 hover:text-white"
                  >
                    리셋
                  </button>
                </div>
              </div>

              <div>
                <span className="font-semibold text-pink-300 text-xs block mb-1.5">
                  전체 하의 상하 이동 (허리 연결)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      onBatchUpdateConfigs((p) => ({
                        ...p,
                        leg: { ...p.leg, y: p.leg.y - 3 },
                      }))
                    }
                    className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs"
                  >
                    위로 (-3px)
                  </button>
                  <button
                    onClick={() =>
                      onBatchUpdateConfigs((p) => ({
                        ...p,
                        leg: { ...p.leg, y: p.leg.y + 3 },
                      }))
                    }
                    className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs"
                  >
                    아래로 (+3px)
                  </button>
                  <button
                    onClick={() =>
                      onBatchUpdateConfigs((p) => ({
                        ...p,
                        leg: { ...p.leg, y: 0 },
                      }))
                    }
                    className="ml-auto text-xs text-slate-400 hover:text-white"
                  >
                    리셋
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={onResetAllConfigs}
              className="w-full py-2.5 bg-slate-800 hover:bg-rose-900/30 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/50 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>15개 캐릭터 전체 위치 초기화</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
