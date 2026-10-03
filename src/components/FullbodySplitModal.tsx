import React, { useEffect, useRef, useState } from 'react';
import { Scissors, Sparkles, X, Check, Eye, Layers } from 'lucide-react';
import { splitFullbodyTilesToFaceAndOutfit } from '../utils/imageProcessor';

interface FullbodySplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  fullbodyTiles: HTMLCanvasElement[];
  onApplySplit: (faceTiles: HTMLCanvasElement[], outfitTiles: HTMLCanvasElement[]) => void;
  sheetMode?: 15 | 30;
}

export const FullbodySplitModal: React.FC<FullbodySplitModalProps> = ({
  isOpen,
  onClose,
  fullbodyTiles,
  onApplySplit,
  sheetMode = 30,
}) => {
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0);
  const [headCutRatio, setHeadCutRatio] = useState(0.44); // 44% of character height
  const [splitResult, setSplitResult] = useState<{
    faceTiles: HTMLCanvasElement[];
    outfitTiles: HTMLCanvasElement[];
  } | null>(null);

  const previewSourceCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewFaceCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewOutfitCanvasRef = useRef<HTMLCanvasElement>(null);

  const totalCount = fullbodyTiles.length || sheetMode || 30;

  // Real-time calculation of split tiles based on ratio
  useEffect(() => {
    if (!isOpen || fullbodyTiles.length === 0) return;
    const result = splitFullbodyTilesToFaceAndOutfit(fullbodyTiles, headCutRatio);
    setSplitResult(result);
  }, [isOpen, fullbodyTiles, headCutRatio]);

  // Render preview canvases
  useEffect(() => {
    if (!splitResult || fullbodyTiles.length === 0) return;

    const sourceTile = fullbodyTiles[selectedPreviewIndex];
    const faceTile = splitResult.faceTiles[selectedPreviewIndex];
    const outfitTile = splitResult.outfitTiles[selectedPreviewIndex];

    // Source Canvas with dashed cut guideline
    const srcCanvas = previewSourceCanvasRef.current;
    if (srcCanvas && sourceTile) {
      srcCanvas.width = sourceTile.width;
      srcCanvas.height = sourceTile.height;
      const ctx = srcCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, srcCanvas.width, srcCanvas.height);
        ctx.drawImage(sourceTile, 0, 0);

        // Find bounding box to show exact cut line
        const imgData = ctx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
        const data = imgData.data;
        let minY = srcCanvas.height, maxY = -1;
        for (let y = 0; y < srcCanvas.height; y++) {
          for (let x = 0; x < srcCanvas.width; x++) {
            if (data[(y * srcCanvas.width + x) * 4 + 3] > 25) {
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxY > minY) {
          const cutY = Math.round(minY + (maxY - minY) * headCutRatio);

          ctx.save();
          // Dashed split line
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(0, cutY);
          ctx.lineTo(srcCanvas.width, cutY);
          ctx.stroke();

          // Label
          ctx.fillStyle = '#f43f5e';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText(`목 분할 기준선 (${Math.round(headCutRatio * 100)}%)`, 16, cutY - 8);
          ctx.restore();
        }
      }
    }

    // Face canvas
    const faceCanvas = previewFaceCanvasRef.current;
    if (faceCanvas && faceTile) {
      faceCanvas.width = faceTile.width;
      faceCanvas.height = faceTile.height;
      const ctx = faceCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
        ctx.drawImage(faceTile, 0, 0);
      }
    }

    // Outfit canvas
    const outfitCanvas = previewOutfitCanvasRef.current;
    if (outfitCanvas && outfitTile) {
      outfitCanvas.width = outfitTile.width;
      outfitCanvas.height = outfitTile.height;
      const ctx = outfitCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, outfitCanvas.width, outfitCanvas.height);
        ctx.drawImage(outfitTile, 0, 0);
      }
    }
  }, [splitResult, selectedPreviewIndex, fullbodyTiles, headCutRatio]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!splitResult) return;
    onApplySplit(splitResult.faceTiles, splitResult.outfitTiles);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md select-none animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-600 text-white shadow-lg">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                전신 캐릭터 → 얼굴 30종 + 의상 30종 자동 분할
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                  {totalCount}종 전신 시트
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                얼굴과 몸이 합쳐진 캐릭터를 목선을 기준으로 분리하여, 900가지 조합이 가능한 2파트 모듈러 시스템으로 변환합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar text-white">
          {/* Controls Bar: Preview character picker + Ratio Slider */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Preview Character Selector */}
              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-1">
                  미리보기 확인할 캐릭터 선택:
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 max-w-xs sm:max-w-md">
                  {Array.from({ length: Math.min(totalCount, 15) }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPreviewIndex(i)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 border ${
                        selectedPreviewIndex === i
                          ? 'bg-pink-600 text-white border-pink-500 shadow'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      #{i + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cut Height Slider */}
              <div className="sm:w-72">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">목 분할선 높이 비율</span>
                  <span className="font-mono text-pink-400 font-bold">
                    상단 {Math.round(headCutRatio * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.34}
                  max={0.54}
                  step={0.01}
                  value={headCutRatio}
                  onChange={(e) => setHeadCutRatio(Number(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer h-2"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 font-mono">
                  <span>34% (머리 작음)</span>
                  <span className="text-pink-300">44% (기본 SD/치비)</span>
                  <span>54% (머리 큼)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3-Column Visual Comparison Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Original Fullbody */}
            <div className="flex flex-col items-center p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                원본 전신 캐릭터 #{selectedPreviewIndex + 1}
              </span>
              <div className="w-full aspect-square max-w-[240px] rounded-xl overflow-hidden border border-slate-800 bg-[#0f172a] flex items-center justify-center p-2 relative shadow-inner">
                <canvas
                  ref={previewSourceCanvasRef}
                  className="w-full h-full object-contain block"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-2">
                붉은 점선: 감지된 목 분할 기준선
              </span>
            </div>

            {/* 2. Extracted Face */}
            <div className="flex flex-col items-center p-3 rounded-2xl bg-slate-950/60 border border-orange-500/30">
              <span className="text-xs font-bold text-orange-300 mb-2 flex items-center gap-1.5">
                <span>😊</span>
                추출될 얼굴 / 표정 ({totalCount}종)
              </span>
              <div className="w-full aspect-square max-w-[240px] rounded-xl overflow-hidden border border-orange-500/20 bg-[#0f172a] flex items-center justify-center p-2 relative shadow-inner">
                <canvas
                  ref={previewFaceCanvasRef}
                  className="w-full h-full object-contain block"
                />
              </div>
              <span className="text-[10px] text-orange-300/80 mt-2">
                목선 아래 자연스러운 연결 여백 포함
              </span>
            </div>

            {/* 3. Extracted Outfit */}
            <div className="flex flex-col items-center p-3 rounded-2xl bg-slate-950/60 border border-pink-500/30">
              <span className="text-xs font-bold text-pink-300 mb-2 flex items-center gap-1.5">
                <span>👗</span>
                추출될 상의+하의 의상 ({totalCount}종)
              </span>
              <div className="w-full aspect-square max-w-[240px] rounded-xl overflow-hidden border border-pink-500/20 bg-[#0f172a] flex items-center justify-center p-2 relative shadow-inner">
                <canvas
                  ref={previewOutfitCanvasRef}
                  className="w-full h-full object-contain block"
                />
              </div>
              <span className="text-[10px] text-pink-300/80 mt-2">
                상의 목깃부터 신발까지 한 벌로 추출
              </span>
            </div>
          </div>

          {/* Value Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/40 to-pink-950/40 border border-indigo-500/30 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-slate-100">
                분할 완료 시 얻게 되는 효과:
              </p>
              <p className="text-slate-300 leading-relaxed">
                나뉘지 않은 전신 캐릭터 {totalCount}종 시트 하나로{' '}
                <strong className="text-orange-300">얼굴 {totalCount}종</strong>과{' '}
                <strong className="text-pink-300">의상 {totalCount}종</strong>이 즉시 생성되어,{' '}
                <strong className="text-emerald-300">
                  총 {totalCount * totalCount}가지 나만의 캐릭터 조합
                </strong>
                을 실시간으로 만들 수 있습니다!
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white text-xs font-bold shadow-xl transition flex items-center gap-2 active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>✨ {totalCount}개 캐릭터 전체 일괄 분할 및 2파트 조합 적용</span>
          </button>
        </div>
      </div>
    </div>
  );
};
