import React, { useEffect, useRef, useState } from 'react';
import {
  AnchorSettings,
  CompositionMode,
  ProcessingSettings,
  SlotConfig,
} from '../types';
import { CHARACTER_DESCRIPTIONS } from '../utils/sampleData';
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
} from 'lucide-react';

interface GameCharacterCustomizerProps {
  faceTiles: HTMLCanvasElement[];
  hairTiles: HTMLCanvasElement[];
  bodyTiles: HTMLCanvasElement[];
  legTiles: HTMLCanvasElement[];
  headTiles?: HTMLCanvasElement[]; // 호환성
  outfitTiles?: HTMLCanvasElement[]; // 상의+하의 30종
  slotConfigs: SlotConfig[];
  anchorSettings: AnchorSettings;
  onUpdateAnchorSettings: (settings: Partial<AnchorSettings>) => void;
  processingSettings: ProcessingSettings;
  onUpdateProcessingSettings: (settings: Partial<ProcessingSettings>) => void;
  sheetMode?: 15 | 30;
  compositionMode?: CompositionMode;
  onAutoAlignAllParts?: () => void;
  onOpenGridSliceModal?: (target?: 'face' | 'hair' | 'body' | 'leg' | 'outfit') => void;
}

export const GameCharacterCustomizer: React.FC<GameCharacterCustomizerProps> = ({
  faceTiles,
  hairTiles,
  bodyTiles,
  legTiles,
  headTiles,
  outfitTiles,
  slotConfigs,
  anchorSettings,
  onUpdateAnchorSettings,
  processingSettings,
  onUpdateProcessingSettings,
  sheetMode = 15,
  compositionMode = '2part',
  onAutoAlignAllParts,
  onOpenGridSliceModal,
}) => {
  // Resolved tiles (support headTiles fallback for hair)
  const actualHairTiles = hairTiles && hairTiles.length > 0 ? hairTiles : (headTiles || []);
  const actualOutfitTiles = outfitTiles && outfitTiles.length > 0 ? outfitTiles : bodyTiles;
  const actualCount =
    sheetMode ||
    Math.max(faceTiles.length, actualHairTiles.length, bodyTiles.length, legTiles.length, actualOutfitTiles.length, 15);

  // Selected indices (1 to actualCount)
  const [selectedFace, setSelectedFace] = useState<number>(1);
  const [selectedHair, setSelectedHair] = useState<number>(1);
  const [selectedTop, setSelectedTop] = useState<number>(1);
  const [selectedBottom, setSelectedBottom] = useState<number>(1);
  const [selectedOutfit, setSelectedOutfit] = useState<number>(1);

  // Animation, notifications, and background settings
  const [isIdleAnimation, setIsIdleAnimation] = useState<boolean>(true);
  const [bgStyle, setBgStyle] = useState<'studio' | 'neon' | 'pastel' | 'transparent'>('studio');
  const [showJointControls, setShowJointControls] = useState(false);
  const [autoAlignNotification, setAutoAlignNotification] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Helper to get thumbnails
  const getThumbnailDataUrl = (tile: HTMLCanvasElement | undefined) => {
    if (!tile) return '';
    return tile.toDataURL();
  };

  // Randomize parts
  const handleRandomize = () => {
    setSelectedFace(Math.floor(Math.random() * actualCount) + 1);
    setSelectedHair(Math.floor(Math.random() * actualCount) + 1);
    setSelectedTop(Math.floor(Math.random() * actualCount) + 1);
    setSelectedBottom(Math.floor(Math.random() * actualCount) + 1);
    setSelectedOutfit(Math.floor(Math.random() * actualCount) + 1);
  };

  // Apply complete set #N
  const handleApplyPresetSet = (id: number) => {
    setSelectedFace(id);
    setSelectedHair(id);
    setSelectedTop(id);
    setSelectedBottom(id);
    setSelectedOutfit(id);
  };

  // Real-time render loop with breathing idle motion
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

      const faceConfig = slotConfigs.find((s) => s.id === selectedFace)?.face || { x: 0, y: 0, scale: 1 };
      const hairConfig = slotConfigs.find((s) => s.id === selectedHair)?.hair ||
        slotConfigs.find((s) => s.id === selectedHair)?.head || { x: 0, y: 0, scale: 1 };
      const bodyConfig = slotConfigs.find((s) => s.id === selectedTop)?.body || { x: 0, y: 0, scale: 1 };
      const legConfig = slotConfigs.find((s) => s.id === selectedBottom)?.leg || { x: 0, y: 0, scale: 1 };
      const outfitConfig = slotConfigs.find((s) => s.id === selectedOutfit)?.outfit || { x: 0, y: 0, scale: 1 };

      // Calculate idle animation offsets
      let breathY = 0;
      let breathHeadY = 0;
      if (isIdleAnimation) {
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
        compositionMode === '2part' ? { ...outfitConfig, y: outfitConfig.y + breathY } : undefined
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
    selectedFace,
    selectedHair,
    selectedTop,
    selectedBottom,
    selectedOutfit,
    slotConfigs,
    anchorSettings,
    processingSettings,
    isIdleAnimation,
    bgStyle,
    compositionMode,
  ]);

  // Download high-resolution PNG
  const handleDownloadSinglePng = () => {
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
      <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 relative overflow-hidden">
        {/* Floating Top Info Pill */}
        <div className="absolute top-4 z-20 flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700 backdrop-blur shadow-xl text-xs text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">
              {compositionMode === '2part'
                ? `조합: 얼굴 #${selectedFace} + 상의·하의 #${selectedOutfit}`
                : `조합: 얼굴 #${selectedFace} · 헤어 #${selectedHair} · 상의 #${selectedTop} · 하의 #${selectedBottom}`}
            </span>
          </div>

          {/* Smart Auto-Alignment One-Click Trigger */}
          <button
            onClick={handleAutoAlignWithFeedback}
            className="px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/50 shadow-xl backdrop-blur text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
            title="코 중심 얼굴과 목선 기준 상의+하의를 픽셀 단위로 분석하여 캐릭터를 완벽하게 자동 결합합니다."
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-200" />
            <span>⚡ 스마트 자동 정렬</span>
          </button>

          {/* Randomizer */}
          <button
            onClick={handleRandomize}
            className="px-3 py-1.5 rounded-full bg-indigo-600/80 hover:bg-indigo-600 border border-indigo-400/50 shadow-xl backdrop-blur text-xs font-semibold text-white transition flex items-center gap-1.5 active:scale-95"
            title="랜덤 캐릭터 조합 생성"
          >
            <Dice5 className="w-3.5 h-3.5" />
            <span>랜덤 조합</span>
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
              <span>간격/2개 겹침 보정</span>
            </button>
          )}
        </div>

        {/* Main Canvas Container */}
        <div className="relative w-full max-w-[420px] aspect-[2/3] rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
          <canvas
            ref={canvasRef}
            width={600}
            height={900}
            className="w-full h-full object-contain block"
          />
        </div>

        {/* Bottom Stage Controls (Idle, Backgrounds, Joint Alignment) */}
        <div className="absolute bottom-4 z-20 flex items-center gap-2">
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
            <span>{isIdleAnimation ? '숨쉬기 모션 ON' : '정지 모션'}</span>
          </button>

          {/* Background selector */}
          <div className="flex items-center bg-slate-900/90 border border-slate-700 rounded-xl p-0.5 shadow-xl text-xs">
            {(['studio', 'neon', 'pastel', 'transparent'] as const).map((bg) => (
              <button
                key={bg}
                onClick={() => setBgStyle(bg)}
                className={`px-2.5 py-1 rounded-lg capitalize transition ${
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

        {/* Floating Joint Fine-Tuning Drawer */}
        {showJointControls && (
          <div className="absolute bottom-16 z-30 w-80 p-4 rounded-2xl bg-slate-900/95 border border-slate-700 backdrop-blur shadow-2xl flex flex-col gap-3 animate-fade-in text-xs text-white">
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
              {compositionMode === '2part'
                ? `캐릭터 선택창 (얼굴 ${actualCount}종 + 상의/하의 ${actualCount}종)`
                : `캐릭터 선택창 슬롯 (4파트)`}
            </h2>
            <p className="text-[11px] text-slate-400">
              {compositionMode === '2part'
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
                {compositionMode === '2part' ? '얼굴+의상 매칭' : '4개 파트 동시 적용'}
              </span>
            </div>
            <div className={`grid ${actualCount > 15 ? 'grid-cols-6' : 'grid-cols-5'} gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-0.5`}>
              {Array.from({ length: actualCount }, (_, i) => i + 1).map((id) => {
                const isMatched =
                  compositionMode === '2part'
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

          {/* 1. Face Selector (얼굴 / 표정) */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-orange-500/25">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-orange-300 flex items-center gap-1.5">
                😊 1. 얼굴 / 표정 ({actualCount}종)
              </span>
              <div className="flex items-center gap-1.5">
                {onOpenGridSliceModal && (
                  <button
                    type="button"
                    onClick={() => onOpenGridSliceModal('face')}
                    className="text-[10px] text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 px-2 py-0.5 rounded transition flex items-center gap-1"
                    title="얼굴 시트의 분할 간격을 자동 계산하거나 2개 겹친 박스를 상하로 자릅니다."
                  >
                    <Scissors className="w-3 h-3 text-cyan-400" />
                    <span>간격/겹침 보정</span>
                  </button>
                )}
                <span className="text-[11px] font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/30">
                  선택 #{selectedFace}
                </span>
              </div>
            </div>

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
          </div>

          {/* 2-Part Mode: Outfit Selector (상의+하의 일체형 의상 30종) */}
          {compositionMode === '2part' ? (
            <div className="p-3 rounded-xl bg-slate-950/60 border border-pink-500/25">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                  👗 2. 상의+하의 / 의상 ({actualCount}종)
                </span>
                <div className="flex items-center gap-1.5">
                  {onOpenGridSliceModal && (
                    <button
                      type="button"
                      onClick={() => onOpenGridSliceModal('outfit')}
                      className="text-[10px] text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 px-2 py-0.5 rounded transition flex items-center gap-1"
                      title="의상 시트의 분할 간격을 자동 계산하거나 2개 겹친 박스를 상하로 자릅니다."
                    >
                      <Scissors className="w-3 h-3 text-cyan-400" />
                      <span>간격/겹침 보정</span>
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
                  <span className="text-[11px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30">
                    선택 #{selectedHair}
                  </span>
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
                  <span className="text-[11px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">
                    선택 #{selectedTop}
                  </span>
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
                  <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    선택 #{selectedBottom}
                  </span>
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
        </div>
      </div>
    </div>
  );
};
