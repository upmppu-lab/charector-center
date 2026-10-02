import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  FileImage,
  Sliders,
  Upload,
  X,
  Sparkles,
  Info,
  RefreshCw,
  FolderUp,
  Grid,
  Wand2,
  Scissors,
} from 'lucide-react';
import { CompositionMode, Grid30Layout, ProcessingSettings, SheetMode, UploadedSheets } from '../types';

interface UploadSectionProps {
  isOpen: boolean;
  onClose: () => void;
  sheets: UploadedSheets;
  onUploadFile: (type: 'face' | 'hair' | 'body' | 'leg' | 'outfit', file: File) => void;
  onBatchUpload: (files: FileList | File[]) => void;
  onResetToDemo: () => void;
  processingSettings: ProcessingSettings;
  onUpdateProcessingSettings: (settings: Partial<ProcessingSettings>) => void;
  sheetMode?: SheetMode;
  onSelectSheetMode?: (mode: SheetMode) => void;
  grid30Layout?: Grid30Layout;
  onUpdateGrid30Layout?: (layout: Grid30Layout) => void;
  compositionMode?: CompositionMode;
  onSelectCompositionMode?: (mode: CompositionMode) => void;
  onSplitOutfitToTopBottom?: () => void;
  onAutoAlignAllParts?: () => void;
  onOpenGridSliceModal?: (type: 'face' | 'hair' | 'body' | 'leg' | 'outfit') => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  isOpen,
  onClose,
  sheets,
  onUploadFile,
  onBatchUpload,
  onResetToDemo,
  processingSettings,
  onUpdateProcessingSettings,
  sheetMode = 15,
  onSelectSheetMode,
  grid30Layout = 'auto',
  onUpdateGrid30Layout,
  compositionMode = '2part',
  onSelectCompositionMode,
  onSplitOutfitToTopBottom,
  onAutoAlignAllParts,
  onOpenGridSliceModal,
}) => {
  const [isDraggingBatch, setIsDraggingBatch] = useState(false);
  const faceInputRef = useRef<HTMLInputElement>(null);
  const hairInputRef = useRef<HTMLInputElement>(null);
  const bodyInputRef = useRef<HTMLInputElement>(null);
  const legInputRef = useRef<HTMLInputElement>(null);
  const outfitInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleBatchDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingBatch(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onBatchUpload(e.dataTransfer.files);
    }
  };

  const gridSubtext =
    sheetMode === 15
      ? '3행 5열 (15개)'
      : grid30Layout === '5x6'
      ? '6행 5열 (30개)'
      : grid30Layout === '6x5'
      ? '5행 6열 (30개)'
      : '5행 6열 / 6행 5열 자동 감지 (30개)';

  const slots4Part = [
    {
      type: 'face' as const,
      label: `1. 얼굴 / 표정 시트 (${sheetMode}종)`,
      subtext: `face_sheet.png (${gridSubtext})`,
      sheet: sheets.faceSheet,
      fileName: sheets.faceFileName,
      ref: faceInputRef,
      badgeColor: 'border-orange-500/40 text-orange-300 bg-orange-500/10',
      hint: '코 중심(사각형 중앙)에 맞추어 자동 배치됩니다.',
    },
    {
      type: 'hair' as const,
      label: `2. 헤어 / 머리 시트 (${sheetMode}종)`,
      subtext: `hair_sheet.png (${gridSubtext})`,
      sheet: sheets.hairSheet,
      fileName: sheets.hairFileName,
      ref: hairInputRef,
      badgeColor: 'border-purple-500/40 text-purple-300 bg-purple-500/10',
      hint: '얼굴 위에 씌워지는 헤어스타일입니다.',
    },
    {
      type: 'body' as const,
      label: `3. 상의 / 의상 시트 (${sheetMode}종)`,
      subtext: `body_sheet.png (${gridSubtext})`,
      sheet: sheets.bodySheet,
      fileName: sheets.bodyFileName,
      ref: bodyInputRef,
      badgeColor: 'border-sky-500/40 text-sky-300 bg-sky-500/10',
      hint: '목끝 결합점에 맞추어 정렬됩니다.',
    },
    {
      type: 'leg' as const,
      label: `4. 하의 / 신발 시트 (${sheetMode}종)`,
      subtext: `leg_sheet.png (${gridSubtext})`,
      sheet: sheets.legSheet,
      fileName: sheets.legFileName,
      ref: legInputRef,
      badgeColor: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
      hint: '발끝/바닥선에 맞추어 정렬됩니다.',
    },
  ];

  const slots2Part = [
    {
      type: 'face' as const,
      label: `1. 얼굴 / 표정 시트 (${sheetMode}종)`,
      subtext: `face_sheet.png (${gridSubtext})`,
      sheet: sheets.faceSheet,
      fileName: sheets.faceFileName,
      ref: faceInputRef,
      badgeColor: 'border-orange-500/40 text-orange-300 bg-orange-500/10',
      hint: '코 중심(사각형 중앙)에 맞추어 자동 배치됩니다.',
    },
    {
      type: 'outfit' as const,
      label: `2. 상의+하의 / 의상 시트 (${sheetMode}종)`,
      subtext: `outfit_sheet.png (${gridSubtext})`,
      sheet: sheets.outfitSheet || sheets.bodySheet,
      fileName: sheets.outfitFileName || sheets.bodyFileName,
      ref: outfitInputRef,
      badgeColor: 'border-pink-500/40 text-pink-300 bg-pink-500/10',
      hint: '목선(상의 맨위) 및 허리 기준선에 맞추어 얼굴과 완벽하게 한 벌로 결합됩니다.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <FolderUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                스프라이트 시트 파일 등록
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  {sheetMode}시트
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                  compositionMode === '2part'
                    ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  {compositionMode === '2part' ? '👗 얼굴+상의/하의 2파트' : '🧩 4파트 모드'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {compositionMode === '2part'
                  ? `얼굴 시트와 상의+하의 시트 2개를 등록하면 ${sheetMode}개 슬롯에 맞춰 자동 분할 및 결합 정렬됩니다.`
                  : `얼굴, 헤어, 상의, 하의 4개 시트를 등록하면 ${sheetMode}개 슬롯에 맞춰 자동 분할 및 정렬됩니다.`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar">
          {/* Composition Mode & Sheet Count Controls */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 space-y-3">
            {/* Format Selection: 2-part vs 4-part */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  파트 구성 포맷 선택
                </span>
                <span className="text-[11px] text-slate-400">
                  가지고 계신 이미지 규격에 맞춰 선택하세요
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onSelectCompositionMode && onSelectCompositionMode('2part')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 ${
                    compositionMode === '2part'
                      ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-400 shadow-md ring-2 ring-pink-500/30'
                      : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>👗 2파트 모드 (추천)</span>
                  </div>
                  <span className="text-[10px] font-normal opacity-90">
                    얼굴 30종 + 상의/하의(의상) 30종
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectCompositionMode && onSelectCompositionMode('4part')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 ${
                    compositionMode === '4part'
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-500/30'
                      : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>🧩 4파트 모드</span>
                  </div>
                  <span className="text-[10px] font-normal opacity-90">
                    얼굴 + 헤어 + 상의 + 하의 개별 4종
                  </span>
                </button>
              </div>
            </div>

            {/* Mode Switcher Buttons: 15시트 vs 30시트 */}
            <div className="pt-2.5 border-t border-slate-700/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Grid className="w-4 h-4 text-indigo-400" />
                  시트 칸수 규격 (15칸 / 30칸)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onSelectSheetMode && onSelectSheetMode(15)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                    sheetMode === 15
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md ring-2 ring-indigo-500/30'
                      : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>📁 15시트 모드</span>
                  <span className="text-[10px] font-normal opacity-90">(3행 5열 = 15칸)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectSheetMode && onSelectSheetMode(30)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                    sheetMode === 30
                      ? 'bg-purple-600 text-white border-purple-500 shadow-md ring-2 ring-purple-500/30'
                      : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>📂 30시트 모드</span>
                  <span className="text-[10px] font-normal opacity-90">(5행 6열 / 6행 5열 = 30칸)</span>
                </button>
              </div>

              {/* 30-Sheet Grid Layout Option */}
              {sheetMode === 30 && (
                <div className="pt-2 mt-2 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-300 font-medium">30시트 배열 레이아웃:</span>
                  <div className="flex items-center gap-1.5">
                    {(['auto', '6x5', '5x6'] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => onUpdateGrid30Layout && onUpdateGrid30Layout(l)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition border ${
                          grid30Layout === l
                            ? 'bg-purple-600 text-white border-purple-400 shadow'
                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        {l === 'auto'
                          ? '자동 감지 (가로/세로 비율)'
                          : l === '6x5'
                          ? '5행 6열 (가로형 30개)'
                          : '6행 5열 (세로형 30개)'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* All-in-one Drag & Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingBatch(true);
            }}
            onDragLeave={() => setIsDraggingBatch(false)}
            onDrop={handleBatchDrop}
            onClick={() => batchInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
              isDraggingBatch
                ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
                : 'border-slate-700 bg-slate-800/40 hover:bg-slate-800/80 hover:border-slate-600'
            }`}
          >
            <input
              ref={batchInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files && onBatchUpload(e.target.files)}
            />
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">
                {compositionMode === '2part' ? '얼굴 30종 시트와 상의+하의 30종 시트를' : `${sheetMode}시트 이미지 파일들을`} 여기에 한 번에 드래그하여 등록
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {compositionMode === '2part'
                  ? "파일명에 '얼굴/face' 또는 '상의+하의/의상/outfit/body'가 포함되면 자동으로 분류 등록됩니다."
                  : "파일명에 'face/얼굴', 'hair/헤어', 'body/top/상의', 'leg/bottom/하의'가 포함되면 자동으로 슬롯에 매칭됩니다."}
              </p>
            </div>
          </div>

          {/* Individual Sheet Slots */}
          {compositionMode === '2part' ? (
            /* 2-Part Slots: Face + Outfit (상의+하의) */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {slots2Part.map((s) => (
                <div
                  key={s.type}
                  className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 flex flex-col justify-between gap-3 relative overflow-hidden"
                >
                  <input
                    ref={s.ref}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUploadFile(s.type, file);
                    }}
                  />

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded border inline-block mb-1.5 ${s.badgeColor}`}
                      >
                        {s.label}
                      </span>
                      <p className="text-xs font-medium text-slate-200 truncate max-w-[240px]">
                        {s.fileName || s.subtext}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">{s.hint}</p>
                    </div>
                    {s.sheet && (
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => s.ref.current?.click()}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition flex items-center justify-center gap-1.5"
                    >
                      <FileImage className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{s.sheet ? '이미지 변경' : '파일 선택'}</span>
                    </button>

                    {s.sheet && onOpenGridSliceModal && (
                      <button
                        type="button"
                        onClick={() => onOpenGridSliceModal(s.type)}
                        className="py-2 px-2.5 bg-cyan-950/70 hover:bg-cyan-900/90 text-cyan-200 rounded-lg text-xs font-semibold border border-cyan-500/50 transition flex items-center gap-1.5"
                        title="이 시트의 여백과 스프라이트 간격을 자동 계산하거나 미세 조정합니다."
                      >
                        <Grid className="w-3.5 h-3.5 text-cyan-400" />
                        <span>간격 자동 계산</span>
                      </button>
                    )}

                    {s.type === 'outfit' && (
                      <button
                        type="button"
                        onClick={onSplitOutfitToTopBottom}
                        className="py-2 px-3 bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 rounded-lg text-xs font-semibold border border-purple-500/40 transition flex items-center gap-1.5"
                        title="상의+하의 시트를 허리선 기준으로 반으로 잘라 상의 30개와 하의 30개로 자동 분리합니다."
                      >
                        <Scissors className="w-3.5 h-3.5 text-purple-300" />
                        <span>상의/하의 자동 분리</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* 4-Part Slots: Face, Hair, Top, Bottom */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {slots4Part.map((s) => (
                <div
                  key={s.type}
                  className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700 flex flex-col justify-between gap-3 relative overflow-hidden"
                >
                  <input
                    ref={s.ref}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUploadFile(s.type, file);
                    }}
                  />

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border inline-block mb-1.5 ${s.badgeColor}`}
                      >
                        {s.label}
                      </span>
                      <p className="text-xs font-medium text-slate-200 truncate max-w-[150px]">
                        {s.fileName || s.subtext}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">{s.hint}</p>
                    </div>
                    {s.sheet && (
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => s.ref.current?.click()}
                      className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition flex items-center justify-center gap-1.5"
                    >
                      <FileImage className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{s.sheet ? '변경' : '선택'}</span>
                    </button>

                    {s.sheet && onOpenGridSliceModal && (
                      <button
                        type="button"
                        onClick={() => onOpenGridSliceModal(s.type)}
                        className="py-1.5 px-2 bg-cyan-950/70 hover:bg-cyan-900/90 text-cyan-200 rounded-lg text-[11px] font-semibold border border-cyan-500/50 transition flex items-center gap-1"
                        title="이 시트의 여백과 스프라이트 간격을 자동 계산하거나 미세 조정합니다."
                      >
                        <Grid className="w-3 h-3 text-cyan-400" />
                        <span>간격 자동 계산</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Smart Auto-Alignment Trigger Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-teal-950/50 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
                <Wand2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  스마트 자동 분석 & 기준점 자동 정렬 (얼굴 코 중심 + 의상 목선/허리)
                </span>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  시트 등록 후 클릭하면 {sheetMode}개 모든 슬롯의 얼굴(코 중심 사각형 중앙)과 의상(목선 맨위/허리)을 픽셀 분석하여 조합 시 완벽한 하나의 캐릭터로 결합되도록 자동 배치합니다.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onAutoAlignAllParts && onAutoAlignAllParts()}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/25 transition active:scale-95 shrink-0 flex items-center justify-center gap-1.5 border border-emerald-400/40"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>스마트 자동 정렬 실행</span>
            </button>
          </div>

          {/* Transparency & Cleaning Settings */}
          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>배경 투명화 및 잔여 외곽선 정제 옵션</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">배경 투명화 알고리즘</label>
                <select
                  value={processingSettings.bgRemovalMethod}
                  onChange={(e) =>
                    onUpdateProcessingSettings({
                      bgRemovalMethod: e.target.value as any,
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                >
                  <option value="floodfill">
                    스마트 테두리 플러드필 (내부 흰색 옷 보존 - 추천)
                  </option>
                  <option value="whitekey">전체 흰색 투명화 (Color Key)</option>
                  <option value="none">투명화 안 함 (원본 그대로)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>흰색 판정 허용치 (Tolerance)</span>
                  <span className="font-mono text-indigo-400">
                    {processingSettings.tolerance}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={processingSettings.tolerance}
                  onChange={(e) =>
                    onUpdateProcessingSettings({
                      tolerance: Number(e.target.value),
                    })
                  }
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div className="sm:col-span-2 flex items-center justify-between pt-2 border-t border-slate-800/80">
                <div>
                  <span className="text-slate-300 font-medium block">
                    인접 열 머리카락/장식 침범 방지 테두리 정제
                  </span>
                  <span className="text-[11px] text-slate-400">
                    옆 칸의 긴 머리카락이나 장식이 넘어오는 것을 자동으로 깔끔하게 정돈합니다.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={processingSettings.autoCleanStrayHair}
                  onChange={(e) =>
                    onUpdateProcessingSettings({
                      autoCleanStrayHair: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <button
            onClick={onResetToDemo}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>기본 예시 데이터({sheetMode}종)로 복원</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition"
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
};
