import React, { useState } from 'react';
import {
  Download,
  FileArchive,
  Image as ImageIcon,
  Scissors,
  Check,
  X,
  Sparkles,
  Printer
} from 'lucide-react';
import { GuideLineSettings, ProcessingSettings, SlotConfig } from '../types';
import { downloadCanvas, exportAllCharactersZip, renderCompositeCanvas } from '../utils/imageProcessor';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  headTiles: HTMLCanvasElement[];
  bodyTiles: HTMLCanvasElement[];
  legTiles: HTMLCanvasElement[];
  slotConfigs: SlotConfig[];
  guideImage: HTMLImageElement | null;
  guideSettings: GuideLineSettings;
  processingSettings: ProcessingSettings;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  headTiles,
  bodyTiles,
  legTiles,
  slotConfigs,
  guideImage,
  guideSettings,
  processingSettings,
}) => {
  const [exportMode, setExportMode] = useState<'clean' | 'cutmarks' | 'withguide'>('clean');
  const [exportBg, setExportBg] = useState<'white' | 'transparent'>('transparent');
  const [resolutionMultiplier, setResolutionMultiplier] = useState<number>(1);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExportFullImage = () => {
    setIsExporting(true);

    setTimeout(() => {
      try {
        const baseW = guideImage?.naturalWidth || 2400;
        const baseH = guideImage?.naturalHeight || 1700;

        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = baseW * resolutionMultiplier;
        offscreenCanvas.height = baseH * resolutionMultiplier;

        // Custom guide settings based on user choice
        const customGuideSettings: GuideLineSettings = {
          ...guideSettings,
          showGuideBackground: exportMode === 'withguide',
          showEyeLine: exportMode === 'withguide',
          showFootLine: exportMode === 'withguide',
          showBoxBorder: exportMode === 'cutmarks',
          showNumbers: exportMode === 'cutmarks',
          showCutMarks: exportMode === 'cutmarks',
          backgroundColor: exportBg,
        };

        renderCompositeCanvas(
          offscreenCanvas,
          headTiles,
          bodyTiles,
          legTiles,
          slotConfigs,
          guideImage,
          customGuideSettings,
          processingSettings,
          null,
          null
        );

        const suffix =
          exportMode === 'clean'
            ? 'clean_no_guide'
            : exportMode === 'cutmarks'
            ? 'cutting_guides'
            : 'with_guide_template';

        downloadCanvas(offscreenCanvas, `15characters_${suffix}_${exportBg}.png`);
        onClose();
      } catch (err) {
        console.error('Export failed:', err);
      } finally {
        setIsExporting(false);
      }
    }, 50);
  };

  const handleExportZip = async () => {
    setIsExporting(true);
    try {
      const blob = await exportAllCharactersZip(
        headTiles,
        bodyTiles,
        legTiles,
        slotConfigs,
        processingSettings.layerOrder
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '15characters_individual_pngs.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                고해상도 이미지 내보내기 & 저장
              </h2>
              <p className="text-xs text-slate-400">
                원하는 형식(가이드 삭제, 재단 칼선 포함, 개별 ZIP)을 선택하세요.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              출력 형식 선택
            </label>

            {/* Option A: Clean, Guide removed */}
            <div
              onClick={() => setExportMode('clean')}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                exportMode === 'clean'
                  ? 'bg-indigo-600/15 border-indigo-500 text-white'
                  : 'bg-slate-800/40 border-slate-700/80 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold flex items-center gap-2">
                    4번 가이드 양식 완전 삭제 (완성본)
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-medium">
                      추천
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    가이드선 없이 15개 캐릭터만 깔끔하게 출력 (투명 PNG or 흰색)
                  </div>
                </div>
              </div>
              {exportMode === 'clean' && <Check className="w-4 h-4 text-indigo-400" />}
            </div>

            {/* Option B: Cutting marks included */}
            <div
              onClick={() => setExportMode('cutmarks')}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                exportMode === 'cutmarks'
                  ? 'bg-indigo-600/15 border-indigo-500 text-white'
                  : 'bg-slate-800/40 border-slate-700/80 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300">
                  <Scissors className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold flex items-center gap-2">
                    재단 가이드 칼선 포함 (자로 자르기용)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    자로 쉽게 재단할 수 있도록 슬롯 외곽에 점선 칼선 표시
                  </div>
                </div>
              </div>
              {exportMode === 'cutmarks' && <Check className="w-4 h-4 text-indigo-400" />}
            </div>

            {/* Option C: With original guide */}
            <div
              onClick={() => setExportMode('withguide')}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                exportMode === 'withguide'
                  ? 'bg-indigo-600/15 border-indigo-500 text-white'
                  : 'bg-slate-800/40 border-slate-700/80 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">
                    4번 가이드 양식 배경 포함 버전
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    눈선, 발선 및 양식 텍스트가 모두 포함된 원본 스타일
                  </div>
                </div>
              </div>
              {exportMode === 'withguide' && <Check className="w-4 h-4 text-indigo-400" />}
            </div>
          </div>

          {/* Background and Resolution Settings */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                배경 투명도
              </label>
              <div className="grid grid-cols-2 gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
                <button
                  onClick={() => setExportBg('transparent')}
                  className={`py-1 text-xs font-medium rounded transition ${
                    exportBg === 'transparent'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  투명 PNG
                </button>
                <button
                  onClick={() => setExportBg('white')}
                  className={`py-1 text-xs font-medium rounded transition ${
                    exportBg === 'white'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  흰색 배경
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                해상도 배율
              </label>
              <div className="grid grid-cols-2 gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
                <button
                  onClick={() => setResolutionMultiplier(1)}
                  className={`py-1 text-xs font-medium rounded transition ${
                    resolutionMultiplier === 1
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  1x 기본 (고화질)
                </button>
                <button
                  onClick={() => setResolutionMultiplier(1.5)}
                  className={`py-1 text-xs font-medium rounded transition ${
                    resolutionMultiplier === 1.5
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  1.5x 초고화질
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleExportZip}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition disabled:opacity-50"
          >
            <FileArchive className="w-3.5 h-3.5 text-purple-400" />
            <span>15개 캐릭터 개별 ZIP 저장</span>
          </button>

          <button
            onClick={handleExportFullImage}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-lg shadow-lg hover:shadow-indigo-500/25 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? '생성 중...' : '전체 이미지 다운로드 (PNG)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
