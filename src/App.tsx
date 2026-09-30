import React, { useEffect, useState, useCallback } from 'react';
import {
  GuideLineSettings,
  ProcessingSettings,
  SelectedPart,
  SlotConfig,
  UploadedSheets,
} from './types';
import {
  createGuideTemplateCanvas,
  createMockTiles,
  INITIAL_SLOT_CONFIGS,
} from './utils/sampleData';
import {
  downloadCanvas,
  exportAllCharactersZip,
  sliceSpriteSheet,
} from './utils/imageProcessor';
import { Header } from './components/Header';
import { CanvasStage } from './components/CanvasStage';
import { CharacterInspector } from './components/CharacterInspector';
import { UploadSection } from './components/UploadSection';
import { ExportModal } from './components/ExportModal';
import { BatchGridThumbnails } from './components/BatchGridThumbnails';

export default function App() {
  const [sheets, setSheets] = useState<UploadedSheets>({
    faceSheet: null,
    bodySheet: null,
    legSheet: null,
    guideSheet: null,
  });

  const [headTiles, setHeadTiles] = useState<HTMLCanvasElement[]>([]);
  const [bodyTiles, setBodyTiles] = useState<HTMLCanvasElement[]>([]);
  const [legTiles, setLegTiles] = useState<HTMLCanvasElement[]>([]);
  const [guideImage, setGuideImage] = useState<HTMLImageElement | null>(null);

  const [slotConfigs, setSlotConfigs] = useState<SlotConfig[]>(INITIAL_SLOT_CONFIGS);

  const [guideSettings, setGuideSettings] = useState<GuideLineSettings>({
    showGuideBackground: true,
    guideOpacity: 1.0,
    showEyeLine: true,
    showFootLine: true,
    eyeLineYOffset: 0,
    footLineYOffset: 0,
    showCenterLine: true,
    showBoxBorder: true,
    showNumbers: true,
    showCutMarks: false,
    cutMarkColor: '#94a3b8',
    cutMarkStyle: 'dashed',
    cutMarkWidth: 1.5,
    backgroundColor: 'white',
  });

  const [processingSettings, setProcessingSettings] = useState<ProcessingSettings>({
    bgRemovalMethod: 'floodfill',
    tolerance: 18,
    smoothEdges: true,
    layerOrder: 'head-body-leg',
    autoCleanStrayHair: true, // Default to true to remove neighbor hair bleed!
    sideTrimPx: 6, // Trim 6px edge boundary to cut hair overflow from adjacent columns
  });

  const [activeSlotId, setActiveSlotId] = useState<number | null>(1);
  const [selectedPart, setSelectedPart] = useState<SelectedPart>('body'); // Default to body so user can move top immediately!
  const [zoom, setZoom] = useState<number>(0.65);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [activeTab, setActiveTab] = useState<'stage' | 'inspector' | 'guide'>('stage');

  // Load demo mockup tiles initially
  const loadDemoAssets = useCallback(() => {
    const mockFaces = createMockTiles('face', 15);
    const mockBodies = createMockTiles('body', 15);
    const mockLegs = createMockTiles('leg', 15);

    const guideCanvas = createGuideTemplateCanvas(2400, 1700);
    const guideImg = new Image();
    guideImg.src = guideCanvas.toDataURL();
    guideImg.onload = () => {
      setGuideImage(guideImg);
    };

    setHeadTiles(mockFaces);
    setBodyTiles(mockBodies);
    setLegTiles(mockLegs);
    setSlotConfigs(INITIAL_SLOT_CONFIGS);
  }, []);

  useEffect(() => {
    loadDemoAssets();
  }, [loadDemoAssets]);

  // Re-slice sheets with current processing settings
  const refreshSlicedSheets = useCallback(
    (
      currentSheets: UploadedSheets,
      settings: ProcessingSettings
    ) => {
      if (currentSheets.faceSheet) {
        const sliced = sliceSpriteSheet(currentSheets.faceSheet, 3, 5, settings, true);
        setHeadTiles(sliced);
      }
      if (currentSheets.bodySheet) {
        const sliced = sliceSpriteSheet(currentSheets.bodySheet, 3, 5, settings, false);
        setBodyTiles(sliced);
      }
      if (currentSheets.legSheet) {
        const sliced = sliceSpriteSheet(currentSheets.legSheet, 3, 5, settings, false);
        setLegTiles(sliced);
      }
    },
    []
  );

  const handleUploadFile = (
    type: 'face' | 'body' | 'leg' | 'guide',
    file: File
  ) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setSheets((prev) => {
        const updated = { ...prev };
        if (type === 'face') {
          updated.faceSheet = img;
          updated.faceFileName = file.name;
        } else if (type === 'body') {
          updated.bodySheet = img;
          updated.bodyFileName = file.name;
        } else if (type === 'leg') {
          updated.legSheet = img;
          updated.legFileName = file.name;
        } else if (type === 'guide') {
          updated.guideSheet = img;
          updated.guideFileName = file.name;
          setGuideImage(img);
        }
        refreshSlicedSheets(updated, processingSettings);
        return updated;
      });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleBatchUpload = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      const name = file.name.toLowerCase();
      if (name.includes('face') || name.includes('hair') || name.includes('head')) {
        handleUploadFile('face', file);
      } else if (name.includes('body') || name.includes('top') || name.includes('cloth')) {
        handleUploadFile('body', file);
      } else if (
        name.includes('leg') ||
        name.includes('bottom') ||
        name.includes('skirt') ||
        name.includes('pants')
      ) {
        handleUploadFile('leg', file);
      } else if (
        name.includes('guide') ||
        name.includes('15character') ||
        name.includes('align')
      ) {
        handleUploadFile('guide', file);
      }
    });
  };

  const handleUpdateSlotConfig = (
    id: number,
    updater: (prev: SlotConfig) => SlotConfig
  ) => {
    setSlotConfigs((prev) =>
      prev.map((config) => (config.id === id ? updater(config) : config))
    );
  };

  const handleBatchUpdateConfigs = (
    updater: (prev: SlotConfig) => SlotConfig
  ) => {
    setSlotConfigs((prev) => prev.map((config) => updater(config)));
  };

  const handleResetSlotConfig = (id: number) => {
    setSlotConfigs((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              id,
              name: `캐릭터 #${id}`,
              head: { x: 0, y: 0, scale: 1 },
              body: { x: 0, y: 0, scale: 1 },
              leg: { x: 0, y: 0, scale: 1 },
              global: { x: 0, y: 0, scale: 1 },
              enabled: true,
            }
          : c
      )
    );
  };

  const handleResetAllConfigs = () => {
    setSlotConfigs(INITIAL_SLOT_CONFIGS);
  };

  const handleUpdateProcessingSettings = (
    newSettings: Partial<ProcessingSettings>
  ) => {
    const updated = { ...processingSettings, ...newSettings };
    setProcessingSettings(updated);
    refreshSlicedSheets(sheets, updated);
  };

  const handleUpdateGuideSettings = (
    newSettings: Partial<GuideLineSettings>
  ) => {
    setGuideSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleExportZip = async () => {
    setIsExportingZip(true);
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
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingZip(false);
    }
  };

  // Keyboard navigation for active slot & selected part!
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(
          (e.target as HTMLElement)?.tagName
        )
      ) {
        return;
      }

      const step = e.shiftKey ? 5 : 1;

      if (e.key === 'g' || e.key === 'G') {
        setGuideSettings((prev) => ({
          ...prev,
          showGuideBackground: !prev.showGuideBackground,
        }));
      } else if (e.key === 'c' || e.key === 'C') {
        setGuideSettings((prev) => ({
          ...prev,
          showCutMarks: !prev.showCutMarks,
        }));
      } else if (e.key === 'Escape') {
        setActiveSlotId(null);
      } else if (activeSlotId !== null) {
        let dx = 0;
        let dy = 0;

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          dy = -step;
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          dy = step;
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          dx = -step;
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          dx = step;
        }

        if (dx !== 0 || dy !== 0) {
          handleUpdateSlotConfig(activeSlotId, (p) => {
            if (selectedPart === 'global') {
              return {
                ...p,
                global: { ...p.global, x: p.global.x + dx, y: p.global.y + dy },
              };
            }
            return {
              ...p,
              [selectedPart]: {
                ...p[selectedPart],
                x: p[selectedPart].x + dx,
                y: p[selectedPart].y + dy,
              },
            };
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSlotId, selectedPart]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <Header
        guideSettings={guideSettings}
        onUpdateGuideSettings={handleUpdateGuideSettings}
        onOpenUploadModal={() => setIsUploadOpen(true)}
        onOpenExportModal={() => setIsExportOpen(true)}
        onExportZip={handleExportZip}
        isExportingZip={isExportingZip}
        zoom={zoom}
        onZoomChange={setZoom}
        onResetZoom={() => setZoom(0.65)}
        hasGuideImage={!!guideImage}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <CanvasStage
          headTiles={headTiles}
          bodyTiles={bodyTiles}
          legTiles={legTiles}
          slotConfigs={slotConfigs}
          guideImage={guideImage}
          guideSettings={guideSettings}
          processingSettings={processingSettings}
          activeSlotId={activeSlotId}
          onSelectSlot={setActiveSlotId}
          selectedPart={selectedPart}
          onSelectPart={setSelectedPart}
          onUpdateSlotConfig={handleUpdateSlotConfig}
          zoom={zoom}
          onZoomChange={setZoom}
          onUpdateGuideSettings={handleUpdateGuideSettings}
        />

        <CharacterInspector
          activeSlotId={activeSlotId}
          onSelectSlot={setActiveSlotId}
          selectedPart={selectedPart}
          onSelectPart={setSelectedPart}
          slotConfigs={slotConfigs}
          onUpdateSlotConfig={handleUpdateSlotConfig}
          onBatchUpdateConfigs={handleBatchUpdateConfigs}
          onResetSlotConfig={handleResetSlotConfig}
          onResetAllConfigs={handleResetAllConfigs}
          headTiles={headTiles}
          bodyTiles={bodyTiles}
          legTiles={legTiles}
          guideSettings={guideSettings}
          onUpdateGuideSettings={handleUpdateGuideSettings}
          processingSettings={processingSettings}
          onUpdateProcessingSettings={handleUpdateProcessingSettings}
          onReSliceSheets={() => refreshSlicedSheets(sheets, processingSettings)}
        />
      </div>

      <BatchGridThumbnails
        slotConfigs={slotConfigs}
        activeSlotId={activeSlotId}
        onSelectSlot={(id) => setActiveSlotId(id)}
        headTiles={headTiles}
        bodyTiles={bodyTiles}
        legTiles={legTiles}
      />

      <UploadSection
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        sheets={sheets}
        onUploadFile={handleUploadFile}
        onBatchUpload={handleBatchUpload}
        onResetToDemo={loadDemoAssets}
        processingSettings={processingSettings}
        onUpdateProcessingSettings={handleUpdateProcessingSettings}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        headTiles={headTiles}
        bodyTiles={bodyTiles}
        legTiles={legTiles}
        slotConfigs={slotConfigs}
        guideImage={guideImage}
        guideSettings={guideSettings}
        processingSettings={processingSettings}
      />
    </div>
  );
}
