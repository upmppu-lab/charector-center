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
  FolderUp
} from 'lucide-react';
import { ProcessingSettings, UploadedSheets } from '../types';

interface UploadSectionProps {
  isOpen: boolean;
  onClose: () => void;
  sheets: UploadedSheets;
  onUploadFile: (type: 'face' | 'body' | 'leg' | 'guide', file: File) => void;
  onBatchUpload: (files: FileList | File[]) => void;
  onResetToDemo: () => void;
  processingSettings: ProcessingSettings;
  onUpdateProcessingSettings: (settings: Partial<ProcessingSettings>) => void;
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
}) => {
  const [isDraggingBatch, setIsDraggingBatch] = useState(false);
  const faceInputRef = useRef<HTMLInputElement>(null);
  const bodyInputRef = useRef<HTMLInputElement>(null);
  const legInputRef = useRef<HTMLInputElement>(null);
  const guideInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleBatchDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingBatch(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onBatchUpload(e.dataTransfer.files);
    }
  };

  const slots = [
    {
      type: 'face' as const,
      label: '1. 헤어 / 얼굴 시트 (15종)',
      subtext: 'face_front.png (3행 5열)',
      sheet: sheets.faceSheet,
      fileName: sheets.faceFileName,
      ref: faceInputRef,
      badgeColor: 'border-purple-500/40 text-purple-300 bg-purple-500/10',
    },
    {
      type: 'body' as const,
      label: '2. 상의 / 의상 시트 (15종)',
      subtext: 'body_front.png (3행 5열)',
      sheet: sheets.bodySheet,
      fileName: sheets.bodyFileName,
      ref: bodyInputRef,
      badgeColor: 'border-sky-500/40 text-sky-300 bg-sky-500/10',
    },
    {
      type: 'leg' as const,
      label: '3. 하의 / 신발 시트 (15종)',
      subtext: 'leg_front.png (3행 5열)',
      sheet: sheets.legSheet,
      fileName: sheets.legFileName,
      ref: legInputRef,
      badgeColor: 'border-pink-500/40 text-pink-300 bg-pink-500/10',
    },
    {
      type: 'guide' as const,
      label: '4. 가이드라인 양식 배경',
      subtext: '15characters_guide_aligned_v1.png',
      sheet: sheets.guideSheet,
      fileName: sheets.guideFileName,
      ref: guideInputRef,
      badgeColor: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <FolderUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                이미지 파일 불러오기 & 배경 설정
              </h2>
              <p className="text-xs text-slate-400">
                헤어/얼굴, 상의, 하의 3종 시트와 가이드 양식을 업로드하세요.
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6">
          {/* Quick 1-Step Batch Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingBatch(true);
            }}
            onDragLeave={() => setIsDraggingBatch(false)}
            onDrop={handleBatchDrop}
            onClick={() => batchInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
              isDraggingBatch
                ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
                : 'border-slate-700 hover:border-indigo-500 bg-slate-800/40 hover:bg-slate-800/70'
            }`}
          >
            <input
              ref={batchInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onBatchUpload(e.target.files);
                }
              }}
            />
            <div className="p-3 bg-indigo-500/20 text-indigo-300 rounded-full">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">
                4개 이미지 파일을 여기에 한 번에 드래그하여 놓으세요
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                파일 이름(face/body/leg/guide)을 자동 감지하여 각 슬롯에 배치합니다
              </p>
            </div>
          </div>

          {/* 4 Dedicated Slots */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {slots.map((s) => (
              <div
                key={s.type}
                onClick={() => s.ref.current?.click()}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  s.sheet
                    ? 'bg-slate-800/70 border-emerald-500/30 hover:border-emerald-500/50'
                    : 'bg-slate-800/30 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                <input
                  ref={s.ref}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUploadFile(s.type, f);
                  }}
                />
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-lg bg-slate-700/50 border border-slate-600 flex items-center justify-center shrink-0 overflow-hidden">
                    {s.sheet ? (
                      <img
                        src={s.sheet.src}
                        alt={s.label}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileImage className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white truncate">
                        {s.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      {s.fileName || s.subtext}
                    </p>
                    {s.sheet && (
                      <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3" /> 등록 완료 (
                        {s.sheet.naturalWidth}x{s.sheet.naturalHeight}px)
                      </p>
                    )}
                  </div>
                </div>

                <span className="text-xs font-medium px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md shrink-0 ml-2">
                  {s.sheet ? '변경' : '선택'}
                </span>
              </div>
            ))}
          </div>

          {/* Background Transparency Settings */}
          <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">
                  스마트 배경 투명화 설정
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                외곽 연결 플러드필 방식은 흰 셔츠·양말이 보존됩니다
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() =>
                  onUpdateProcessingSettings({ bgRemovalMethod: 'floodfill' })
                }
                className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition ${
                  processingSettings.bgRemovalMethod === 'floodfill'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-white flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" /> 스마트 플러드필
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  외곽 연결 배경만 투명화 (권장)
                </div>
              </button>

              <button
                onClick={() =>
                  onUpdateProcessingSettings({ bgRemovalMethod: 'whitekey' })
                }
                className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition ${
                  processingSettings.bgRemovalMethod === 'whitekey'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-white">전체 흰색 제거</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  모든 흰색 픽셀 투명화
                </div>
              </button>

              <button
                onClick={() =>
                  onUpdateProcessingSettings({ bgRemovalMethod: 'none' })
                }
                className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition ${
                  processingSettings.bgRemovalMethod === 'none'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-white">배경 유지 (원본)</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  이미 투명 PNG인 경우
                </div>
              </button>
            </div>

            {/* Tolerance slider */}
            {processingSettings.bgRemovalMethod !== 'none' && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>배경 감도 (오차 허용치)</span>
                  <span className="font-mono text-indigo-400">
                    {processingSettings.tolerance}
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
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
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onResetToDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>데모 샘플로 초기화</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition"
          >
            적용하고 작업 계속하기
          </button>
        </div>
      </div>
    </div>
  );
};
