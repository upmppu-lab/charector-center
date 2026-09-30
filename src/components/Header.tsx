import React from 'react';
import {
  Download,
  Eye,
  EyeOff,
  FolderArchive,
  Layers,
  Scissors,
  Settings2,
  UploadCloud,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { GuideLineSettings } from '../types';

interface HeaderProps {
  guideSettings: GuideLineSettings;
  onUpdateGuideSettings: (settings: Partial<GuideLineSettings>) => void;
  onOpenUploadModal: () => void;
  onOpenExportModal: () => void;
  onExportZip: () => void;
  isExportingZip: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onResetZoom: () => void;
  hasGuideImage: boolean;
  activeTab: 'stage' | 'inspector' | 'guide';
  setActiveTab: (tab: 'stage' | 'inspector' | 'guide') => void;
}

export const Header: React.FC<HeaderProps> = ({
  guideSettings,
  onUpdateGuideSettings,
  onOpenUploadModal,
  onOpenExportModal,
  onExportZip,
  isExportingZip,
  zoom,
  onZoomChange,
  onResetZoom,
  hasGuideImage,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-4 py-2.5 select-none sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Title & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-inner">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight flex items-center gap-2">
              15 캐릭터 조합 & 가이드라인 정렬기
              <span className="text-[10px] uppercase font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                15 Combiner Studio
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              1~15번 헤어·상의·하의 정렬 및 자르기(재단) 가이드 맞춤 출력
            </p>
          </div>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => onZoomChange(Math.max(0.2, zoom - 0.1))}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition"
              title="축소"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono font-medium px-2 text-slate-300 min-w-[50px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => onZoomChange(Math.min(2.5, zoom + 0.1))}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition"
              title="확대"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onResetZoom}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition border-l border-slate-700"
              title="화면에 맞추기"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Guide Background Toggle (User specifically mentioned toggle/remove 4th screenshot) */}
          <button
            onClick={() =>
              onUpdateGuideSettings({
                showGuideBackground: !guideSettings.showGuideBackground,
              })
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
              guideSettings.showGuideBackground
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="4번 스크린샷 가이드 양식 배경을 끄거나 켭니다 (완성 후 삭제 가능)"
          >
            {guideSettings.showGuideBackground ? (
              <Eye className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>4번 가이드 배경 {guideSettings.showGuideBackground ? 'ON' : '삭제/OFF'}</span>
          </button>

          {/* Cut Line Toggle (나중에 자로 자르기 위한 가이드) */}
          <button
            onClick={() =>
              onUpdateGuideSettings({
                showCutMarks: !guideSettings.showCutMarks,
              })
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
              guideSettings.showCutMarks
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="자로 자르기 편한 재단선/칼선 가이드를 표시합니다"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>재단 칼선 {guideSettings.showCutMarks ? 'ON' : 'OFF'}</span>
          </button>

          {/* Upload Button */}
          <button
            onClick={onOpenUploadModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-lg transition"
          >
            <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
            <span>이미지 파일 교체 / 등록</span>
          </button>

          {/* ZIP Export Button */}
          <button
            onClick={onExportZip}
            disabled={isExportingZip}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-lg transition disabled:opacity-50"
            title="15개 캐릭터를 각각 고화질 투명 PNG로 분할 압축 다운로드"
          >
            <FolderArchive className="w-3.5 h-3.5 text-purple-400" />
            <span>{isExportingZip ? '압축 중...' : '15개 ZIP'}</span>
          </button>

          {/* Main Download Button */}
          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold rounded-lg shadow-md hover:shadow-indigo-500/25 transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>고해상도 다운로드</span>
          </button>
        </div>
      </div>
    </header>
  );
};
