import React, { useState } from 'react';
import {
  AnchorSettings,
  CompositionMode,
  GuideDisplaySettings,
  PartCategory,
  ProcessingSettings,
  SheetMode,
  SlotConfig,
} from '../types';
import {
  downloadCanvas,
  exportAllAssembledZip,
  exportAllPartsZip,
  exportPartZip,
  getGridDimensions,
  renderPartGridCanvas,
  splitOutfitTilesToTopAndBottom,
} from '../utils/imageProcessor';
import {
  Archive,
  Check,
  Download,
  FileArchive,
  Layers,
  Sparkles,
  X,
  FileCode,
  Grid,
  Scissors,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  faceTiles: HTMLCanvasElement[];
  hairTiles: HTMLCanvasElement[];
  bodyTiles: HTMLCanvasElement[];
  legTiles: HTMLCanvasElement[];
  headTiles?: HTMLCanvasElement[]; // 호환성
  outfitTiles?: HTMLCanvasElement[]; // 상의+하의 30종
  slotConfigs: SlotConfig[];
  anchorSettings: AnchorSettings;
  guideSettings: GuideDisplaySettings;
  processingSettings: ProcessingSettings;
  sheetMode?: SheetMode;
  compositionMode?: CompositionMode;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  faceTiles,
  hairTiles,
  bodyTiles,
  legTiles,
  headTiles,
  outfitTiles,
  slotConfigs,
  anchorSettings,
  guideSettings,
  processingSettings,
  sheetMode = 15,
  compositionMode = '2part',
}) => {
  const [targetSize, setTargetSize] = useState<number>(512);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const actualHairTiles = hairTiles && hairTiles.length > 0 ? hairTiles : (headTiles || []);
  const actualOutfitTiles = outfitTiles && outfitTiles.length > 0 ? outfitTiles : bodyTiles;
  const actualCount =
    sheetMode ||
    Math.max(faceTiles.length, actualHairTiles.length, bodyTiles.length, legTiles.length, actualOutfitTiles.length, 15);

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1. Export Face PNGs
  const handleExportFaceZip = async () => {
    setIsExporting(true);
    setExportSuccessMsg(null);
    try {
      const blob = await exportPartZip('face', faceTiles, slotConfigs, targetSize, actualCount);
      triggerDownload(blob, `${actualCount}_face_pngs_${targetSize}px.zip`);
      setExportSuccessMsg(`얼굴 ${actualCount}개 PNG 파일 압축 다운로드가 완료되었습니다!`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Export Outfit (상의+하의) PNGs
  const handleExportOutfitZip = async () => {
    setIsExporting(true);
    setExportSuccessMsg(null);
    try {
      const blob = await exportPartZip('outfit', actualOutfitTiles, slotConfigs, targetSize, actualCount);
      triggerDownload(blob, `${actualCount}_outfit_top_bottom_pngs_${targetSize}px.zip`);
      setExportSuccessMsg(`상의+하의 ${actualCount}개 PNG 파일 압축 다운로드가 완료되었습니다!`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Export Auto-Split Top and Bottom PNGs
  const handleExportSplitTopBottomZip = async () => {
    setIsExporting(true);
    setExportSuccessMsg(null);
    try {
      const { topTiles, bottomTiles } = splitOutfitTilesToTopAndBottom(actualOutfitTiles);
      const blob = await exportAllPartsZip(
        faceTiles,
        [],
        topTiles,
        bottomTiles,
        slotConfigs,
        anchorSettings,
        targetSize,
        actualCount
      );
      triggerDownload(blob, `${actualCount}_split_top_and_bottom_pngs_${targetSize}px.zip`);
      setExportSuccessMsg(`상의+하의에서 분할된 상의 ${actualCount}개 + 하의 ${actualCount}개 PNG ZIP 다운로드 완료!`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  // 4. Export Hair PNGs
  const handleExportHairZip = async () => {
    setIsExporting(true);
    setExportSuccessMsg(null);
    try {
      const blob = await exportPartZip('hair', actualHairTiles, slotConfigs, targetSize, actualCount);
      triggerDownload(blob, `${actualCount}_hair_pngs_${targetSize}px.zip`);
      setExportSuccessMsg(`헤어 ${actualCount}개 PNG 파일 압축 다운로드가 완료되었습니다!`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  // 5. Export Top PNGs
  const handleExportTopZip = async () => {
    setIsExporting(true);
    setExportSuccessMsg(null);
    try {
      const blob = await exportPartZip('body', bodyTiles, slotConfigs, targetSize, actualCount);
      triggerDownload(blob, `${actualCount}_top_pngs_${targetSize}px.zip`);
      setExportSuccessMsg(`상의 ${actualCount}개 PNG 파일 압축 다운로드가 완료되었습니다!`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  // 6. Export Bottom PNGs
  const handleExportBottomZip = async () => {
    setIsExporting(true);
    setExportSuccessMsg(null);
    try {
      const blob = await exportPartZip('leg', legTiles, slotConfigs, targetSize, actualCount);
      triggerDownload(blob, `${actualCount}_bottom_pngs_${targetSize}px.zip`);
      setExportSuccessMsg(`하의 ${actualCount}개 PNG 파일 압축 다운로드가 완료되었습니다!`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  // 7. Export Assembled Characters (Face + Outfit or 4 Parts)
  const handleExportAssembledZip = async () => {
    setIsExporting(true);
    setExportSuccessMsg(null);
    try {
      const blob = await exportAllAssembledZip(
        faceTiles,
        compositionMode === '2part' ? [] : actualHairTiles,
        bodyTiles,
        legTiles,
        slotConfigs,
        anchorSettings,
        processingSettings.layerOrder,
        actualCount,
        compositionMode === '2part' ? actualOutfitTiles : undefined
      );
      triggerDownload(blob, `${actualCount}_assembled_characters_${targetSize}px.zip`);
      setExportSuccessMsg(`완성된 ${actualCount}종 풀세트 캐릭터 PNG ZIP 압축 다운로드 완료!`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  // 8. Export All Parts Package (Game Engine Package with Manifest JSON)
  const handleExportAllParts = async () => {
    setIsExporting(true);
    setExportSuccessMsg(null);
    try {
      const blob = await exportAllPartsZip(
        faceTiles,
        compositionMode === '2part' ? [] : actualHairTiles,
        bodyTiles,
        legTiles,
        slotConfigs,
        anchorSettings,
        targetSize,
        actualCount,
        compositionMode === '2part' ? actualOutfitTiles : undefined
      );
      const filename =
        compositionMode === '2part'
          ? `${actualCount}_character_2part_complete_package.zip`
          : `${actualCount * 4}_character_4parts_complete_package.zip`;
      triggerDownload(blob, filename);
      setExportSuccessMsg(`게임 엔진용 통합 에셋 패키지 ZIP 다운로드가 완료되었습니다!`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  // 9. Export Aligned Sprite Sheet (PNG)
  const handleExportSpriteSheet = (part: PartCategory) => {
    const tiles =
      part === 'face'
        ? faceTiles
        : part === 'hair' || part === 'head'
        ? actualHairTiles
        : part === 'body'
        ? bodyTiles
        : part === 'outfit'
        ? actualOutfitTiles
        : legTiles;

    const { rows, cols } = getGridDimensions(sheetMode, processingSettings.grid30Layout);
    const canvas = document.createElement('canvas');
    canvas.width = cols * 400;
    canvas.height = rows * 400;

    renderPartGridCanvas(
      canvas,
      part,
      tiles,
      slotConfigs,
      anchorSettings,
      {
        ...guideSettings,
        showAnchorCrosshair: false,
        showCenterLine: false,
        showReferenceLines: false,
        showBoxBorder: false,
        showNumbers: false,
        showCutMarks: false,
        backgroundColor: 'transparent',
      },
      null,
      null,
      rows,
      cols
    );

    const prefix =
      part === 'face'
        ? 'face'
        : part === 'hair'
        ? 'hair'
        : part === 'body'
        ? 'top'
        : part === 'outfit'
        ? 'outfit'
        : 'bottom';

    downloadCanvas(canvas, `${prefix}_aligned_${sheetMode}sheet.png`);
    setExportSuccessMsg(`${sheetMode}칸 투명 정렬 스프라이트 시트 다운로드가 완료되었습니다!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                게임 에셋 내보내기 (Export Assets)
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-semibold">
                  {compositionMode === '2part' ? `2파트 모드 (${actualCount}종)` : `4파트 모드 (${actualCount}종)`}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {compositionMode === '2part'
                  ? `얼굴 ${actualCount}종, 상의+하의 ${actualCount}종 개별 PNG 또는 완성형 캐릭터를 원하는 해상도로 내보냅니다.`
                  : `얼굴, 헤어, 상의, 하의 ${actualCount}개 개별 PNG 또는 풀 패키지를 원하는 해상도로 내보냅니다.`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar text-xs">
          {/* Resolution Selector */}
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-slate-200 block mb-0.5">
                개별 파트 해상도 (Square PNG Size)
              </span>
              <p className="text-[11px] text-slate-400">
                각 캐릭터 파트가 정중앙 및 기준점에 정렬되어 정사각형 투명 PNG로 추출됩니다.
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-700">
              {[256, 512, 1024].map((size) => (
                <button
                  key={size}
                  onClick={() => setTargetSize(size)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    targetSize === size
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {size} x {size}px
                </button>
              ))}
            </div>
          </div>

          {/* Success Banner */}
          {exportSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{exportSuccessMsg}</span>
            </div>
          )}

          {/* Separate PNGs by Category */}
          <div>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2.5">
              📁 파트별 {actualCount}개 개별 PNG 압축 다운로드
            </span>

            {compositionMode === '2part' ? (
              /* 2-Part Mode: Face + Outfit (상의+하의) + Auto-split */
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Face */}
                <div className="p-4 rounded-xl bg-slate-800/60 border border-orange-500/30 flex flex-col justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-orange-300 block mb-1">
                      😊 얼굴 {actualCount}개 PNG (ZIP)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      코 중심 사각형 정중앙 정렬<br />
                      face_01.png ~ face_{String(actualCount).padStart(2, '0')}.png
                    </p>
                  </div>
                  <button
                    onClick={handleExportFaceZip}
                    disabled={isExporting}
                    className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <FileArchive className="w-3.5 h-3.5" />
                    <span>{isExporting ? '압축 중...' : `얼굴 ${actualCount}개 ZIP`}</span>
                  </button>
                </div>

                {/* Outfit (상의+하의) */}
                <div className="p-4 rounded-xl bg-slate-800/60 border border-pink-500/30 flex flex-col justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-pink-300 block mb-1">
                      👗 상의+하의(의상) {actualCount}개 PNG (ZIP)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      목선(상단) 및 허리 기준 정렬<br />
                      outfit_01.png ~ outfit_{String(actualCount).padStart(2, '0')}.png
                    </p>
                  </div>
                  <button
                    onClick={handleExportOutfitZip}
                    disabled={isExporting}
                    className="w-full py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-semibold shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <FileArchive className="w-3.5 h-3.5" />
                    <span>{isExporting ? '압축 중...' : `의상 ${actualCount}개 ZIP`}</span>
                  </button>
                </div>

                {/* Auto Split: Top 30 + Bottom 30 */}
                <div className="p-4 rounded-xl bg-slate-800/60 border border-purple-500/30 flex flex-col justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-purple-300 block mb-1">
                      ✂️ 상의·하의 분할 {actualCount * 2}개 PNG (ZIP)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      허리선 기준으로 자동 분리<br />
                      상의 {actualCount}개 + 하의 {actualCount}개 분할 PNG
                    </p>
                  </div>
                  <button
                    onClick={handleExportSplitTopBottomZip}
                    disabled={isExporting}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>{isExporting ? '압축 중...' : `분할 파트 ${actualCount * 2}개 ZIP`}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* 4-Part Mode */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Face */}
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-orange-500/30 flex flex-col justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-orange-300 block mb-1">
                      😊 얼굴 {actualCount}개 PNG (ZIP)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      얼굴형/표정 정렬<br />face_01.png ~ face_{String(actualCount).padStart(2, '0')}.png
                    </p>
                  </div>
                  <button
                    onClick={handleExportFaceZip}
                    disabled={isExporting}
                    className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <FileArchive className="w-3.5 h-3.5" />
                    <span>{isExporting ? '압축 중...' : `얼굴 ${actualCount}개 ZIP`}</span>
                  </button>
                </div>

                {/* Hair */}
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-purple-500/30 flex flex-col justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-purple-300 block mb-1">
                      💇 헤어 {actualCount}개 PNG (ZIP)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      코 중심점 기준 결합<br />hair_01.png ~ hair_{String(actualCount).padStart(2, '0')}.png
                    </p>
                  </div>
                  <button
                    onClick={handleExportHairZip}
                    disabled={isExporting}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <FileArchive className="w-3.5 h-3.5" />
                    <span>{isExporting ? '압축 중...' : `헤어 ${actualCount}개 ZIP`}</span>
                  </button>
                </div>

                {/* Top */}
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-sky-500/30 flex flex-col justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-sky-300 block mb-1">
                      👕 상의 {actualCount}개 PNG (ZIP)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      목끝 결합점 기준 정렬<br />top_01.png ~ top_{String(actualCount).padStart(2, '0')}.png
                    </p>
                  </div>
                  <button
                    onClick={handleExportTopZip}
                    disabled={isExporting}
                    className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <FileArchive className="w-3.5 h-3.5" />
                    <span>{isExporting ? '압축 중...' : `상의 ${actualCount}개 ZIP`}</span>
                  </button>
                </div>

                {/* Bottom */}
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-amber-500/30 flex flex-col justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-amber-300 block mb-1">
                      👖 하의 {actualCount}개 PNG (ZIP)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      발끝 바닥선 기준 정렬<br />bottom_01.png ~ bottom_{String(actualCount).padStart(2, '0')}.png
                    </p>
                  </div>
                  <button
                    onClick={handleExportBottomZip}
                    disabled={isExporting}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <FileArchive className="w-3.5 h-3.5" />
                    <span>{isExporting ? '압축 중...' : `하의 ${actualCount}개 ZIP`}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Master Package */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/70 via-purple-950/70 to-pink-950/70 border border-indigo-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shrink-0">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  🎁 {actualCount}개 모듈러 파트 풀 패키지 (게임 엔진용)
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  {compositionMode === '2part'
                    ? `/face(${actualCount}개), /outfit(${actualCount}개) 폴더와 관절 오프셋 메타데이터(character_parts_manifest.json)가 완벽히 포함됩니다.`
                    : `/face(${actualCount}개), /hair(${actualCount}개), /top(${actualCount}개), /bottom(${actualCount}개) 폴더와 메타데이터가 완벽히 포함됩니다.`}
                </p>
              </div>
            </div>

            <button
              onClick={handleExportAllParts}
              disabled={isExporting}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-lg transition active:scale-95 shrink-0 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? '압축 중...' : `풀 패키지 ZIP 다운로드`}</span>
            </button>
          </div>

          {/* Additional Options: Assembled Characters & Sprite Sheets */}
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              기타 출력 옵션
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Assembled Sets */}
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200 block">
                    완성형 캐릭터 {actualCount}세트 ZIP
                  </span>
                  <p className="text-[11px] text-slate-400">
                    {compositionMode === '2part'
                      ? `얼굴+상의/하의가 결합된 완성 풀바디 투명 PNG ${actualCount}장`
                      : `얼굴+헤어+상의+하의가 모두 조립된 풀바디 투명 PNG ${actualCount}장`}
                  </p>
                </div>
                <button
                  onClick={handleExportAssembledZip}
                  disabled={isExporting}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 shrink-0 ml-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>다운로드</span>
                </button>
              </div>

              {/* Grid Sprite Sheets */}
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col justify-between gap-2">
                <div>
                  <span className="font-semibold text-slate-200 block">
                    투명 정렬 {actualCount}칸 스프라이트 시트
                  </span>
                  <p className="text-[11px] text-slate-400">
                    보정 오프셋이 적용된 원본 규격 투명 PNG
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => handleExportSpriteSheet('face')}
                    className="flex-1 min-w-[70px] py-1.5 bg-slate-800 hover:bg-slate-700 text-orange-300 rounded text-[11px] font-semibold border border-slate-700"
                  >
                    얼굴 시트
                  </button>
                  {compositionMode === '2part' ? (
                    <button
                      onClick={() => handleExportSpriteSheet('outfit')}
                      className="flex-1 min-w-[70px] py-1.5 bg-slate-800 hover:bg-slate-700 text-pink-300 rounded text-[11px] font-semibold border border-slate-700"
                    >
                      상의+하의 시트
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleExportSpriteSheet('hair')}
                        className="flex-1 min-w-[60px] py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded text-[11px] font-semibold border border-slate-700"
                      >
                        헤어 시트
                      </button>
                      <button
                        onClick={() => handleExportSpriteSheet('body')}
                        className="flex-1 min-w-[60px] py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded text-[11px] font-semibold border border-slate-700"
                      >
                        상의 시트
                      </button>
                      <button
                        onClick={() => handleExportSpriteSheet('leg')}
                        className="flex-1 min-w-[60px] py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-[11px] font-semibold border border-slate-700"
                      >
                        하의 시트
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            투명 배경(RGBA) 32-bit 무손실 PNG로 압축 저장됩니다.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
