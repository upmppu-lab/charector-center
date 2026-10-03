import JSZip from 'jszip';
import {
  AnchorSettings,
  Grid30Layout,
  GuideDisplaySettings,
  PartCategory,
  ProcessingSettings,
  SheetMode,
  SheetSliceConfig,
  SlotConfig,
} from '../types';

export function getGridDimensions(
  sheetMode: SheetMode = 15,
  layout: Grid30Layout = 'auto',
  imgWidth?: number,
  imgHeight?: number
): { rows: number; cols: number } {
  if (sheetMode === 15) {
    return { rows: 3, cols: 5 };
  }
  if (layout === '6x5') return { rows: 5, cols: 6 };
  if (layout === '5x6') return { rows: 6, cols: 5 };
  if (layout === '10x3') return { rows: 3, cols: 10 };
  if (layout === '3x10') return { rows: 10, cols: 3 };

  if (imgWidth && imgHeight) {
    return imgWidth >= imgHeight ? { rows: 5, cols: 6 } : { rows: 6, cols: 5 };
  }
  return { rows: 5, cols: 6 };
}

// Detects discrete character blobs/islands using morphological dilation and connected components
// Perfect when sprites have uneven or irregular spacing
export function detectConnectedSpriteBlobs(
  img: HTMLImageElement,
  targetCount = 30,
  tolerance = 25
): Array<{ x: number; y: number; width: number; height: number }> {
  const W = img.naturalWidth || img.width || 1200;
  const H = img.naturalHeight || img.height || 1000;

  // Downsample to max dimension 600px for speed and anti-noise
  const scale = Math.min(1, 600 / Math.max(W, H));
  const sw = Math.max(50, Math.round(W * scale));
  const sh = Math.max(50, Math.round(H * scale));

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  ctx.drawImage(img, 0, 0, sw, sh);
  const imgData = ctx.getImageData(0, 0, sw, sh);
  const data = imgData.data;

  // Background sample from 4 corners
  let bgR = 0, bgG = 0, bgB = 0, count = 0;
  [[0, 0], [sw - 1, 0], [0, sh - 1], [sw - 1, sh - 1], [Math.floor(sw / 2), 0]].forEach(([x, y]) => {
    const idx = (y * sw + x) * 4;
    if (data[idx + 3] > 20) {
      bgR += data[idx];
      bgG += data[idx + 1];
      bgB += data[idx + 2];
      count++;
    }
  });
  if (count > 0) {
    bgR = Math.round(bgR / count);
    bgG = Math.round(bgG / count);
    bgB = Math.round(bgB / count);
  } else {
    bgR = 255; bgG = 255; bgB = 255;
  }

  // Create binary foreground mask
  const fg = new Uint8Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) {
    const idx = i * 4;
    const a = data[idx + 3];
    if (a < 20) continue;
    const diff = Math.abs(data[idx] - bgR) + Math.abs(data[idx + 1] - bgG) + Math.abs(data[idx + 2] - bgB);
    if (diff > tolerance * 2) {
      fg[i] = 1;
    }
  }

  // Morphological dilation (connect hair strands / clothes parts within same sprite)
  const dRadius = 3;
  const dilated = new Uint8Array(sw * sh);
  for (let y = dRadius; y < sh - dRadius; y++) {
    for (let x = dRadius; x < sw - dRadius; x++) {
      if (fg[y * sw + x]) {
        for (let dy = -dRadius; dy <= dRadius; dy++) {
          for (let dx = -dRadius; dx <= dRadius; dx++) {
            dilated[(y + dy) * sw + (x + dx)] = 1;
          }
        }
      }
    }
  }

  // Connected Component Labeling via BFS
  const visited = new Uint8Array(sw * sh);
  const rawBlobs: Array<{ minX: number; minY: number; maxX: number; maxY: number; pixels: number }> = [];

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const idx = y * sw + x;
      if (!dilated[idx] || visited[idx]) continue;

      let minX = x, maxX = x, minY = y, maxY = y, pixels = 0;
      const queue = [x, y];
      visited[idx] = 1;
      let qHead = 0;

      while (qHead < queue.length) {
        const cx = queue[qHead++];
        const cy = queue[qHead++];
        pixels++;

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbors = [
          [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]
        ];
        for (let n = 0; n < 4; n++) {
          const nx = neighbors[n][0];
          const ny = neighbors[n][1];
          if (nx >= 0 && nx < sw && ny >= 0 && ny < sh) {
            const nIdx = ny * sw + nx;
            if (dilated[nIdx] && !visited[nIdx]) {
              visited[nIdx] = 1;
              queue.push(nx, ny);
            }
          }
        }
      }

      // Filter out tiny noise and full-image frames
      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      if (pixels >= 60 && bw >= 10 && bh >= 10 && bw < sw * 0.9 && bh < sh * 0.9) {
        rawBlobs.push({ minX, minY, maxX, maxY, pixels });
      }
    }
  }

  if (rawBlobs.length === 0) return [];

  // Calculate median blob width and height
  const sortedHeights = [...rawBlobs].map(b => b.maxY - b.minY + 1).sort((a, b) => a - b);
  const medianH = sortedHeights[Math.floor(sortedHeights.length / 2)] || 50;

  // Check if any blob contains 2 vertically stacked characters (height > 1.6 * medianH)
  const splitBlobs: Array<{ minX: number; minY: number; maxX: number; maxY: number }> = [];
  rawBlobs.forEach(b => {
    const bh = b.maxY - b.minY + 1;
    if (bh > medianH * 1.6) {
      // Split horizontally at center into two separate character boxes
      const midY = Math.round((b.minY + b.maxY) / 2);
      splitBlobs.push({ minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: midY - 2 });
      splitBlobs.push({ minX: b.minX, minY: midY + 2, maxX: b.maxX, maxY: b.maxY });
    } else {
      splitBlobs.push(b);
    }
  });

  // Sort blobs row by row, then left to right
  const rowThreshold = Math.max(15, medianH * 0.55);
  const rows: Array<Array<{ minX: number; minY: number; maxX: number; maxY: number }>> = [];

  splitBlobs.sort((a, b) => a.minY - b.minY);

  splitBlobs.forEach(b => {
    const cy = (b.minY + b.maxY) / 2;
    let placed = false;
    for (const r of rows) {
      const rowAvgY = r.reduce((sum, item) => sum + (item.minY + item.maxY) / 2, 0) / r.length;
      if (Math.abs(cy - rowAvgY) < rowThreshold) {
        r.push(b);
        placed = true;
        break;
      }
    }
    if (!placed) {
      rows.push([b]);
    }
  });

  // Sort rows top-to-bottom and items within each row left-to-right
  rows.sort((rA, rB) => {
    const avgYA = rA.reduce((sum, i) => sum + i.minY, 0) / rA.length;
    const avgYB = rB.reduce((sum, i) => sum + i.minY, 0) / rB.length;
    return avgYA - avgYB;
  });

  const orderedBlobs: Array<{ minX: number; minY: number; maxX: number; maxY: number }> = [];
  rows.forEach(r => {
    r.sort((a, b) => a.minX - b.minX);
    orderedBlobs.push(...r);
  });

  // Convert to full image coordinates with 6% comfortable padding
  return orderedBlobs.map(b => {
    const origMinX = Math.floor(b.minX / scale);
    const origMaxX = Math.ceil(b.maxX / scale);
    const origMinY = Math.floor(b.minY / scale);
    const origMaxY = Math.ceil(b.maxY / scale);

    const bw = origMaxX - origMinX + 1;
    const bh = origMaxY - origMinY + 1;
    const padX = Math.round(bw * 0.06);
    const padY = Math.round(bh * 0.06);

    const x = Math.max(0, origMinX - padX);
    const y = Math.max(0, origMinY - padY);
    const width = Math.min(W - x, bw + padX * 2);
    const height = Math.min(H - y, bh + padY * 2);

    return { x, y, width, height };
  });
}

// Snaps a single box to the tight bounding box of non-background content inside it
export function tightenBoxToContent(
  img: HTMLImageElement,
  box: { x: number; y: number; width: number; height: number },
  tolerance = 25,
  padding = 10
): { x: number; y: number; width: number; height: number } {
  const W = img.naturalWidth || img.width;
  const H = img.naturalHeight || img.height;

  const bx = Math.max(0, Math.min(W - 1, box.x));
  const by = Math.max(0, Math.min(H - 1, box.y));
  const bw = Math.max(10, Math.min(W - bx, box.width));
  const bh = Math.max(10, Math.min(H - by, box.height));

  const canvas = document.createElement('canvas');
  canvas.width = bw;
  canvas.height = bh;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return box;

  ctx.drawImage(img, bx, by, bw, bh, 0, 0, bw, bh);
  const imgData = ctx.getImageData(0, 0, bw, bh);
  const data = imgData.data;

  // Sample corner background
  const bgR = data[0];
  const bgG = data[1];
  const bgB = data[2];

  let minX = bw, maxX = 0, minY = bh, maxY = 0, hasFg = false;
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const idx = (y * bw + x) * 4;
      if (data[idx + 3] < 20) continue;
      const diff = Math.abs(data[idx] - bgR) + Math.abs(data[idx + 1] - bgG) + Math.abs(data[idx + 2] - bgB);
      if (diff > tolerance * 2) {
        hasFg = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!hasFg) return box;

  const nx = Math.max(0, bx + minX - padding);
  const ny = Math.max(0, by + minY - padding);
  const nw = Math.min(W - nx, maxX - minX + 1 + padding * 2);
  const nh = Math.min(H - ny, maxY - minY + 1 + padding * 2);

  return { x: nx, y: ny, width: nw, height: nh };
}

// Automatically calculates outer margins and spacing gaps between sprites
// by analyzing horizontal and vertical projection profiles (valleys and peaks)
// and connected component object blobs
export function autoCalculateSpriteGrid(
  img: HTMLImageElement,
  targetRows = 5,
  targetCols = 6,
  tolerance = 25
): SheetSliceConfig {
  const W = img.naturalWidth || img.width || 1200;
  const H = img.naturalHeight || img.height || 1000;

  // 1. Try Connected Component Blob Detection first!
  // If the sprites have uneven intervals or irregular placement, blob detection finds each sprite independently!
  const detectedBlobs = detectConnectedSpriteBlobs(img, targetRows * targetCols, tolerance);
  const expectedTotal = targetRows * targetCols;

  // If detected blobs closely match the target count (e.g. 25-35 blobs for 30 items)
  if (detectedBlobs.length >= expectedTotal * 0.8 && detectedBlobs.length <= expectedTotal * 1.3) {
    // Pad or trim to exactly expectedTotal if needed
    const customCellBoxes = detectedBlobs.slice(0, expectedTotal);
    return {
      autoDetect: true,
      rows: targetRows,
      cols: targetCols,
      marginTop: customCellBoxes[0]?.y || 0,
      marginBottom: 0,
      marginLeft: customCellBoxes[0]?.x || 0,
      marginRight: 0,
      gapX: 0,
      gapY: 0,
      offsetX: 0,
      offsetY: 0,
      customCellBoxes,
    };
  }

  // 2. Fallback to Valley-based Grid Analysis
  const scale = Math.min(1, 1000 / Math.max(W, H));
  const sw = Math.max(50, Math.round(W * scale));
  const sh = Math.max(50, Math.round(H * scale));

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return {
      autoDetect: false,
      rows: targetRows,
      cols: targetCols,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      gapX: 0,
      gapY: 0,
      offsetX: 0,
      offsetY: 0,
    };
  }

  ctx.drawImage(img, 0, 0, sw, sh);
  const imgData = ctx.getImageData(0, 0, sw, sh);
  const data = imgData.data;

  // 1. Detect background color from outer border samples
  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  let validSamples = 0;

  const samplePoints: Array<[number, number]> = [
    [2, 2],
    [sw - 3, 2],
    [2, sh - 3],
    [sw - 3, sh - 3],
    [Math.floor(sw / 2), 2],
    [2, Math.floor(sh / 2)],
    [sw - 3, Math.floor(sh / 2)],
    [Math.floor(sw / 2), sh - 3],
  ];

  samplePoints.forEach(([x, y]) => {
    const idx = (y * sw + x) * 4;
    const a = data[idx + 3];
    if (a > 20) {
      bgR += data[idx];
      bgG += data[idx + 1];
      bgB += data[idx + 2];
      validSamples++;
    }
  });

  const isAlphaBg = validSamples < 3;
  if (validSamples > 0) {
    bgR = Math.round(bgR / validSamples);
    bgG = Math.round(bgG / validSamples);
    bgB = Math.round(bgB / validSamples);
  } else {
    bgR = 255;
    bgG = 255;
    bgB = 255;
  }

  const isForeground = (x: number, y: number): boolean => {
    const idx = (y * sw + x) * 4;
    const a = data[idx + 3];
    if (a < 20) return false;
    if (isAlphaBg) return a > 30;
    const diff = Math.abs(data[idx] - bgR) + Math.abs(data[idx + 1] - bgG) + Math.abs(data[idx + 2] - bgB);
    return diff > tolerance * 2.2;
  };

  // 2. 1D Projection Profiles
  const horizProj = new Float32Array(sh);
  const vertProj = new Float32Array(sw);

  for (let y = 0; y < sh; y++) {
    let count = 0;
    for (let x = 0; x < sw; x++) {
      if (isForeground(x, y)) count++;
    }
    horizProj[y] = count;
  }

  for (let x = 0; x < sw; x++) {
    let count = 0;
    for (let y = 0; y < sh; y++) {
      if (isForeground(x, y)) count++;
    }
    vertProj[x] = count;
  }

  // 3. Find outer margins where content begins and ends
  const noiseH = Math.max(1, sw * 0.015);
  const noiseV = Math.max(1, sh * 0.015);

  let topY = 0;
  while (topY < sh && horizProj[topY] <= noiseH) topY++;
  let botY = sh - 1;
  while (botY > topY && horizProj[botY] <= noiseH) botY--;

  let leftX = 0;
  while (leftX < sw && vertProj[leftX] <= noiseV) leftX++;
  let rightX = sw - 1;
  while (rightX > leftX && vertProj[rightX] <= noiseV) rightX--;

  // Fallback if full frame
  if (topY >= botY) {
    topY = 0;
    botY = sh - 1;
  }
  if (leftX >= rightX) {
    leftX = 0;
    rightX = sw - 1;
  }

  const origTop = Math.max(0, Math.floor(topY / scale));
  const origBottom = Math.max(0, Math.floor((sh - 1 - botY) / scale));
  const origLeft = Math.max(0, Math.floor(leftX / scale));
  const origRight = Math.max(0, Math.floor((sw - 1 - rightX) / scale));

  // 4. Find valleys between columns
  const activeW = rightX - leftX + 1;
  const colStep = activeW / targetCols;
  const colValleys: number[] = [];

  for (let i = 1; i < targetCols; i++) {
    const expectedX = leftX + i * colStep;
    const searchRadius = Math.max(2, Math.round(colStep * 0.35));
    const startX = Math.max(leftX, Math.round(expectedX - searchRadius));
    const endX = Math.min(rightX, Math.round(expectedX + searchRadius));

    let minDensity = Infinity;
    let bestX = Math.round(expectedX);

    for (let x = startX; x <= endX; x++) {
      const distWeight = (Math.abs(x - expectedX) / (searchRadius || 1)) * (sh * 0.15);
      const density = vertProj[x] + distWeight;
      if (density < minDensity) {
        minDensity = density;
        bestX = x;
      }
    }
    colValleys.push(Math.round(bestX / scale));
  }

  // 5. Find valleys between rows
  const activeH = botY - topY + 1;
  const rowStep = activeH / targetRows;
  const rowValleys: number[] = [];

  for (let j = 1; j < targetRows; j++) {
    const expectedY = topY + j * rowStep;
    const searchRadius = Math.max(2, Math.round(rowStep * 0.35));
    const startY = Math.max(topY, Math.round(expectedY - searchRadius));
    const endY = Math.min(botY, Math.round(expectedY + searchRadius));

    let minDensity = Infinity;
    let bestY = Math.round(expectedY);

    for (let y = startY; y <= endY; y++) {
      const distWeight = (Math.abs(y - expectedY) / (searchRadius || 1)) * (sw * 0.15);
      const density = horizProj[y] + distWeight;
      if (density < minDensity) {
        minDensity = density;
        bestY = y;
      }
    }
    rowValleys.push(Math.round(bestY / scale));
  }

  // 6. Build custom bounding boxes for all targetRows x targetCols
  const xBounds = [origLeft, ...colValleys, W - origRight];
  const yBounds = [origTop, ...rowValleys, H - origBottom];

  const customCellBoxes: Array<{ x: number; y: number; width: number; height: number }> = [];
  for (let r = 0; r < targetRows; r++) {
    for (let c = 0; c < targetCols; c++) {
      const x1 = Math.max(0, xBounds[c]);
      const x2 = Math.min(W, xBounds[c + 1]);
      const y1 = Math.max(0, yBounds[r]);
      const y2 = Math.min(H, yBounds[r + 1]);
      customCellBoxes.push({
        x: x1,
        y: y1,
        width: Math.max(20, x2 - x1),
        height: Math.max(20, y2 - y1),
      });
    }
  }

  return {
    autoDetect: true,
    rows: targetRows,
    cols: targetCols,
    marginTop: origTop,
    marginBottom: origBottom,
    marginLeft: origLeft,
    marginRight: origRight,
    gapX: 0,
    gapY: 0,
    offsetX: 0,
    offsetY: 0,
    customCellBoxes,
  };
}

// Computes the slice boxes given image dimensions and a SheetSliceConfig
export function getSliceBoxes(
  imgWidth: number,
  imgHeight: number,
  config: SheetSliceConfig
): Array<{ x: number; y: number; width: number; height: number }> {
  const {
    rows,
    cols,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    gapX,
    gapY,
    offsetX,
    offsetY,
    customCellBoxes,
  } = config;

  if (customCellBoxes && customCellBoxes.length > 0) {
    return customCellBoxes.map((box) => ({
      x: Math.max(0, Math.min(imgWidth - 1, box.x + offsetX)),
      y: Math.max(0, Math.min(imgHeight - 1, box.y + offsetY)),
      width: Math.max(10, Math.min(imgWidth - Math.max(0, box.x + offsetX), box.width)),
      height: Math.max(10, Math.min(imgHeight - Math.max(0, box.y + offsetY), box.height)),
    }));
  }

  const usableWidth = Math.max(10, imgWidth - marginLeft - marginRight - gapX * (cols - 1));
  const usableHeight = Math.max(10, imgHeight - marginTop - marginBottom - gapY * (rows - 1));
  const cellWidth = Math.max(5, Math.floor(usableWidth / cols));
  const cellHeight = Math.max(5, Math.floor(usableHeight / rows));

  const boxes: Array<{ x: number; y: number; width: number; height: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = Math.max(0, Math.min(imgWidth - 1, marginLeft + c * (cellWidth + gapX) + offsetX));
      const y = Math.max(0, Math.min(imgHeight - 1, marginTop + r * (cellHeight + gapY) + offsetY));
      const w = Math.max(10, Math.min(imgWidth - x, cellWidth));
      const h = Math.max(10, Math.min(imgHeight - y, cellHeight));
      boxes.push({ x, y, width: w, height: h });
    }
  }
  return boxes;
}

// Slices an image using auto-calculated or user-defined grid & gap intervals
export function sliceSpriteSheet(
  img: HTMLImageElement,
  rows = 3,
  cols = 5,
  settings: ProcessingSettings,
  isFaceSheet = false,
  sliceConfig?: SheetSliceConfig
): HTMLCanvasElement[] {
  const W = img.naturalWidth || img.width || 1200;
  const H = img.naturalHeight || img.height || 1000;

  let activeConfig = sliceConfig || settings.sliceConfig;

  // If user provided customCellBoxes or explicit sliceConfig, ALWAYS preserve it!
  const hasCustomBoxes = Boolean(activeConfig?.customCellBoxes && activeConfig.customCellBoxes.length > 0);
  if (!activeConfig || (!hasCustomBoxes && activeConfig.autoDetect)) {
    activeConfig = autoCalculateSpriteGrid(img, rows, cols, settings.tolerance);
  }

  const boxes = getSliceBoxes(W, H, activeConfig);
  const tiles: HTMLCanvasElement[] = [];

  const targetTileW = 400;
  const targetTileH = 400;

  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i];
    const canvas = document.createElement('canvas');
    canvas.width = targetTileW;
    canvas.height = targetTileH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) continue;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Scale and center the sliced content inside standard targetTileW x targetTileH
    const aspect = box.width / (box.height || 1);
    let drawW = targetTileW;
    let drawH = targetTileH;
    let drawX = 0;
    let drawY = 0;

    if (aspect > 1) {
      drawH = Math.round(targetTileW / aspect);
      drawY = Math.round((targetTileH - drawH) / 2);
    } else {
      drawW = Math.round(targetTileH * aspect);
      drawX = Math.round((targetTileW - drawW) / 2);
    }

    ctx.drawImage(
      img,
      box.x,
      box.y,
      box.width,
      box.height,
      drawX,
      drawY,
      drawW,
      drawH
    );

    // Process transparency
    if (settings.bgRemovalMethod === 'floodfill') {
      floodFillBorderTransparency(ctx, targetTileW, targetTileH, settings.tolerance);
    } else if (settings.bgRemovalMethod === 'whitekey') {
      colorKeyTransparency(ctx, targetTileW, targetTileH, settings.tolerance);
    }

    // Automatically clean stray adjacent hair if enabled or if face sheet
    if (settings.autoCleanStrayHair) {
      cleanStrayNeighborHair(ctx, targetTileW, targetTileH, settings.sideTrimPx);
    }

    tiles.push(canvas);
  }

  return tiles;
}

// Flood fill starting from all 4 borders so internal white elements remain solid
function floodFillBorderTransparency(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tolerance: number
) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  const isBackground = (idx: number) => {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];
    if (a < 10) return true;

    const threshold = 255 - tolerance;
    return r >= threshold && g >= threshold && b >= threshold;
  };

  // Push border pixels
  for (let x = 0; x < width; x++) {
    const topIdx = (0 * width + x) * 4;
    const botIdx = ((height - 1) * width + x) * 4;
    if (isBackground(topIdx) && !visited[0 * width + x]) {
      queue.push(x, 0);
      visited[0 * width + x] = 1;
    }
    if (isBackground(botIdx) && !visited[(height - 1) * width + x]) {
      queue.push(x, height - 1);
      visited[(height - 1) * width + x] = 1;
    }
  }

  for (let y = 0; y < height; y++) {
    const leftIdx = (y * width + 0) * 4;
    const rightIdx = (y * width + (width - 1)) * 4;
    if (isBackground(leftIdx) && !visited[y * width + 0]) {
      queue.push(0, y);
      visited[y * width + 0] = 1;
    }
    if (isBackground(rightIdx) && !visited[y * width + (width - 1)]) {
      queue.push(width - 1, y);
      visited[y * width + (width - 1)] = 1;
    }
  }

  // BFS
  let head = 0;
  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];
    const pIdx = (y * width + x) * 4;

    data[pIdx + 3] = 0;

    const neighbors = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];

    for (let i = 0; i < 4; i++) {
      const nx = neighbors[i][0];
      const ny = neighbors[i][1];
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nVisitedIdx = ny * width + nx;
        if (!visited[nVisitedIdx]) {
          visited[nVisitedIdx] = 1;
          const nIdx = nVisitedIdx * 4;
          if (isBackground(nIdx)) {
            queue.push(nx, ny);
          }
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

// Simple color key transparency
function colorKeyTransparency(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tolerance: number
) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const threshold = 255 - tolerance;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i] >= threshold && data[i + 1] >= threshold && data[i + 2] >= threshold) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

// Trims edge stray pixels bleeding from adjacent columns
function cleanStrayNeighborHair(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  trimPx = 6
) {
  if (trimPx <= 0) return;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Clear left edge strip
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < trimPx; x++) {
      const idx = (y * width + x) * 4;
      data[idx + 3] = 0;
    }
  }

  // Clear right edge strip
  for (let y = 0; y < height; y++) {
    for (let x = width - trimPx; x < width; x++) {
      const idx = (y * width + x) * 4;
      data[idx + 3] = 0;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

export interface AnalyzedFeatureResult {
  hasContent: boolean;
  box: { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number };
  detectedAnchor: { x: number; y: number };
  offset: { x: number; y: number; scale: number };
  description: string;
}

/**
 * Automatically analyzes the sprite pixels of a part tile (Face, Hair, Top, Bottom)
 * and calculates the exact offset required for perfect alignment and character assembly:
 * - Face: finds facial bounds and nose location, centers the nose at the slot box center (x=0, y=0).
 * - Hair: finds hair bounds and bangs/face opening anchor, aligns hair's nose reference to the face.
 * - Top (Body): finds the collar/neckline at the topmost central area, places the neck at the top guideline.
 * - Bottom (Leg): finds the waistline at the top boundary, places the waist to connect directly to the top hem.
 */
export function analyzeAndAutoAlignPartTile(
  tile: HTMLCanvasElement,
  category: PartCategory,
  anchorSettings: AnchorSettings
): AnalyzedFeatureResult {
  const width = tile.width;
  const height = tile.height;
  const ctx = tile.getContext('2d');
  if (!ctx) {
    return {
      hasContent: false,
      box: { minX: 0, maxX: width, minY: 0, maxY: height, width, height },
      detectedAnchor: { x: width / 2, y: height / 2 },
      offset: { x: 0, y: 0, scale: 1 },
      description: '캔버스 컨텍스트 없음',
    };
  }

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  let totalAlpha = 0;
  let sumX = 0;
  let sumY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];
      if (alpha > 30) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        sumX += x * alpha;
        sumY += y * alpha;
        totalAlpha += alpha;
      }
    }
  }

  if (maxX === -1 || totalAlpha === 0) {
    return {
      hasContent: false,
      box: { minX: 0, maxX: width, minY: 0, maxY: height, width, height },
      detectedAnchor: { x: width / 2, y: height / 2 },
      offset: { x: 0, y: 0, scale: 1 },
      description: '빈 슬롯 (이미지 데이터 없음)',
    };
  }

  const contentW = maxX - minX + 1;
  const contentH = maxY - minY + 1;
  const midX = (minX + maxX) / 2;
  const centroidX = sumX / totalAlpha;
  const tileCenterX = width / 2;
  const tileCenterY = height / 2;

  // Weighted horizontal center
  const bestCenterX = midX * 0.7 + centroidX * 0.3;

  if (category === 'face') {
    // 1. FACE: Nose centered at slot center (코를 중심으로 사각형 중앙 배치)
    const detectedNoseY = minY + contentH * 0.54;
    const detectedNoseX = bestCenterX;

    const dx = Math.round(tileCenterX - detectedNoseX);
    const dy = Math.round(tileCenterY - detectedNoseY);

    return {
      hasContent: true,
      box: { minX, maxX, minY, maxY, width: contentW, height: contentH },
      detectedAnchor: { x: detectedNoseX, y: detectedNoseY },
      offset: { x: dx, y: dy, scale: 1 },
      description: `얼굴 코 중심점 (${Math.round(detectedNoseX)}, ${Math.round(detectedNoseY)}) 감지 → 중앙 정렬`,
    };
  }

  if (category === 'hair' || category === 'head') {
    // 2. HAIR: Bangs and face opening aligned with nose anchor
    const detectedHairNoseY = minY + contentH * 0.58;
    const detectedHairNoseX = bestCenterX;

    const dx = Math.round(tileCenterX - detectedHairNoseX);
    const dy = Math.round(tileCenterY - detectedHairNoseY);

    return {
      hasContent: true,
      box: { minX, maxX, minY, maxY, width: contentW, height: contentH },
      detectedAnchor: { x: detectedHairNoseX, y: detectedHairNoseY },
      offset: { x: dx, y: dy, scale: 1 },
      description: `헤어 결합점 (${Math.round(detectedHairNoseX)}, ${Math.round(detectedHairNoseY)}) 감지 → 얼굴 코 기준 정렬`,
    };
  }

  if (category === 'body') {
    // 3. TOP / BODY: Neck collar placed near top of slot (상의는 목을 기준으로 사각형 맨위에 배치)
    const collarMinX = Math.floor(bestCenterX - contentW * 0.2);
    const collarMaxX = Math.ceil(bestCenterX + contentW * 0.2);
    let collarTopY = maxY;
    let collarTopX = bestCenterX;

    for (let y = minY; y <= minY + contentH * 0.4; y++) {
      for (let x = collarMinX; x <= collarMaxX; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = (y * width + x) * 4;
          if (data[idx + 3] > 35) {
            if (y < collarTopY) {
              collarTopY = y;
              collarTopX = x;
            }
          }
        }
      }
      if (collarTopY < maxY) break;
    }

    if (collarTopY === maxY) {
      collarTopY = minY;
    }

    const targetNeckY = tileCenterY + (anchorSettings.bodyNeckY ?? -85);
    const dx = Math.round(tileCenterX - bestCenterX);
    const dy = Math.round(targetNeckY - collarTopY);

    return {
      hasContent: true,
      box: { minX, maxX, minY, maxY, width: contentW, height: contentH },
      detectedAnchor: { x: collarTopX, y: collarTopY },
      offset: { x: dx, y: dy, scale: 1 },
      description: `상의 목깃 끝점 (${Math.round(collarTopX)}, ${Math.round(collarTopY)}) 감지 → 목 기준선 상단 정렬`,
    };
  }

  // 4. LEG / BOTTOM: Waistline placed to connect seamlessly with top (하의는 허리를 중심으로 배치)
  if (category === 'leg') {
    const waistY = minY;
    const targetWaistY = tileCenterY - 80;
    const dx = Math.round(tileCenterX - bestCenterX);
    const dy = Math.round(targetWaistY - waistY);

    return {
      hasContent: true,
      box: { minX, maxX, minY, maxY, width: contentW, height: contentH },
      detectedAnchor: { x: bestCenterX, y: waistY },
      offset: { x: dx, y: dy, scale: 1 },
      description: `하의 허리선 (${Math.round(bestCenterX)}, ${Math.round(waistY)}) 감지 → 상의 결합선 정렬`,
    };
  }

  // 5. OUTFIT (상의+하의 일체형 30종): 목선(Collar/Neckline)을 기준으로 상단 정렬 및 중앙축 정렬
  const collarMinX = Math.floor(bestCenterX - contentW * 0.25);
  const collarMaxX = Math.ceil(bestCenterX + contentW * 0.25);
  let collarTopY = maxY;
  let collarTopX = bestCenterX;

  for (let y = minY; y <= minY + contentH * 0.35; y++) {
    for (let x = collarMinX; x <= collarMaxX; x++) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        const idx = (y * width + x) * 4;
        if (data[idx + 3] > 35) {
          if (y < collarTopY) {
            collarTopY = y;
            collarTopX = x;
          }
        }
      }
    }
    if (collarTopY < maxY) break;
  }

  if (collarTopY === maxY) {
    collarTopY = minY;
  }

  if (category === 'fullbody') {
    // 5. FULLBODY: Center horizontally, and align feet/ground to foot baseline
    const targetFootY = tileCenterY + (anchorSettings.fullbodyFootY ?? anchorSettings.legFootY ?? 130);
    const dx = Math.round(tileCenterX - bestCenterX);
    const dy = Math.round(targetFootY - maxY);

    return {
      hasContent: true,
      box: { minX, maxX, minY, maxY, width: contentW, height: contentH },
      detectedAnchor: { x: bestCenterX, y: maxY },
      offset: { x: dx, y: dy, scale: 1 },
      description: `전신 발끝선 (${Math.round(bestCenterX)}, ${maxY}) 감지 → 바닥 기준선 정렬`,
    };
  }

  const targetNeckY = tileCenterY + (anchorSettings.outfitNeckY ?? anchorSettings.bodyNeckY ?? -95);
  const dx = Math.round(tileCenterX - bestCenterX);
  const dy = Math.round(targetNeckY - collarTopY);

  return {
    hasContent: true,
    box: { minX, maxX, minY, maxY, width: contentW, height: contentH },
    detectedAnchor: { x: collarTopX, y: collarTopY },
    offset: { x: dx, y: dy, scale: 1 },
    description: `상의+하의 목끝점 (${Math.round(collarTopX)}, ${Math.round(collarTopY)}) 감지 → 목 기준선 상단 정렬`,
  };
}

/**
 * Automatically splits 30 full-body character tiles (전신 캐릭터 30종) into separate
 * Face (얼굴/머리 30종) and Outfit (상의+하의 의상 30종) tiles with clean margins.
 */
export function splitFullbodyTilesToFaceAndOutfit(
  fullbodyTiles: HTMLCanvasElement[],
  headCutRatio = 0.44
): { faceTiles: HTMLCanvasElement[]; outfitTiles: HTMLCanvasElement[] } {
  const faceTiles: HTMLCanvasElement[] = [];
  const outfitTiles: HTMLCanvasElement[] = [];

  fullbodyTiles.forEach((tile) => {
    const w = tile.width;
    const h = tile.height;
    const ctx = tile.getContext('2d');
    if (!ctx) {
      faceTiles.push(tile);
      outfitTiles.push(tile);
      return;
    }

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let minY = h, maxY = -1, minX = w, maxX = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 25) {
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }

    if (maxY <= minY) {
      faceTiles.push(tile);
      outfitTiles.push(tile);
      return;
    }

    const charH = maxY - minY;

    // Search for the narrowest width (the neck) between 34% and 52% of character height
    const searchStart = Math.round(minY + charH * 0.34);
    const searchEnd = Math.round(minY + charH * 0.52);
    let narrowestY = Math.round(minY + charH * headCutRatio);
    let minSpan = w;

    for (let y = searchStart; y <= searchEnd; y++) {
      let rowMinX = w, rowMaxX = -1;
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 25) {
          if (x < rowMinX) rowMinX = x;
          if (x > rowMaxX) rowMaxX = x;
        }
      }
      if (rowMaxX >= rowMinX) {
        const span = rowMaxX - rowMinX;
        if (span < minSpan) {
          minSpan = span;
          narrowestY = y;
        }
      }
    }

    const neckCutY = narrowestY;

    // 1. Create Face Canvas (top down to neckCutY + 12)
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = w;
    faceCanvas.height = h;
    const faceCtx = faceCanvas.getContext('2d');
    if (faceCtx) {
      faceCtx.drawImage(tile, 0, 0);
      const faceImg = faceCtx.getImageData(0, 0, w, h);
      const faceData = faceImg.data;
      for (let y = neckCutY + 12; y < h; y++) {
        for (let x = 0; x < w; x++) {
          faceData[(y * w + x) * 4 + 3] = 0;
        }
      }
      faceCtx.putImageData(faceImg, 0, 0);
    }
    faceTiles.push(faceCanvas);

    // 2. Create Outfit Canvas (neckCutY - 6 down to maxY)
    const outfitCanvas = document.createElement('canvas');
    outfitCanvas.width = w;
    outfitCanvas.height = h;
    const outfitCtx = outfitCanvas.getContext('2d');
    if (outfitCtx) {
      outfitCtx.drawImage(tile, 0, 0);
      const outfitImg = outfitCtx.getImageData(0, 0, w, h);
      const outfitData = outfitImg.data;
      for (let y = 0; y < Math.max(0, neckCutY - 6); y++) {
        for (let x = 0; x < w; x++) {
          outfitData[(y * w + x) * 4 + 3] = 0;
        }
      }
      outfitCtx.putImageData(outfitImg, 0, 0);
    }
    outfitTiles.push(outfitCanvas);
  });

  return { faceTiles, outfitTiles };
}

/**
 * Automatically splits outfit tiles (상의+하의 30종) into separate top (상의) and bottom (하의) tiles
 * by detecting the waistline or center division.
 */
export function splitOutfitTilesToTopAndBottom(
  outfitTiles: HTMLCanvasElement[]
): { topTiles: HTMLCanvasElement[]; bottomTiles: HTMLCanvasElement[] } {
  const topTiles: HTMLCanvasElement[] = [];
  const bottomTiles: HTMLCanvasElement[] = [];

  outfitTiles.forEach((tile) => {
    const w = tile.width;
    const h = tile.height;
    const ctx = tile.getContext('2d');
    if (!ctx) {
      topTiles.push(tile);
      bottomTiles.push(tile);
      return;
    }

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let minY = h;
    let maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 30) {
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const midCutY = minY < maxY ? Math.round(minY + (maxY - minY) * 0.48) : Math.round(h * 0.5);

    // Create Top canvas (minY ~ midCutY + 14)
    const topCanvas = document.createElement('canvas');
    topCanvas.width = w;
    topCanvas.height = h;
    const topCtx = topCanvas.getContext('2d');
    if (topCtx) {
      topCtx.drawImage(tile, 0, 0);
      const topImg = topCtx.getImageData(0, 0, w, h);
      const topData = topImg.data;
      for (let y = midCutY + 14; y < h; y++) {
        for (let x = 0; x < w; x++) {
          topData[(y * w + x) * 4 + 3] = 0;
        }
      }
      topCtx.putImageData(topImg, 0, 0);
    }
    topTiles.push(topCanvas);

    // Create Bottom canvas (midCutY - 10 ~ maxY)
    const bottomCanvas = document.createElement('canvas');
    bottomCanvas.width = w;
    bottomCanvas.height = h;
    const bottomCtx = bottomCanvas.getContext('2d');
    if (bottomCtx) {
      bottomCtx.drawImage(tile, 0, 0);
      const bottomImg = bottomCtx.getImageData(0, 0, w, h);
      const bottomData = bottomImg.data;
      for (let y = 0; y < midCutY - 10; y++) {
        for (let x = 0; x < w; x++) {
          bottomData[(y * w + x) * 4 + 3] = 0;
        }
      }
      bottomCtx.putImageData(bottomImg, 0, 0);
    }
    bottomTiles.push(bottomCanvas);
  });

  return { topTiles, bottomTiles };
}

/**
 * Automatically aligns all tiles in the given category across all slots (1~15 or 1~30)
 */
export function autoAlignAllTilesForCategory(
  category: PartCategory,
  tiles: HTMLCanvasElement[],
  slotConfigs: SlotConfig[],
  anchorSettings: AnchorSettings
): SlotConfig[] {
  return slotConfigs.map((config, index) => {
    const tile = tiles[index];
    if (!tile) return config;

    const analysis = analyzeAndAutoAlignPartTile(tile, category, anchorSettings);
    if (!analysis.hasContent) return config;

    const key = category === 'head' ? 'hair' : category;
    return {
      ...config,
      [key]: analysis.offset,
      ...(key === 'hair' ? { head: analysis.offset } : {}),
      ...(key === 'fullbody' ? { fullbody: analysis.offset } : {}),
    };
  });
}

/**
 * Automatically aligns all tiles in the given category to match the exact center and baseline
 * of the 1st character (Slot #1)!
 * - Slot #1 serves as the gold standard anchor baseline template
 * - Slot #1 itself is automatically centered on the center guideline if not manually adjusted.
 * - All other slots (2~30) automatically center their horizontal axis and baseline
 *   to match Slot #1 with pixel precision.
 */
export function autoAlignAllTilesToFirstCharacter(
  category: PartCategory,
  tiles: HTMLCanvasElement[],
  slotConfigs: SlotConfig[],
  anchorSettings: AnchorSettings
): SlotConfig[] {
  if (!tiles || tiles.length === 0) return slotConfigs;

  const firstSlotKey = category === 'head' ? 'hair' : category;
  const firstTile = tiles[0];
  const firstAnalysis = analyzeAndAutoAlignPartTile(firstTile, category, anchorSettings);

  // 1. Calculate 1st tile's ideal center and vertical alignment
  const firstIdealDx = firstAnalysis.hasContent
    ? Math.round(firstTile.width / 2 - firstAnalysis.detectedAnchor.x)
    : 0;
  const firstIdealDy = firstAnalysis.hasContent ? firstAnalysis.offset.y : 0;

  const firstOffset = slotConfigs[0]?.[firstSlotKey] || { x: 0, y: 0, scale: 1 };

  // If slot 1 has offset 0 (default unadjusted), center it automatically!
  // If slot 1 was manually moved away from ideal center, propagate that user nudge.
  const isDefaultUnset = (firstOffset.x === 0 && firstOffset.y === 0);
  const userNudgeX = isDefaultUnset ? 0 : firstOffset.x - firstIdealDx;
  const userNudgeY = isDefaultUnset ? 0 : firstOffset.y - firstIdealDy;

  const targetFirstOffset = {
    x: firstIdealDx + userNudgeX,
    y: firstIdealDy + userNudgeY,
    scale: firstOffset.scale || 1,
  };

  return slotConfigs.map((config, index) => {
    const tile = tiles[index];
    if (!tile) return config;

    const key = category === 'head' ? 'hair' : category;

    // Slot 1 is the reference template
    if (index === 0) {
      return {
        ...config,
        [key]: targetFirstOffset,
        ...(key === 'hair' ? { head: targetFirstOffset } : {}),
        ...(key === 'fullbody' ? { fullbody: targetFirstOffset } : {}),
      };
    }

    const analysis = analyzeAndAutoAlignPartTile(tile, category, anchorSettings);
    if (!analysis.hasContent) return config;

    // 1. Horizontal Centering:
    // Every tile centers its character at tile.width / 2, plus any user nudge applied to #1
    const idealDx = Math.round(tile.width / 2 - analysis.detectedAnchor.x);
    const targetDx = idealDx + userNudgeX;

    // 2. Vertical Baseline:
    // analysis.offset.y accurately positions:
    // - fullbody/leg: feet at ground baseline
    // - face/hair: nose at center crosshair
    // - body/outfit: collar at neck line
    const idealDy = analysis.offset.y;
    const targetDy = idealDy + userNudgeY;

    // 3. Scale: match #1's scale if customized, otherwise preserve slot scale
    const targetScale = (firstOffset.scale && firstOffset.scale !== 1) ? firstOffset.scale : (config[key]?.scale || 1);

    const newOffset = {
      x: targetDx,
      y: targetDy,
      scale: targetScale,
    };

    return {
      ...config,
      [key]: newOffset,
      ...(key === 'hair' ? { head: newOffset } : {}),
      ...(key === 'fullbody' ? { fullbody: newOffset } : {}),
    };
  });
}

/**
 * Aligns a single tile to match Slot #1's center and baseline
 */
export function autoAlignSingleTileToFirstCharacter(
  category: PartCategory,
  tileIndex: number,
  tiles: HTMLCanvasElement[],
  slotConfig: SlotConfig,
  referenceSlotConfig: SlotConfig,
  anchorSettings: AnchorSettings
): SlotConfig {
  const tile = tiles[tileIndex];
  const firstTile = tiles[0];
  if (!tile || !firstTile) return slotConfig;

  const key = category === 'head' ? 'hair' : category;
  const firstAnalysis = analyzeAndAutoAlignPartTile(firstTile, category, anchorSettings);
  const firstIdealDx = firstAnalysis.hasContent
    ? Math.round(firstTile.width / 2 - firstAnalysis.detectedAnchor.x)
    : 0;
  const firstIdealDy = firstAnalysis.hasContent ? firstAnalysis.offset.y : 0;
  const firstOffset = referenceSlotConfig[key] || { x: 0, y: 0, scale: 1 };

  const isDefaultUnset = (firstOffset.x === 0 && firstOffset.y === 0);
  const userNudgeX = isDefaultUnset ? 0 : firstOffset.x - firstIdealDx;
  const userNudgeY = isDefaultUnset ? 0 : firstOffset.y - firstIdealDy;

  const analysis = analyzeAndAutoAlignPartTile(tile, category, anchorSettings);
  if (!analysis.hasContent) return slotConfig;

  const idealDx = Math.round(tile.width / 2 - analysis.detectedAnchor.x);
  const targetDx = idealDx + userNudgeX;
  const idealDy = analysis.offset.y;
  const targetDy = idealDy + userNudgeY;
  const targetScale = (firstOffset.scale && firstOffset.scale !== 1) ? firstOffset.scale : (slotConfig[key]?.scale || 1);

  const newOffset = {
    x: targetDx,
    y: targetDy,
    scale: targetScale,
  };

  return {
    ...slotConfig,
    [key]: newOffset,
    ...(key === 'hair' ? { head: newOffset } : {}),
    ...(key === 'fullbody' ? { fullbody: newOffset } : {}),
  };
}

/**
 * Automatically analyzes all categories (Face, Hair, Top, Bottom, Outfit) for all 15 or 30 slots
 * and perfectly locks every character into a unified assembled character!
 */
export function autoAlignAllModularParts(
  faceTiles: HTMLCanvasElement[],
  hairTiles: HTMLCanvasElement[],
  bodyTiles: HTMLCanvasElement[],
  legTiles: HTMLCanvasElement[],
  slotConfigs: SlotConfig[],
  anchorSettings: AnchorSettings,
  outfitTiles?: HTMLCanvasElement[],
  fullbodyTiles?: HTMLCanvasElement[]
): SlotConfig[] {
  const actualHairTiles = hairTiles && hairTiles.length > 0 ? hairTiles : [];

  return slotConfigs.map((config, i) => {
    const faceTile = faceTiles[i];
    const hairTile = actualHairTiles[i];
    const bodyTile = bodyTiles[i];
    const legTile = legTiles[i];
    const outfitTile = outfitTiles ? outfitTiles[i] : null;
    const fullbodyTile = fullbodyTiles ? fullbodyTiles[i] : null;

    const faceOffset = faceTile
      ? analyzeAndAutoAlignPartTile(faceTile, 'face', anchorSettings).offset
      : config.face;

    const hairOffset = hairTile
      ? analyzeAndAutoAlignPartTile(hairTile, 'hair', anchorSettings).offset
      : config.hair || config.head;

    const bodyOffset = bodyTile
      ? analyzeAndAutoAlignPartTile(bodyTile, 'body', anchorSettings).offset
      : config.body;

    const legOffset = legTile
      ? analyzeAndAutoAlignPartTile(legTile, 'leg', anchorSettings).offset
      : config.leg;

    const outfitOffset = outfitTile
      ? analyzeAndAutoAlignPartTile(outfitTile, 'outfit', anchorSettings).offset
      : config.outfit || { x: 0, y: 0, scale: 1 };

    const fullbodyOffset = fullbodyTile
      ? analyzeAndAutoAlignPartTile(fullbodyTile, 'fullbody', anchorSettings).offset
      : config.fullbody || { x: 0, y: 0, scale: 1 };

    return {
      ...config,
      face: faceOffset,
      hair: hairOffset,
      body: bodyOffset,
      leg: legOffset,
      outfit: outfitOffset,
      fullbody: fullbodyOffset,
      head: hairOffset,
    };
  });
}

export interface SlotBox {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  row: number;
  col: number;
}

// Calculates standard 3 rows x 5 columns box layout for canvas
export function calculateSlotBoxes(
  canvasWidth: number,
  canvasHeight: number,
  rows = 3,
  cols = 5
): SlotBox[] {
  const padX = canvasWidth * 0.02;
  const padY = canvasHeight * 0.025;
  const gapX = canvasWidth * 0.015;
  const gapY = canvasHeight * 0.02;

  const totalGapX = gapX * (cols - 1);
  const totalGapY = gapY * (rows - 1);

  const boxWidth = (canvasWidth - padX * 2 - totalGapX) / cols;
  const boxHeight = (canvasHeight - padY * 2 - totalGapY) / rows;

  const boxes: SlotBox[] = [];
  let id = 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      boxes.push({
        id,
        x: padX + c * (boxWidth + gapX),
        y: padY + r * (boxHeight + gapY),
        width: boxWidth,
        height: boxHeight,
        row: r,
        col: c,
      });
      id++;
    }
  }

  return boxes;
}

// Renders the tile grid for a single part category (Face, Hair, Top, or Bottom)
// With clear visual anchor guidelines! Supports 15 and 30 slots
export function renderPartGridCanvas(
  targetCanvas: HTMLCanvasElement,
  partCategory: PartCategory,
  tiles: HTMLCanvasElement[],
  slotConfigs: SlotConfig[],
  anchorSettings: AnchorSettings,
  guideSettings: GuideDisplaySettings,
  activeSlotId: number | null,
  hoverSlotId: number | null,
  rows = 3,
  cols = 5
) {
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  const width = targetCanvas.width;
  const height = targetCanvas.height;

  // Background
  ctx.clearRect(0, 0, width, height);

  if (guideSettings.backgroundColor === 'white') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  } else if (guideSettings.backgroundColor === 'dark') {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
  } else if (guideSettings.backgroundColor === 'grid') {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);
    drawCheckerboard(ctx, width, height, 20);
  }

  const boxes = calculateSlotBoxes(width, height, rows, cols);

  // 1. Draw each slot's tile content
  boxes.forEach((box) => {
    const tile = tiles[box.id - 1];
    if (!tile) return;

    const config = slotConfigs.find((s) => s.id === box.id);
    const rawOffset = config
      ? partCategory === 'face'
        ? config.face
        : partCategory === 'hair' || partCategory === 'head'
        ? config.hair || config.head
        : partCategory === 'outfit'
        ? config.outfit || config.body
        : partCategory === 'fullbody'
        ? config.fullbody || { x: 0, y: 0, scale: 1 }
        : partCategory === 'body'
        ? config.body || config.outfit
        : config.leg || config.outfit
      : null;

    const offset = {
      x: Number(rawOffset?.x ?? 0),
      y: Number(rawOffset?.y ?? 0),
      scale: Math.max(0.2, Number(rawOffset?.scale ?? 1)),
    };

    ctx.save();

    // Clip to slot box if cut marks / border mode
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.width, box.height);
    ctx.clip();

    // Fit tile into box
    const tileAspect = tile.width / tile.height;
    const boxAspect = box.width / box.height;
    let baseW = box.width;
    let baseH = box.height;

    if (tileAspect > boxAspect) {
      baseH = box.width / tileAspect;
    } else {
      baseW = box.height * tileAspect;
    }

    const drawW = baseW * offset.scale;
    const drawH = baseH * offset.scale;

    // Anchor center positioning
    const centerX = box.x + box.width / 2 + offset.x;
    const centerY = box.y + box.height / 2 + offset.y;

    const drawX = centerX - drawW / 2;
    const drawY = centerY - drawH / 2;

    ctx.drawImage(tile, drawX, drawY, drawW, drawH);

    ctx.restore();
  });

  // 2. Draw Guides and Anchors for this specific category
  boxes.forEach((box) => {
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    // Box border
    if (guideSettings.showBoxBorder) {
      ctx.save();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.restore();
    }

    // 15개 칸마다: 세로 중앙 & 가로 중앙 주황색 기준선 (Vertical & Horizontal Orange Center Guidelines)
    if (guideSettings.showCenterLine) {
      const orangeColor = guideSettings.centerLineColor || '#f97316'; // 주황색 기준선
      const lineWidth = guideSettings.centerLineWidth || 2.5;
      const isDashed = guideSettings.centerLineStyle === 'dashed';
      const dashPattern = isDashed ? [8, 4] : [];

      ctx.save();

      // [1] Dark outer border outline (어두운 외곽선 그림자 - 밝은 머리/피부/배경에서도 주황색이 선명하게 도드라지도록)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.lineWidth = lineWidth + 2.5;
      ctx.setLineDash(dashPattern);

      // 세로 중앙선 외곽선 (Vertical Center Outline)
      ctx.beginPath();
      ctx.moveTo(centerX, box.y);
      ctx.lineTo(centerX, box.y + box.height);
      ctx.stroke();

      // 가로 중앙선 외곽선 (Horizontal Center Outline)
      ctx.beginPath();
      ctx.moveTo(box.x, centerY);
      ctx.lineTo(box.x + box.width, centerY);
      ctx.stroke();

      // [2] 선명한 주황색 중심 코어선 (Vivid Orange Main Center Lines)
      ctx.strokeStyle = orangeColor;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash(dashPattern);

      // 세로 중앙선 (Vertical Center Line)
      ctx.beginPath();
      ctx.moveTo(centerX, box.y);
      ctx.lineTo(centerX, box.y + box.height);
      ctx.stroke();

      // 가로 중앙선 (Horizontal Center Line)
      ctx.beginPath();
      ctx.moveTo(box.x, centerY);
      ctx.lineTo(box.x + box.width, centerY);
      ctx.stroke();

      // [3] 중앙 정렬 교차점 원 및 4방향 눈금 팁 (Center Pip & 4 Direction Arrow Ticks)
      ctx.setLineDash([]);

      // 중앙 정밀 교차점 타겟 원 (Center Intersection Target Circle)
      ctx.fillStyle = orangeColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
      ctx.stroke();

      // 4방향 기준 화살표 노치 (상, 하, 좌, 우)
      ctx.fillStyle = orangeColor;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = 1;

      // 상단 세로선 가이드 팁
      ctx.beginPath();
      ctx.moveTo(centerX - 6, box.y + 1);
      ctx.lineTo(centerX + 6, box.y + 1);
      ctx.lineTo(centerX, box.y + 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 하단 세로선 가이드 팁
      ctx.beginPath();
      ctx.moveTo(centerX - 6, box.y + box.height - 1);
      ctx.lineTo(centerX + 6, box.y + box.height - 1);
      ctx.lineTo(centerX, box.y + box.height - 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 좌측 가로선 가이드 팁
      ctx.beginPath();
      ctx.moveTo(box.x + 1, centerY - 6);
      ctx.lineTo(box.x + 1, centerY + 6);
      ctx.lineTo(box.x + 10, centerY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 우측 가로선 가이드 팁
      ctx.beginPath();
      ctx.moveTo(box.x + box.width - 1, centerY - 6);
      ctx.lineTo(box.x + box.width - 1, centerY + 6);
      ctx.lineTo(box.x + box.width - 10, centerY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    // Part-specific Anchor & Reference Lines
    if (partCategory === 'face') {
      // FACE: NOSE ANCHOR (얼굴 코 중심 기준점)
      const noseAnchorY = centerY + (anchorSettings.faceNoseY ?? anchorSettings.headNoseY ?? 10);

      if (guideSettings.showReferenceLines) {
        // Eye reference level
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)'; // Sky blue
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(box.x, noseAnchorY - 20);
        ctx.lineTo(box.x + box.width, noseAnchorY - 20);
        ctx.stroke();
        ctx.restore();
      }

      if (guideSettings.showAnchorCrosshair) {
        // Orange Nose Anchor Target
        ctx.save();
        ctx.strokeStyle = '#f97316'; // Orange
        ctx.lineWidth = 1.8;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(box.x, noseAnchorY);
        ctx.lineTo(box.x + box.width, noseAnchorY);
        ctx.stroke();

        // Crosshair center pip
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(centerX, noseAnchorY, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(centerX, noseAnchorY, 7, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }
    } else if (partCategory === 'hair' || partCategory === 'head') {
      // HAIR: NOSE ANCHOR (헤어 결합 코 중심 기준선)
      const noseAnchorY = centerY + (anchorSettings.hairNoseY ?? anchorSettings.headNoseY ?? 10);

      if (guideSettings.showReferenceLines) {
        // Hairline reference level
        ctx.save();
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.45)'; // Purple
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(box.x, noseAnchorY - 35);
        ctx.lineTo(box.x + box.width, noseAnchorY - 35);
        ctx.stroke();
        ctx.restore();
      }

      if (guideSettings.showAnchorCrosshair) {
        // Violet / Purple Hair Anchor Target
        ctx.save();
        ctx.strokeStyle = '#c084fc'; // Purple
        ctx.lineWidth = 1.8;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(box.x, noseAnchorY);
        ctx.lineTo(box.x + box.width, noseAnchorY);
        ctx.stroke();

        // Crosshair center pip
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.arc(centerX, noseAnchorY, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(centerX, noseAnchorY, 7, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }
    } else if (partCategory === 'body') {
      // BODY: NECK ANCHOR (목끝 결합 기준선)
      const neckAnchorY = centerY + anchorSettings.bodyNeckY;

      if (guideSettings.showAnchorCrosshair) {
        ctx.save();
        ctx.strokeStyle = '#38bdf8'; // Sky blue
        ctx.lineWidth = 1.8;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(box.x, neckAnchorY);
        ctx.lineTo(box.x + box.width, neckAnchorY);
        ctx.stroke();

        // Crosshair center pip
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(centerX, neckAnchorY, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(centerX, neckAnchorY, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (guideSettings.showReferenceLines) {
        // Shoulder level reference
        ctx.save();
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)'; // Indigo
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(box.x, neckAnchorY + 40);
        ctx.lineTo(box.x + box.width, neckAnchorY + 40);
        ctx.stroke();
        ctx.restore();
      }
    } else if (partCategory === 'leg') {
      // LEG: FOOT GROUND ANCHOR (발끝 바닥 기준선)
      const footAnchorY = centerY + anchorSettings.legFootY;

      if (guideSettings.showAnchorCrosshair) {
        ctx.save();
        ctx.strokeStyle = '#eab308'; // Amber / Gold
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(box.x, footAnchorY);
        ctx.lineTo(box.x + box.width, footAnchorY);
        ctx.stroke();

        // Crosshair center pip
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(centerX, footAnchorY, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(centerX, footAnchorY, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (guideSettings.showReferenceLines) {
        // Waist level reference
        const waistY = footAnchorY - 180;
        ctx.save();
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.35)'; // Pink
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(box.x, waistY);
        ctx.lineTo(box.x + box.width, waistY);
        ctx.stroke();
        ctx.restore();
      }
    } else if (partCategory === 'outfit') {
      // OUTFIT: NECK ANCHOR (목끝 결합 기준선) & WAIST REFERENCE
      const neckAnchorY = centerY + (anchorSettings.outfitNeckY ?? anchorSettings.bodyNeckY ?? -95);
      const waistY = centerY + 10;
      const footAnchorY = centerY + anchorSettings.legFootY;

      if (guideSettings.showAnchorCrosshair) {
        ctx.save();
        ctx.strokeStyle = '#38bdf8'; // Sky blue neck crosshair
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(box.x, neckAnchorY);
        ctx.lineTo(box.x + box.width, neckAnchorY);
        ctx.stroke();

        // Crosshair center pip
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(centerX, neckAnchorY, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(centerX, neckAnchorY, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (guideSettings.showReferenceLines) {
        ctx.save();
        // Waist level reference
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)'; // Pink
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(box.x, waistY);
        ctx.lineTo(box.x + box.width, waistY);
        ctx.stroke();

        // Foot ground reference
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)'; // Amber
        ctx.beginPath();
        ctx.moveTo(box.x, footAnchorY);
        ctx.lineTo(box.x + box.width, footAnchorY);
        ctx.stroke();
        ctx.restore();
      }
    } else if (partCategory === 'fullbody') {
      // FULLBODY: GROUND ANCHOR (발끝 기준선) & CROWN / EYE / WAIST REFERENCE LINES
      const footAnchorY = centerY + (anchorSettings.fullbodyFootY ?? anchorSettings.legFootY ?? 130);
      const headTopY = centerY - 140;
      const eyeNoseY = centerY - 65;
      const waistY = centerY + 10;

      if (guideSettings.showAnchorCrosshair) {
        ctx.save();
        ctx.strokeStyle = '#eab308'; // Amber / Gold Ground Line
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(box.x, footAnchorY);
        ctx.lineTo(box.x + box.width, footAnchorY);
        ctx.stroke();

        // Crosshair center pip
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(centerX, footAnchorY, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(centerX, footAnchorY, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (guideSettings.showReferenceLines) {
        ctx.save();
        // Head crown reference (정수리 키선)
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)'; // Purple
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(box.x, headTopY);
        ctx.lineTo(box.x + box.width, headTopY);
        ctx.stroke();

        // Eye / Face level reference (얼굴 시선)
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.45)'; // Orange
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(box.x, eyeNoseY);
        ctx.lineTo(box.x + box.width, eyeNoseY);
        ctx.stroke();

        // Waist level reference (허리선)
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.35)'; // Pink
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(box.x, waistY);
        ctx.lineTo(box.x + box.width, waistY);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Number tag
    if (guideSettings.showNumbers) {
      ctx.save();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 13px sans-serif';
      ctx.fillText(`#${box.id}`, box.x + 8, box.y + 20);
      ctx.restore();
    }
  });

  // 3. Highlight active or hovered slot
  boxes.forEach((box) => {
    if (box.id === activeSlotId) {
      ctx.save();
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
      ctx.fillRect(box.x, box.y, box.width, box.height);
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      ctx.fillStyle = '#4f46e5';
      ctx.beginPath();
      ctx.roundRect(box.x, box.y - 24, 78, 22, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`선택 #${box.id}`, box.x + 8, box.y - 9);
      ctx.restore();
    } else if (box.id === hoverSlotId) {
      ctx.save();
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(99, 102, 241, 0.03)';
      ctx.fillRect(box.x, box.y, box.width, box.height);
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.restore();
    }
  });
}

function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  size = 20
) {
  ctx.save();
  ctx.fillStyle = '#334155';
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      if ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 1) {
        ctx.fillRect(x, y, size, size);
      }
    }
  }
  ctx.restore();
}

// Renders an individual part on a dedicated square canvas aligned to standard anchor
export function renderSinglePartTile(
  tile: HTMLCanvasElement,
  offset: { x: number; y: number; scale: number },
  targetSize = 512
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const tileAspect = tile.width / tile.height;
  let baseW = targetSize * 0.9;
  let baseH = targetSize * 0.9;
  if (tileAspect > 1) {
    baseH = baseW / tileAspect;
  } else {
    baseW = baseH * tileAspect;
  }

  const drawW = baseW * offset.scale;
  const drawH = baseH * offset.scale;

  const cx = targetSize / 2 + offset.x;
  const cy = targetSize / 2 + offset.y;

  ctx.drawImage(tile, cx - drawW / 2, cy - drawH / 2, drawW, drawH);

  return canvas;
}

// Renders an assembled character (Face + Hair + Body + Leg or Face + Outfit)
// User requirement: "얼굴 30종, 상의+하의 30종. 이거를 편집할수 있게 만들어줘"
export function renderAssembledCharacter(
  faceTile: HTMLCanvasElement | null,
  hairTile: HTMLCanvasElement | null,
  bodyTile: HTMLCanvasElement | null,
  legTile: HTMLCanvasElement | null,
  faceOffset: { x: number; y: number; scale: number },
  hairOffset: { x: number; y: number; scale: number },
  bodyOffset: { x: number; y: number; scale: number },
  legOffset: { x: number; y: number; scale: number },
  anchorSettings: AnchorSettings,
  targetWidth = 600,
  targetHeight = 900,
  layerOrder: 'hair-face-body-leg' | 'head-body-leg' | 'head-leg-body' = 'hair-face-body-leg',
  outfitTile?: HTMLCanvasElement | null,
  outfitOffset?: { x: number; y: number; scale: number },
  fullbodyTile?: HTMLCanvasElement | null,
  fullbodyOffset?: { x: number; y: number; scale: number }
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const cx = targetWidth / 2;
  // Character anatomy baseline centers
  const baseScale = targetWidth / 400;

  // Neck and waist anchors connect the pieces seamlessly
  const headCenterY = targetHeight * 0.28;
  const bodyCenterY = targetHeight * 0.52 + anchorSettings.neckJointGap;
  const legCenterY = targetHeight * 0.76 + anchorSettings.waistJointGap;

  const drawPart = (
    tile: HTMLCanvasElement | null,
    offset: { x: number; y: number; scale: number },
    baseCy: number,
    customBaseW?: number
  ) => {
    if (!tile) return;
    const tileAspect = tile.width / tile.height;
    const baseW = (customBaseW || 340) * baseScale;
    const baseH = baseW / tileAspect;

    const drawW = baseW * offset.scale;
    const drawH = baseH * offset.scale;

    const posX = cx + offset.x * baseScale - drawW / 2;
    const posY = baseCy + offset.y * baseScale - drawH / 2;

    ctx.drawImage(tile, posX, posY, drawW, drawH);
  };

  // If fullbodyTile is provided (전신 캐릭터 30종 일체형 모드)
  if (fullbodyTile) {
    const activeFullbodyOffset = fullbodyOffset || { x: 0, y: 0, scale: 1 };
    const fullbodyCenterY = targetHeight * 0.50;
    drawPart(fullbodyTile, activeFullbodyOffset, fullbodyCenterY, 360);
    return canvas;
  }

  // If outfitTile is provided (2-part mode: 얼굴 30종 + 상의/하의 의상 30종)
  if (outfitTile) {
    const activeOutfitOffset = outfitOffset || bodyOffset || { x: 0, y: 0, scale: 1 };
    const outfitCenterY = targetHeight * 0.58 + anchorSettings.neckJointGap;
    drawPart(outfitTile, activeOutfitOffset, outfitCenterY, 360);
    drawPart(faceTile, faceOffset, headCenterY);
    drawPart(hairTile, hairOffset, headCenterY);
  } else {
    // 4-part mode: Leg -> Body -> Face -> Hair
    drawPart(legTile, legOffset || outfitOffset, legCenterY);
    drawPart(bodyTile, bodyOffset || outfitOffset, bodyCenterY);
    drawPart(faceTile, faceOffset, headCenterY);
    drawPart(hairTile, hairOffset, headCenterY);
  }

  return canvas;
}

// Download canvas as PNG
export function downloadCanvas(canvas: HTMLCanvasElement, filename = 'sprite.png') {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// Export individual PNGs for a given part category (Face, Hair, Top, Bottom, or Outfit)
export async function exportPartZip(
  partCategory: PartCategory,
  tiles: HTMLCanvasElement[],
  slotConfigs: SlotConfig[],
  targetSize = 512,
  count?: number
): Promise<Blob> {
  const actualCount = count || tiles.length || 15;
  const zip = new JSZip();
  const folderName =
    partCategory === 'face'
      ? `${actualCount}_face_pngs`
      : partCategory === 'hair' || partCategory === 'head'
      ? `${actualCount}_hair_pngs`
      : partCategory === 'body'
      ? `${actualCount}_top_pngs`
      : partCategory === 'outfit'
      ? `${actualCount}_outfit_top_bottom_pngs`
      : partCategory === 'fullbody'
      ? `${actualCount}_fullbody_character_pngs`
      : `${actualCount}_bottom_pngs`;
  const folder = zip.folder(folderName) || zip;

  const prefix =
    partCategory === 'face'
      ? 'face'
      : partCategory === 'hair' || partCategory === 'head'
      ? 'hair'
      : partCategory === 'body'
      ? 'top'
      : partCategory === 'outfit'
      ? 'outfit'
      : partCategory === 'fullbody'
      ? 'character'
      : 'bottom';

  for (let i = 0; i < actualCount; i++) {
    const tile = tiles[i];
    if (!tile) continue;

    const config = slotConfigs.find((s) => s.id === i + 1);
    const offset = config
      ? partCategory === 'face'
        ? config.face
        : partCategory === 'hair' || partCategory === 'head'
        ? config.hair || config.head
        : partCategory === 'body'
        ? config.body
        : partCategory === 'outfit'
        ? config.outfit || config.body
        : partCategory === 'fullbody'
        ? config.fullbody || { x: 0, y: 0, scale: 1 }
        : config.leg
      : { x: 0, y: 0, scale: 1 };

    const rendered = renderSinglePartTile(tile, offset, targetSize);
    const blob = await new Promise<Blob | null>((resolve) =>
      rendered.toBlob(resolve, 'image/png')
    );

    if (blob) {
      const numStr = String(i + 1).padStart(2, '0');
      folder.file(`${prefix}_${numStr}.png`, blob);
    }
  }

  return zip.generateAsync({ type: 'blob' });
}

// Export all individual part PNGs in a game-ready structured package (15 or 30 slots)
export async function exportAllPartsZip(
  faceTiles: HTMLCanvasElement[],
  hairTiles: HTMLCanvasElement[],
  bodyTiles: HTMLCanvasElement[],
  legTiles: HTMLCanvasElement[],
  slotConfigs: SlotConfig[],
  anchorSettings: AnchorSettings,
  targetSize = 512,
  count?: number,
  outfitTiles?: HTMLCanvasElement[]
): Promise<Blob> {
  const actualCount = count || Math.max(faceTiles.length, hairTiles.length, bodyTiles.length, legTiles.length, outfitTiles?.length || 0) || 15;
  const zip = new JSZip();
  const faceFolder = zip.folder('face') || zip;
  const hairFolder = zip.folder('hair') || zip;
  const topFolder = zip.folder('top') || zip;
  const bottomFolder = zip.folder('bottom') || zip;
  const outfitFolder = (outfitTiles && outfitTiles.length > 0) ? (zip.folder('outfit') || zip) : null;

  for (let i = 0; i < actualCount; i++) {
    const numStr = String(i + 1).padStart(2, '0');
    const config = slotConfigs.find((s) => s.id === i + 1) || {
      id: i + 1,
      name: `캐릭터 #${i + 1}`,
      face: { x: 0, y: 0, scale: 1 },
      hair: { x: 0, y: 0, scale: 1 },
      body: { x: 0, y: 0, scale: 1 },
      leg: { x: 0, y: 0, scale: 1 },
      outfit: { x: 0, y: 0, scale: 1 },
      head: { x: 0, y: 0, scale: 1 },
      global: { x: 0, y: 0, scale: 1 },
      enabled: true,
    };

    // Face
    if (faceTiles[i]) {
      const canvas = renderSinglePartTile(faceTiles[i], config.face, targetSize);
      const b = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (b) faceFolder.file(`face_${numStr}.png`, b);
    }

    // Outfit
    if (outfitTiles && outfitTiles[i] && outfitFolder) {
      const canvas = renderSinglePartTile(outfitTiles[i], config.outfit || config.body, targetSize);
      const b = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (b) outfitFolder.file(`outfit_${numStr}.png`, b);
    }

    // Hair
    if (hairTiles[i]) {
      const canvas = renderSinglePartTile(hairTiles[i], config.hair || config.head, targetSize);
      const b = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (b) hairFolder.file(`hair_${numStr}.png`, b);
    }

    // Top
    if (bodyTiles[i]) {
      const canvas = renderSinglePartTile(bodyTiles[i], config.body, targetSize);
      const b = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (b) topFolder.file(`top_${numStr}.png`, b);
    }

    // Bottom
    if (legTiles[i]) {
      const canvas = renderSinglePartTile(legTiles[i], config.leg, targetSize);
      const b = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (b) bottomFolder.file(`bottom_${numStr}.png`, b);
    }
  }

  // Add JSON manifest for game engines (Unity / Godot / Web Game)
  const manifest = {
    generator: `${actualCount} 캐릭터 모듈러 파트 스튜디오`,
    standardResolution: `${targetSize}x${targetSize}`,
    counts: {
      face: actualCount,
      outfit: outfitTiles?.length || 0,
      hair: actualCount,
      top: actualCount,
      bottom: actualCount
    },
    anchorSettings,
    slots: slotConfigs.slice(0, actualCount).map((c) => ({
      id: c.id,
      name: c.name,
      face: c.face,
      outfit: c.outfit,
      hair: c.hair,
      body: c.body,
      leg: c.leg,
    })),
  };
  zip.file('character_parts_manifest.json', JSON.stringify(manifest, null, 2));

  return zip.generateAsync({ type: 'blob' });
}

// Export assembled character PNGs
export async function exportAllAssembledZip(
  faceTiles: HTMLCanvasElement[],
  hairTiles: HTMLCanvasElement[],
  bodyTiles: HTMLCanvasElement[],
  legTiles: HTMLCanvasElement[],
  slotConfigs: SlotConfig[],
  anchorSettings: AnchorSettings,
  layerOrder: 'hair-face-body-leg' | 'head-body-leg' | 'head-leg-body' = 'hair-face-body-leg',
  count?: number,
  outfitTiles?: HTMLCanvasElement[]
): Promise<Blob> {
  const actualCount = count || Math.max(faceTiles.length, hairTiles.length, bodyTiles.length, legTiles.length, outfitTiles?.length || 0) || 15;
  const zip = new JSZip();
  const folder = zip.folder('assembled_characters') || zip;

  for (let id = 1; id <= actualCount; id++) {
    const config = slotConfigs.find((s) => s.id === id) || {
      id,
      name: `캐릭터 #${id}`,
      face: { x: 0, y: 0, scale: 1 },
      hair: { x: 0, y: 0, scale: 1 },
      body: { x: 0, y: 0, scale: 1 },
      leg: { x: 0, y: 0, scale: 1 },
      outfit: { x: 0, y: 0, scale: 1 },
      head: { x: 0, y: 0, scale: 1 },
      global: { x: 0, y: 0, scale: 1 },
      enabled: true,
    };

    const face = faceTiles[id - 1] || null;
    const hair = hairTiles[id - 1] || null;
    const body = bodyTiles[id - 1] || null;
    const leg = legTiles[id - 1] || null;
    const outfit = outfitTiles ? outfitTiles[id - 1] || null : null;

    const charCanvas = renderAssembledCharacter(
      face,
      hair,
      body,
      leg,
      config.face,
      config.hair || config.head,
      config.body,
      config.leg,
      anchorSettings,
      600,
      900,
      layerOrder,
      outfit,
      config.outfit
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      charCanvas.toBlob(resolve, 'image/png')
    );

    if (blob) {
      folder.file(`character_${String(id).padStart(2, '0')}.png`, blob);
    }
  }

  return zip.generateAsync({ type: 'blob' });
}
