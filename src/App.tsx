import React, { useEffect, useState, useCallback } from 'react';
import {
  ActiveAppView,
  AnchorSettings,
  CompositionMode,
  Grid30Layout,
  GuideDisplaySettings,
  PartCategory,
  ProcessingSettings,
  SheetMode,
  SheetSliceConfig,
  SlotConfig,
  UploadedSheets,
} from './types';
import {
  createMockTiles,
  DEFAULT_ANCHOR_SETTINGS,
  DEFAULT_GUIDE_SETTINGS,
  INITIAL_SLOT_CONFIGS,
} from './utils/sampleData';
import {
  analyzeAndAutoAlignPartTile,
  autoAlignAllModularParts,
  autoAlignAllTilesForCategory,
  autoAlignAllTilesToFirstCharacter,
  autoCalculateSpriteGrid,
  getGridDimensions,
  sliceSpriteSheet,
  splitOutfitTilesToTopAndBottom,
  splitFullbodyTilesToFaceAndOutfit,
} from './utils/imageProcessor';
import { Header } from './components/Header';
import { CanvasStage } from './components/CanvasStage';
import { CharacterInspector } from './components/CharacterInspector';
import { GameCharacterCustomizer } from './components/GameCharacterCustomizer';
import { UploadSection } from './components/UploadSection';
import { ExportModal } from './components/ExportModal';
import { GridSliceModal } from './components/GridSliceModal';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function App() {
  const [sheets, setSheets] = useState<UploadedSheets>({
    faceSheet: null,
    hairSheet: null,
    bodySheet: null,
    legSheet: null,
    outfitSheet: null,
    fullbodySheet: null,
  });

  // User specifically requested: 얼굴 30종, 상의+하의 30종
  const [sheetMode, setSheetMode] = useState<SheetMode>(30);
  const [compositionMode, setCompositionMode] = useState<CompositionMode>('2part');
  const [grid30Layout, setGrid30Layout] = useState<Grid30Layout>('auto');

  // Per-sheet slice and gap configurations (margins, gutters, offsets)
  const [sheetSliceConfigs, setSheetSliceConfigs] = useState<Record<string, SheetSliceConfig>>({});
  const [sliceModalTarget, setSliceModalTarget] = useState<'face' | 'hair' | 'body' | 'leg' | 'outfit' | 'fullbody' | null>(null);

  const [faceTiles, setFaceTiles] = useState<HTMLCanvasElement[]>([]);
  const [hairTiles, setHairTiles] = useState<HTMLCanvasElement[]>([]);
  const [bodyTiles, setBodyTiles] = useState<HTMLCanvasElement[]>([]);
  const [legTiles, setLegTiles] = useState<HTMLCanvasElement[]>([]);
  const [outfitTiles, setOutfitTiles] = useState<HTMLCanvasElement[]>([]);
  const [fullbodyTiles, setFullbodyTiles] = useState<HTMLCanvasElement[]>([]);

  const [slotConfigs, setSlotConfigs] = useState<SlotConfig[]>(INITIAL_SLOT_CONFIGS);
  const [anchorSettings, setAnchorSettings] = useState<AnchorSettings>(DEFAULT_ANCHOR_SETTINGS);
  const [guideSettings, setGuideSettings] = useState<GuideDisplaySettings>(DEFAULT_GUIDE_SETTINGS);

  const [processingSettings, setProcessingSettings] = useState<ProcessingSettings>({
    bgRemovalMethod: 'floodfill',
    tolerance: 20,
    smoothEdges: true,
    layerOrder: 'hair-face-body-leg',
    autoCleanStrayHair: true,
    sideTrimPx: 6,
  });

  // Default view: game-customizer
  const [activeView, setActiveView] = useState<ActiveAppView>('game-customizer');
  const [activeSlotId, setActiveSlotId] = useState<number | null>(1);
  const [zoom, setZoom] = useState<number>(0.32); // Optimal initial zoom for 30 slots
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Synchronized selected parts for game character customizer
  const [selectedFace, setSelectedFace] = useState<number>(1);
  const [selectedHair, setSelectedHair] = useState<number>(1);
  const [selectedTop, setSelectedTop] = useState<number>(1);
  const [selectedBottom, setSelectedBottom] = useState<number>(1);
  const [selectedOutfit, setSelectedOutfit] = useState<number>(1);
  const [selectedFullbody, setSelectedFullbody] = useState<number>(1);

  // Load demo mock tiles for all parts (얼굴 30종, 상의+하의 30종, 전신 30종, 헤어, 상의, 하의)
  const loadDemoAssets = useCallback((mode: SheetMode = sheetMode) => {
    const mockFaces = createMockTiles('face', mode);
    const mockHairs = createMockTiles('hair', mode);
    const mockBodies = createMockTiles('body', mode);
    const mockLegs = createMockTiles('leg', mode);
    const mockOutfits = createMockTiles('outfit', mode);
    const mockFullbody = createMockTiles('fullbody', mode);

    setFaceTiles(mockFaces);
    setHairTiles(mockHairs);
    setBodyTiles(mockBodies);
    setLegTiles(mockLegs);
    setOutfitTiles(mockOutfits);
    setFullbodyTiles(mockFullbody);
    setSlotConfigs(INITIAL_SLOT_CONFIGS);
    setAnchorSettings(DEFAULT_ANCHOR_SETTINGS);
  }, [sheetMode]);

  useEffect(() => {
    loadDemoAssets(sheetMode);
  }, []);

  // Re-slice sheets with current processing settings, grid dimensions, and calculated gap intervals
  const refreshSlicedSheets = useCallback(
    (
      currentSheets: UploadedSheets,
      settings: ProcessingSettings,
      mode: SheetMode = sheetMode,
      layout: Grid30Layout = grid30Layout,
      overrideConfigs?: Record<string, SheetSliceConfig>,
      autoAlignTarget?: 'face' | 'hair' | 'body' | 'leg' | 'outfit' | 'fullbody' | 'all'
    ) => {
      const configs = overrideConfigs || sheetSliceConfigs;

      if (currentSheets.faceSheet) {
        const gridDim = getGridDimensions(
          mode,
          layout,
          currentSheets.faceSheet.width,
          currentSheets.faceSheet.height
        );
        const effectiveRows = configs.face?.rows || gridDim.rows;
        const effectiveCols = configs.face?.cols || gridDim.cols;
        const sliced = sliceSpriteSheet(
          currentSheets.faceSheet,
          effectiveRows,
          effectiveCols,
          settings,
          true,
          configs.face
        );
        setFaceTiles(sliced);
        if (autoAlignTarget === 'face' || autoAlignTarget === 'all') {
          setSlotConfigs((prev) => autoAlignAllTilesToFirstCharacter('face', sliced, prev, anchorSettings));
        }
      }
      if (currentSheets.outfitSheet) {
        const gridDim = getGridDimensions(
          mode,
          layout,
          currentSheets.outfitSheet.width,
          currentSheets.outfitSheet.height
        );
        const effectiveRows = configs.outfit?.rows || gridDim.rows;
        const effectiveCols = configs.outfit?.cols || gridDim.cols;
        const sliced = sliceSpriteSheet(
          currentSheets.outfitSheet,
          effectiveRows,
          effectiveCols,
          settings,
          false,
          configs.outfit
        );
        setOutfitTiles(sliced);
        if (autoAlignTarget === 'outfit' || autoAlignTarget === 'all') {
          setSlotConfigs((prev) => autoAlignAllTilesToFirstCharacter('outfit', sliced, prev, anchorSettings));
        }
      }
      if (currentSheets.hairSheet) {
        const gridDim = getGridDimensions(
          mode,
          layout,
          currentSheets.hairSheet.width,
          currentSheets.hairSheet.height
        );
        const effectiveRows = configs.hair?.rows || gridDim.rows;
        const effectiveCols = configs.hair?.cols || gridDim.cols;
        const sliced = sliceSpriteSheet(
          currentSheets.hairSheet,
          effectiveRows,
          effectiveCols,
          settings,
          false,
          configs.hair
        );
        setHairTiles(sliced);
        if (autoAlignTarget === 'hair' || autoAlignTarget === 'all') {
          setSlotConfigs((prev) => autoAlignAllTilesToFirstCharacter('hair', sliced, prev, anchorSettings));
        }
      }
      if (currentSheets.bodySheet) {
        const gridDim = getGridDimensions(
          mode,
          layout,
          currentSheets.bodySheet.width,
          currentSheets.bodySheet.height
        );
        const effectiveRows = configs.body?.rows || gridDim.rows;
        const effectiveCols = configs.body?.cols || gridDim.cols;
        const sliced = sliceSpriteSheet(
          currentSheets.bodySheet,
          effectiveRows,
          effectiveCols,
          settings,
          false,
          configs.body
        );
        setBodyTiles(sliced);
        if (autoAlignTarget === 'body' || autoAlignTarget === 'all') {
          setSlotConfigs((prev) => autoAlignAllTilesToFirstCharacter('body', sliced, prev, anchorSettings));
        }
      }
      if (currentSheets.legSheet) {
        const gridDim = getGridDimensions(
          mode,
          layout,
          currentSheets.legSheet.width,
          currentSheets.legSheet.height
        );
        const effectiveRows = configs.leg?.rows || gridDim.rows;
        const effectiveCols = configs.leg?.cols || gridDim.cols;
        const sliced = sliceSpriteSheet(
          currentSheets.legSheet,
          effectiveRows,
          effectiveCols,
          settings,
          false,
          configs.leg
        );
        setLegTiles(sliced);
        if (autoAlignTarget === 'leg' || autoAlignTarget === 'all') {
          setSlotConfigs((prev) => autoAlignAllTilesToFirstCharacter('leg', sliced, prev, anchorSettings));
        }
      }
      if (currentSheets.fullbodySheet) {
        const gridDim = getGridDimensions(
          mode,
          layout,
          currentSheets.fullbodySheet.width,
          currentSheets.fullbodySheet.height
        );
        const effectiveRows = configs.fullbody?.rows || gridDim.rows;
        const effectiveCols = configs.fullbody?.cols || gridDim.cols;
        const sliced = sliceSpriteSheet(
          currentSheets.fullbodySheet,
          effectiveRows,
          effectiveCols,
          settings,
          false,
          configs.fullbody
        );
        setFullbodyTiles(sliced);
        if (autoAlignTarget === 'fullbody' || autoAlignTarget === 'all') {
          setSlotConfigs((prev) => autoAlignAllTilesToFirstCharacter('fullbody', sliced, prev, anchorSettings));
        }
      }
    },
    [sheetMode, grid30Layout, sheetSliceConfigs, anchorSettings]
  );

  // Switch between 15 and 30 sheet modes
  const handleSelectSheetMode = (mode: SheetMode) => {
    setSheetMode(mode);
    const hasUploadedSheets = Boolean(
      sheets.faceSheet || sheets.hairSheet || sheets.bodySheet || sheets.legSheet || sheets.outfitSheet || sheets.fullbodySheet
    );
    if (hasUploadedSheets) {
      refreshSlicedSheets(sheets, processingSettings, mode, grid30Layout);
    } else {
      loadDemoAssets(mode);
    }
  };

  // Open upload modal explicitly for 15-sheet or 30-sheet
  const handleOpenUploadModal = (mode?: 15 | 30) => {
    if (mode && mode !== sheetMode) {
      handleSelectSheetMode(mode);
    }
    setIsUploadOpen(true);
  };

  // Open interactive grid slicing gap calibration modal
  const handleOpenSliceModal = (target?: 'face' | 'hair' | 'body' | 'leg' | 'outfit' | 'fullbody') => {
    let chosen = target;
    if (!chosen) {
      if (compositionMode === 'fullbody') {
        chosen = 'fullbody';
      } else if (compositionMode === '2part') {
        chosen = sheets.outfitSheet ? 'outfit' : 'face';
      } else {
        chosen = (currentPartCategory as any) || 'face';
      }
    }
    setSliceModalTarget(chosen || 'face');
  };

  // Apply new slice config from calibration modal
  const handleApplySliceConfig = (newConfig: SheetSliceConfig) => {
    if (!sliceModalTarget) return;
    const nextConfigs = {
      ...sheetSliceConfigs,
      [sliceModalTarget]: newConfig,
    };
    setSheetSliceConfigs(nextConfigs);

    let nextLayout = grid30Layout;
    if (newConfig.rows === 6 && newConfig.cols === 5) {
      nextLayout = '5x6'; // 6 rows, 5 cols
      setGrid30Layout('5x6');
    } else if (newConfig.rows === 5 && newConfig.cols === 6) {
      nextLayout = '6x5'; // 5 rows, 6 cols
      setGrid30Layout('6x5');
    }

    refreshSlicedSheets(sheets, processingSettings, sheetMode, nextLayout, nextConfigs, sliceModalTarget);
  };

  const handleUploadFile = (type: 'face' | 'hair' | 'body' | 'leg' | 'outfit' | 'fullbody', file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // ⚡ Automatically calculate margin and gap intervals right away so it NEVER blindly slices!
      const { rows, cols } = getGridDimensions(sheetMode, grid30Layout, img.naturalWidth, img.naturalHeight);
      const autoConfig = autoCalculateSpriteGrid(img, rows, cols, processingSettings.tolerance);

      const nextConfigs = {
        ...sheetSliceConfigs,
        [type]: autoConfig,
      };
      setSheetSliceConfigs(nextConfigs);

      setSheets((prev) => {
        const updated = { ...prev };
        if (type === 'face') {
          updated.faceSheet = img;
          updated.faceFileName = file.name;
        } else if (type === 'outfit') {
          updated.outfitSheet = img;
          updated.outfitFileName = file.name;
        } else if (type === 'fullbody') {
          updated.fullbodySheet = img;
          updated.fullbodyFileName = file.name;
          setCompositionMode('fullbody');
          setActiveView('align-fullbody');
        } else if (type === 'hair') {
          updated.hairSheet = img;
          updated.hairFileName = file.name;
        } else if (type === 'body') {
          updated.bodySheet = img;
          updated.bodyFileName = file.name;
        } else if (type === 'leg') {
          updated.legSheet = img;
          updated.legFileName = file.name;
        }
        refreshSlicedSheets(updated, processingSettings, sheetMode, grid30Layout, nextConfigs, type);
        return updated;
      });

      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleBatchUpload = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      const name = file.name.toLowerCase();
      if (name.includes('face') || name.includes('얼굴') || name.includes('표정')) {
        handleUploadFile('face', file);
      } else if (
        name.includes('full') ||
        name.includes('전신') ||
        name.includes('통합') ||
        name.includes('character') ||
        name.includes('캐릭터') ||
        name.includes('whole')
      ) {
        handleUploadFile('fullbody', file);
      } else if (
        name.includes('outfit') ||
        name.includes('의상') ||
        name.includes('코스튬') ||
        name.includes('상의하의') ||
        name.includes('상의+하의') ||
        name.includes('상의_하의') ||
        name.includes('suit') ||
        name.includes('dress') ||
        name.includes('costume')
      ) {
        handleUploadFile('outfit', file);
      } else if (name.includes('hair') || name.includes('헤어') || name.includes('머리') || name.includes('head')) {
        handleUploadFile('hair', file);
      } else if (name.includes('body') || name.includes('top') || name.includes('상의') || name.includes('cloth')) {
        handleUploadFile('body', file);
      } else if (
        name.includes('leg') ||
        name.includes('bottom') ||
        name.includes('하의') ||
        name.includes('skirt') ||
        name.includes('pants')
      ) {
        handleUploadFile('leg', file);
      }
    });
  };

  // Auto-split fullbody tiles to Face (얼굴 30종) and Outfit (상의+하의 의상 30종)
  const handleSplitFullbodyToFaceAndOutfit = useCallback(() => {
    if (fullbodyTiles.length === 0) return;
    const { faceTiles: splitFaces, outfitTiles: splitOutfits } = splitFullbodyTilesToFaceAndOutfit(fullbodyTiles);
    setFaceTiles(splitFaces);
    setOutfitTiles(splitOutfits);
    setCompositionMode('2part');
    // Lock auto-alignment on split parts
    const alignedConfigs = autoAlignAllModularParts(splitFaces, [], [], [], slotConfigs, anchorSettings, splitOutfits);
    setSlotConfigs(alignedConfigs);
    setActiveView('game-customizer');
  }, [fullbodyTiles, slotConfigs, anchorSettings]);

  // Auto-split outfit tiles to Top and Bottom
  const handleSplitOutfitToTopBottom = useCallback(() => {
    const sourceTiles = outfitTiles.length > 0 ? outfitTiles : bodyTiles;
    if (sourceTiles.length === 0) return;
    const { topTiles, bottomTiles } = splitOutfitTilesToTopAndBottom(sourceTiles);
    setBodyTiles(topTiles);
    setLegTiles(bottomTiles);
    setCompositionMode('4part');
  }, [outfitTiles, bodyTiles]);

  const handleUpdateSlotConfig = (
    id: number,
    updater: (prev: SlotConfig) => SlotConfig
  ) => {
    setSlotConfigs((prev) =>
      prev.map((config) => (config.id === id ? updater(config) : config))
    );
  };

  const handleBatchUpdateConfigs = (updater: (prev: SlotConfig) => SlotConfig) => {
    setSlotConfigs((prev) => prev.map((config) => updater(config)));
  };

  const handleResetSlotConfig = (id: number) => {
    setSlotConfigs((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              face: { x: 0, y: 0, scale: 1 },
              hair: { x: 0, y: 0, scale: 1 },
              body: { x: 0, y: 0, scale: 1 },
              leg: { x: 0, y: 0, scale: 1 },
              outfit: { x: 0, y: 0, scale: 1 },
              head: { x: 0, y: 0, scale: 1 },
            }
          : c
      )
    );
  };

  // Smart Auto-Alignment: Single Slot (Analyzes nose/neck/waist feature of slot and aligns)
  const handleAutoAlignSingleSlot = useCallback(
    (id: number, category: PartCategory) => {
      const targetTiles =
        category === 'face'
          ? faceTiles
          : category === 'hair' || category === 'head'
          ? hairTiles
          : category === 'body'
          ? bodyTiles
          : category === 'outfit'
          ? (outfitTiles.length > 0 ? outfitTiles : bodyTiles)
          : category === 'fullbody'
          ? fullbodyTiles
          : legTiles;

      const tile = targetTiles[id - 1];
      if (!tile) return;

      const result = analyzeAndAutoAlignPartTile(tile, category, anchorSettings);
      if (!result.hasContent) return;

      const key = category === 'head' ? 'hair' : category;
      handleUpdateSlotConfig(id, (prev) => ({
        ...prev,
        [key]: result.offset,
        ...(key === 'hair' ? { head: result.offset } : {}),
        ...(key === 'fullbody' ? { fullbody: result.offset } : {}),
      }));
    },
    [faceTiles, hairTiles, bodyTiles, legTiles, outfitTiles, fullbodyTiles, anchorSettings]
  );

  // Smart Auto-Alignment: All 15 or 30 slots for current active category
  const handleAutoAlignCategory = useCallback(
    (category: PartCategory) => {
      const targetTiles =
        category === 'face'
          ? faceTiles
          : category === 'hair' || category === 'head'
          ? hairTiles
          : category === 'body'
          ? bodyTiles
          : category === 'outfit'
          ? (outfitTiles.length > 0 ? outfitTiles : bodyTiles)
          : category === 'fullbody'
          ? fullbodyTiles
          : legTiles;

      const updated = autoAlignAllTilesForCategory(
        category,
        targetTiles,
        slotConfigs,
        anchorSettings
      );
      setSlotConfigs(updated);
    },
    [faceTiles, hairTiles, bodyTiles, legTiles, outfitTiles, fullbodyTiles, slotConfigs, anchorSettings]
  );

  // Auto-align all slots in current category to match the 1st character's exact center & ground level!
  const handleAutoAlignToFirst = useCallback(
    (category: PartCategory) => {
      const targetTiles =
        category === 'face'
          ? faceTiles
          : category === 'hair' || category === 'head'
          ? hairTiles
          : category === 'body'
          ? bodyTiles
          : category === 'outfit'
          ? (outfitTiles.length > 0 ? outfitTiles : bodyTiles)
          : category === 'fullbody'
          ? fullbodyTiles
          : legTiles;

      if (!targetTiles || targetTiles.length === 0) return;

      setSlotConfigs((prev) =>
        autoAlignAllTilesToFirstCharacter(
          category,
          targetTiles,
          prev,
          anchorSettings
        )
      );
    },
    [faceTiles, hairTiles, bodyTiles, legTiles, outfitTiles, fullbodyTiles, anchorSettings]
  );

  // Smart Auto-Alignment: All categories (Face + Hair + Top + Bottom / Outfit / Fullbody) for complete character assembly
  const handleAutoAlignAllParts = useCallback(() => {
    setSlotConfigs((prev) =>
      autoAlignAllModularParts(
        faceTiles,
        hairTiles,
        bodyTiles,
        legTiles,
        prev,
        anchorSettings,
        outfitTiles,
        fullbodyTiles
      )
    );
  }, [faceTiles, hairTiles, bodyTiles, legTiles, outfitTiles, fullbodyTiles, anchorSettings]);

  // Determine current active part category for the alignment stage
  const currentPartCategory: PartCategory =
    activeView === 'align-face'
      ? 'face'
      : activeView === 'align-hair' || activeView === 'align-head'
      ? 'hair'
      : activeView === 'align-body'
      ? 'body'
      : activeView === 'align-outfit'
      ? 'outfit'
      : activeView === 'align-fullbody'
      ? 'fullbody'
      : 'leg';

  const currentTiles =
    currentPartCategory === 'face'
      ? faceTiles
      : currentPartCategory === 'hair'
      ? hairTiles
      : currentPartCategory === 'body'
      ? bodyTiles
      : currentPartCategory === 'outfit'
      ? (outfitTiles.length > 0 ? outfitTiles : bodyTiles)
      : currentPartCategory === 'fullbody'
      ? fullbodyTiles
      : legTiles;

  const { rows, cols } = getGridDimensions(sheetMode, grid30Layout);

  // Synchronized navigation between Game Customizer and Part Alignment stages
  const handleNavigateToPartAlign = (category: PartCategory, slotId: number) => {
    setActiveSlotId(slotId);
    if (category === 'fullbody') {
      setActiveView('align-fullbody');
    } else if (category === 'face') {
      setActiveView('align-face');
    } else if (category === 'outfit') {
      setActiveView(compositionMode === '2part' ? 'align-outfit' : 'align-body');
    } else if (category === 'hair' || category === 'head') {
      setActiveView('align-hair');
    } else if (category === 'body') {
      setActiveView('align-body');
    } else if (category === 'leg') {
      setActiveView('align-leg');
    }
  };

  const handleNavigateToCustomizer = (slotId?: number, category?: PartCategory) => {
    if (slotId) {
      if (category === 'fullbody') {
        setSelectedFullbody(slotId);
      } else if (category === 'face') {
        setSelectedFace(slotId);
      } else if (category === 'outfit') {
        setSelectedOutfit(slotId);
      } else if (category === 'hair' || category === 'head') {
        setSelectedHair(slotId);
      } else if (category === 'body') {
        setSelectedTop(slotId);
      } else if (category === 'leg') {
        setSelectedBottom(slotId);
      } else {
        setSelectedFace(slotId);
      }
    }
    setActiveView('game-customizer');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 overflow-hidden font-sans select-none">
      {/* Header with Navigation and Tooling */}
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenUploadModal={handleOpenUploadModal}
        onOpenExportModal={() => setIsExportOpen(true)}
        onOpenGridSliceModal={() => handleOpenSliceModal()}
        onOpenFullbodySplitModal={handleSplitFullbodyToFaceAndOutfit}
        zoom={zoom}
        onZoomChange={setZoom}
        onResetZoom={() => setZoom(sheetMode === 30 ? 0.32 : 0.38)}
        sheetMode={sheetMode}
        compositionMode={compositionMode}
        onCompositionModeChange={setCompositionMode}
      />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {activeView === 'game-customizer' ? (
          /* Live Game Character Customizer & Assembly View (2-part face 30 + outfit 30 or fullbody 30 or 4-part) */
          <GameCharacterCustomizer
            faceTiles={faceTiles}
            hairTiles={hairTiles}
            bodyTiles={bodyTiles}
            legTiles={legTiles}
            outfitTiles={outfitTiles}
            fullbodyTiles={fullbodyTiles}
            slotConfigs={slotConfigs}
            anchorSettings={anchorSettings}
            onUpdateAnchorSettings={(s) => setAnchorSettings((prev) => ({ ...prev, ...s }))}
            processingSettings={processingSettings}
            onUpdateProcessingSettings={(s) => setProcessingSettings((prev) => ({ ...prev, ...s }))}
            sheetMode={sheetMode}
            compositionMode={compositionMode}
            onAutoAlignAllParts={handleAutoAlignAllParts}
            onOpenGridSliceModal={handleOpenSliceModal}
            onNavigateToPartAlign={handleNavigateToPartAlign}
            onUpdateSlotConfig={handleUpdateSlotConfig}
            onAutoAlignSingleSlot={handleAutoAlignSingleSlot}
            onResetSlotConfig={handleResetSlotConfig}
            selectedFace={selectedFace}
            onSelectFace={(id) => {
              setSelectedFace(id);
              setActiveSlotId(id);
            }}
            selectedHair={selectedHair}
            onSelectHair={setSelectedHair}
            selectedTop={selectedTop}
            onSelectTop={setSelectedTop}
            selectedBottom={selectedBottom}
            onSelectBottom={setSelectedBottom}
            selectedOutfit={selectedOutfit}
            onSelectOutfit={(id) => {
              setSelectedOutfit(id);
              if (compositionMode === '2part') {
                setActiveSlotId(id);
              }
            }}
            selectedFullbody={selectedFullbody}
            onSelectFullbody={(id) => {
              setSelectedFullbody(id);
              if (compositionMode === 'fullbody') {
                setActiveSlotId(id);
              }
            }}
            onAutoAlignToFirst={handleAutoAlignToFirst}
            onSplitFullbodyToFaceAndOutfit={handleSplitFullbodyToFaceAndOutfit}
          />
        ) : (
          /* Modular Part Alignment Stage (Face, Outfit, Fullbody, Hair, Body, or Leg) */
          <div className="flex-1 flex overflow-hidden relative">
            <CanvasStage
              partCategory={currentPartCategory}
              tiles={currentTiles}
              slotConfigs={slotConfigs}
              anchorSettings={anchorSettings}
              onUpdateAnchorSettings={(s) => setAnchorSettings((prev) => ({ ...prev, ...s }))}
              guideSettings={guideSettings}
              onUpdateGuideSettings={(s) => setGuideSettings((prev) => ({ ...prev, ...s }))}
              activeSlotId={activeSlotId}
              onSelectSlot={setActiveSlotId}
              onUpdateSlotConfig={handleUpdateSlotConfig}
              onBatchUpdateConfigs={handleBatchUpdateConfigs}
              onAutoAlignCategory={handleAutoAlignCategory}
              onAutoAlignToFirst={handleAutoAlignToFirst}
              onAutoAlignAllParts={handleAutoAlignAllParts}
              zoom={zoom}
              onZoomChange={setZoom}
              rows={rows}
              cols={cols}
              sheetMode={sheetMode}
              onNavigateToCustomizer={() => handleNavigateToCustomizer(activeSlotId ?? undefined, currentPartCategory)}
            />

            {/* Sidebar Collapse Toggle Button */}
            <button
              onClick={() => setIsInspectorOpen(!isInspectorOpen)}
              className={`absolute top-1/2 -translate-y-1/2 z-30 py-4 px-1 rounded-l-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-r-0 border-slate-700 transition shadow-2xl flex items-center justify-center ${
                isInspectorOpen ? 'right-80' : 'right-0 rounded-l-lg'
              }`}
              title={isInspectorOpen ? '인스펙터 패널 접기 (전체 화면으로 보기)' : '인스펙터 패널 열기'}
            >
              {isInspectorOpen ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>

            {/* Right Side Inspector for fine-tuning the active part */}
            {isInspectorOpen && (
              <CharacterInspector
                partCategory={currentPartCategory}
                activeSlotId={activeSlotId}
                onSelectSlot={setActiveSlotId}
                slotConfigs={slotConfigs}
                onUpdateSlotConfig={handleUpdateSlotConfig}
                onBatchUpdateConfigs={handleBatchUpdateConfigs}
                onResetSlotConfig={handleResetSlotConfig}
                onAutoAlignSingle={handleAutoAlignSingleSlot}
                onAutoAlignCategory={handleAutoAlignCategory}
                onAutoAlignToFirst={handleAutoAlignToFirst}
                onAutoAlignAllParts={handleAutoAlignAllParts}
                tiles={currentTiles}
                anchorSettings={anchorSettings}
                slotCount={sheetMode}
                onNavigateToCustomizer={() => handleNavigateToCustomizer(activeSlotId ?? undefined, currentPartCategory)}
              />
            )}
          </div>
        )}
      </div>

      {/* Upload Modal supporting 15 and 30 sheet modes, 2-part and 4-part modes, outfit splitting */}
      <UploadSection
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        sheets={sheets}
        onUploadFile={handleUploadFile}
        onBatchUpload={handleBatchUpload}
        onResetToDemo={() => loadDemoAssets(sheetMode)}
        processingSettings={processingSettings}
        onUpdateProcessingSettings={(s) => {
          setProcessingSettings((prev) => {
            const next = { ...prev, ...s };
            refreshSlicedSheets(sheets, next, sheetMode, grid30Layout);
            return next;
          });
        }}
        sheetMode={sheetMode}
        onSelectSheetMode={handleSelectSheetMode}
        grid30Layout={grid30Layout}
        onUpdateGrid30Layout={(layout) => {
          setGrid30Layout(layout);
          refreshSlicedSheets(sheets, processingSettings, sheetMode, layout);
        }}
        compositionMode={compositionMode}
        onSelectCompositionMode={setCompositionMode}
        onSplitOutfitToTopBottom={handleSplitOutfitToTopBottom}
        onSplitFullbodyToFaceAndOutfit={handleSplitFullbodyToFaceAndOutfit}
        onAutoAlignAllParts={handleAutoAlignAllParts}
        onOpenGridSliceModal={handleOpenSliceModal}
      />

      {/* Export Modal with Individual PNGs ZIP options for 15 or 30 slots, face 30, outfit 30, fullbody 30 */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        faceTiles={faceTiles}
        hairTiles={hairTiles}
        bodyTiles={bodyTiles}
        legTiles={legTiles}
        outfitTiles={outfitTiles}
        fullbodyTiles={fullbodyTiles}
        slotConfigs={slotConfigs}
        anchorSettings={anchorSettings}
        guideSettings={guideSettings}
        processingSettings={processingSettings}
        sheetMode={sheetMode}
        compositionMode={compositionMode}
      />

      {/* Grid Slice Calibration Modal */}
      {sliceModalTarget && (
        <GridSliceModal
          isOpen={Boolean(sliceModalTarget)}
          onClose={() => setSliceModalTarget(null)}
          targetImage={
            sliceModalTarget === 'face'
              ? sheets.faceSheet
              : sliceModalTarget === 'outfit'
              ? sheets.outfitSheet || sheets.bodySheet
              : sliceModalTarget === 'fullbody'
              ? sheets.fullbodySheet || null
              : sliceModalTarget === 'hair'
              ? sheets.hairSheet
              : sliceModalTarget === 'body'
              ? sheets.bodySheet
              : sheets.legSheet
          }
          imageLabel={
            sliceModalTarget === 'face'
              ? '얼굴 시트'
              : sliceModalTarget === 'outfit'
              ? '상의+하의(의상) 시트'
              : sliceModalTarget === 'fullbody'
              ? '통합 전신 캐릭터 시트'
              : sliceModalTarget === 'hair'
              ? '헤어 시트'
              : sliceModalTarget === 'body'
              ? '상의 시트'
              : '하의 시트'
          }
          sheetMode={sheetMode}
          initialRows={sheetSliceConfigs[sliceModalTarget]?.rows || rows}
          initialCols={sheetSliceConfigs[sliceModalTarget]?.cols || cols}
          currentSliceConfig={sheetSliceConfigs[sliceModalTarget]}
          onApplySliceConfig={handleApplySliceConfig}
          processingSettings={processingSettings}
        />
      )}
    </div>
  );
}
