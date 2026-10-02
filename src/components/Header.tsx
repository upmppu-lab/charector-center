import React from 'react';
import {
  Download,
  FolderArchive,
  Layers,
  Sparkles,
  UploadCloud,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Gamepad2,
  Grid,
} from 'lucide-react';
import { ActiveAppView, CompositionMode, PartCategory } from '../types';

interface HeaderProps {
  activeView: ActiveAppView;
  setActiveView: (view: ActiveAppView) => void;
  onOpenUploadModal: (mode?: 15 | 30) => void;
  onOpenExportModal: () => void;
  onOpenGridSliceModal?: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onResetZoom: () => void;
  sheetMode?: 15 | 30;
  compositionMode?: CompositionMode;
  onCompositionModeChange?: (mode: CompositionMode) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  onOpenUploadModal,
  onOpenExportModal,
  onOpenGridSliceModal,
  zoom,
  onZoomChange,
  onResetZoom,
  sheetMode = 15,
  compositionMode = '2part',
  onCompositionModeChange,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-3 sm:px-5 py-2 select-none sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        {/* Title & Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 via-indigo-500 to-sky-500 flex items-center justify-center shadow-inner shrink-0">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight flex items-center gap-2">
              {sheetMode} 캐릭터 모듈러 파트 정렬기
              <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                {sheetMode}시트
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                compositionMode === '2part'
                  ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {compositionMode === '2part' ? '👗 얼굴+상의/하의 2파트' : '🧩 4파트 모드'}
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {compositionMode === '2part'
                ? `얼굴 ${sheetMode}종(코 중심) · 상의+하의 ${sheetMode}종(목선/허리 기준) 분할 정렬 및 실시간 조립`
                : `얼굴 · 헤어 · 상의 · 하의 4종 모듈러 분할 정렬 및 실시간 조립 (${sheetMode}칸 지원)`}
            </p>
          </div>
        </div>

        {/* Central View Switcher Tabs */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-semibold gap-1">
          {/* Game Character Customizer Tab */}
          <button
            onClick={() => setActiveView('game-customizer')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeView === 'game-customizer'
                ? 'bg-gradient-to-r from-indigo-600 to-pink-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5 text-pink-400" />
            <span className="font-bold">🎮 캐릭터 선택창</span>
          </button>

          {/* Face tab (코 중심 사각형 중앙 배치) */}
          <button
            onClick={() => setActiveView('align-face')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeView === 'align-face'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>😊</span>
            <span>얼굴 정렬</span>
          </button>

          {compositionMode === '2part' ? (
            /* 2-part mode: Top+Bottom combined outfit */
            <button
              onClick={() => setActiveView('align-outfit')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                activeView === 'align-outfit' || activeView === 'align-body'
                  ? 'bg-gradient-to-r from-sky-600 to-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>👗</span>
              <span>상의+하의 정렬</span>
            </button>
          ) : (
            /* 4-part mode: Hair, Top, Bottom */
            <>
              <button
                onClick={() => setActiveView('align-hair')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  activeView === 'align-hair' || activeView === 'align-head'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>💇</span>
                <span>헤어 정렬</span>
              </button>

              <button
                onClick={() => setActiveView('align-body')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  activeView === 'align-body'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>👕</span>
                <span>상의 정렬</span>
              </button>

              <button
                onClick={() => setActiveView('align-leg')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  activeView === 'align-leg'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>👖</span>
                <span>하의 정렬</span>
              </button>
            </>
          )}
        </div>

        {/* Mode Switcher (2파트 vs 4파트) */}
        {onCompositionModeChange && (
          <div className="hidden lg:flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 text-[11px] font-semibold">
            <button
              onClick={() => onCompositionModeChange('2part')}
              className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                compositionMode === '2part'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="얼굴 30종 + 상의/하의 의상 30종 포맷"
            >
              <span>👗 2파트(얼굴+의상)</span>
            </button>
            <button
              onClick={() => onCompositionModeChange('4part')}
              className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                compositionMode === '4part'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="얼굴 + 헤어 + 상의 + 하의 4개 개별 분할 포맷"
            >
              <span>🧩 4파트(세부)</span>
            </button>
          </div>
        )}

        {/* Right Action Tools */}
        <div className="flex items-center gap-2">
          {/* Zoom controls for canvas */}
          {activeView !== 'game-customizer' && (
            <div className="hidden md:flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700">
              <button
                onClick={() => onZoomChange(Math.max(0.2, zoom - 0.1))}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition"
                title="축소"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono font-medium px-2 text-slate-300 min-w-[46px] text-center">
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
                title="기본 크기"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Smart Grid Slice Gap Calibration Button */}
          {onOpenGridSliceModal && (
            <button
              onClick={onOpenGridSliceModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/70 hover:bg-cyan-900/90 text-cyan-200 border border-cyan-500/50 rounded-lg text-xs font-semibold shadow-sm transition active:scale-95"
              title="스프라이트가 잘리지 않도록 여백과 간격을 자동 계산하고 조절합니다."
            >
              <Grid className="w-3.5 h-3.5 text-cyan-400" />
              <span>간격 자동 계산</span>
            </button>
          )}

          {/* 15-Sheet Upload Button */}
          <button
            onClick={() => onOpenUploadModal(15)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition border ${
              sheetMode === 15
                ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/60 shadow-sm ring-1 ring-indigo-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="15개 스프라이트 시트(3행 5열) 등록 및 전환"
          >
            <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
            <span>시트등록 (15)</span>
            {sheetMode === 15 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          {/* 30-Sheet Upload Button */}
          <button
            onClick={() => onOpenUploadModal(30)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition border ${
              sheetMode === 30
                ? 'bg-purple-600/30 text-purple-200 border-purple-500/60 shadow-sm ring-1 ring-purple-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="30개 스프라이트 시트(5행 6열 / 6행 5열) 등록 및 전환"
          >
            <UploadCloud className="w-3.5 h-3.5 text-purple-400" />
            <span>시트등록 (30)</span>
            {sheetMode === 30 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          {/* Export Center Modal Button */}
          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-indigo-500/25 transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>내보내기 (ZIP)</span>
          </button>
        </div>
      </div>
    </header>
  );
};
