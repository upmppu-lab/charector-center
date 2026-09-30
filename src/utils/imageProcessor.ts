import JSZip from 'jszip';
import { GuideLineSettings, PartOffset, ProcessingSettings, SlotConfig } from '../types';

// Slices an image (3 rows x 5 columns = 15 tiles)
export function sliceSpriteSheet(
  img: HTMLImageElement,
  rows = 3,
  cols = 5,
  settings: ProcessingSettings,
  isFaceSheet = false
): HTMLCanvasElement[] {
  const tiles: HTMLCanvasElement[] = [];
  const tileWidth = Math.floor(img.naturalWidth / cols);
  const tileHeight = Math.floor(img.naturalHeight / rows);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const canvas = document.createElement('canvas');
      canvas.width = tileWidth;
      canvas.height = tileHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) continue;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw the sub-tile
      ctx.drawImage(
        img,
        c * tileWidth,
        r * tileHeight,
        tileWidth,
        tileHeight,
        0,
        0,
        tileWidth,
        tileHeight
      );

      // Process transparency
      if (settings.bgRemovalMethod === 'floodfill') {
        floodFillBorderTransparency(ctx, tileWidth, tileHeight, settings.tolerance);
      } else if (settings.bgRemovalMethod === 'whitekey') {
        colorKeyTransparency(ctx, tileWidth, tileHeight, settings.tolerance);
      }

      // Automatically clean stray adjacent hair if enabled or if this is the face/hair sheet
      if (settings.autoCleanStrayHair) {
        cleanStrayNeighborHair(ctx, tileWidth, tileHeight, settings.sideTrimPx);
      }

      tiles.push(canvas);
    }
  }

  return tiles;
}

// Flood fill starting from all 4 borders so that internal white elements (white shirts, socks, ribbons) remain solid!
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

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const vPos = ny * width + nx;
        if (!visited[vPos]) {
          visited[vPos] = 1;
          const nIdx = vPos * 4;
          if (isBackground(nIdx)) {
            queue.push(nx, ny);
          }
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

// Global white key transparency
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
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r >= threshold && g >= threshold && b >= threshold) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

// Removes adjacent neighbor hair bleed (e.g. stray hair from tile #1 showing on left of tile #2)
export function cleanStrayNeighborHair(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sideTrim = 0
) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 1. If explicit side trim margin is set, clear outer boundary margins
  if (sideTrim > 0) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < sideTrim; x++) {
        data[(y * width + x) * 4 + 3] = 0;
      }
      for (let x = width - sideTrim; x < width; x++) {
        data[(y * width + x) * 4 + 3] = 0;
      }
    }
  }

  // 2. Connected Component Analysis to isolate the central character and delete edge bleed islands
  const visited = new Uint8Array(width * height);
  interface Island {
    pixels: number[];
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    count: number;
  }
  const islands: Island[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const alpha = data[idx * 4 + 3];

      if (alpha > 15 && !visited[idx]) {
        // Start exploring new island
        const islandPixels: number[] = [];
        const queue: number[] = [x, y];
        visited[idx] = 1;

        let minX = x;
        let maxX = x;
        let minY = y;
        let maxY = y;

        let qHead = 0;
        while (qHead < queue.length) {
          const cx = queue[qHead++];
          const cy = queue[qHead++];
          const pPos = cy * width + cx;
          islandPixels.push(pPos);

          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          const neighbors = [
            [cx + 1, cy],
            [cx - 1, cy],
            [cx, cy + 1],
            [cx, cy - 1],
          ];

          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nPos = ny * width + nx;
              if (!visited[nPos] && data[nPos * 4 + 3] > 15) {
                visited[nPos] = 1;
                queue.push(nx, ny);
              }
            }
          }
        }

        islands.push({
          pixels: islandPixels,
          minX,
          maxX,
          minY,
          maxY,
          count: islandPixels.length,
        });
      }
    }
  }

  if (islands.length === 0) return;

  // The main character component must cross or be close to the central vertical axis
  const centerX = width * 0.5;

  // Find the primary character island (largest or one covering center)
  let mainIsland = islands[0];
  let maxScore = -1;

  for (const isl of islands) {
    // Score based on pixel count and proximity to center
    const crossesCenter = isl.minX <= centerX && isl.maxX >= centerX;
    const centerDist = Math.abs((isl.minX + isl.maxX) / 2 - centerX);
    const score = isl.count * (crossesCenter ? 2.5 : 1) / (1 + centerDist / width);
    if (score > maxScore) {
      maxScore = score;
      mainIsland = isl;
    }
  }

  // Erase any stray islands that are located near the left or right borders
  // and NOT connected to the main character
  for (const isl of islands) {
    if (isl === mainIsland) continue;

    // Check if this island is on the left margin or right margin
    const isLeftMarginStray = isl.maxX < width * 0.28;
    const isRightMarginStray = isl.minX > width * 0.72;
    const isTinyDetached = isl.count < mainIsland.count * 0.05 && (isl.maxX < width * 0.35 || isl.minX > width * 0.65);

    if (isLeftMarginStray || isRightMarginStray || isTinyDetached) {
      // Erase this stray hair artifact!
      for (const pPos of isl.pixels) {
        data[pPos * 4 + 3] = 0;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

// Layout slot bounding boxes in the 15-character grid
export interface SlotBox {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  eyeY: number;
  footY: number;
  centerX: number;
}

export function calculateSlotBoxes(
  canvasWidth: number,
  canvasHeight: number,
  hasGuideImage: boolean,
  eyeLineYOffset = 0,
  footLineYOffset = 0
): SlotBox[] {
  const boxes: SlotBox[] = [];

  const startX = canvasWidth * 0.022;
  const gapX = canvasWidth * 0.032;
  const boxWidth = (canvasWidth - startX * 2 - gapX * 4) / 5;

  const headerY = canvasHeight * 0.108;
  const availableH = canvasHeight - headerY - canvasHeight * 0.035;
  const gapY = canvasHeight * 0.038;
  const boxHeight = (availableH - gapY * 2) / 3;

  let id = 1;
  for (let r = 0; r < 3; r++) {
    const boxY = headerY + r * (boxHeight + gapY);
    // Eye and Foot lines with customizable Y offsets!
    const eyeY = boxY + boxHeight * 0.352 + eyeLineYOffset;
    const footY = boxY + boxHeight * 0.942 + footLineYOffset;

    for (let c = 0; c < 5; c++) {
      const boxX = startX + c * (boxWidth + gapX);
      const centerX = boxX + boxWidth * 0.5;

      boxes.push({
        id,
        x: boxX,
        y: boxY,
        width: boxWidth,
        height: boxHeight,
        eyeY,
        footY,
        centerX,
      });
      id++;
    }
  }

  return boxes;
}

// Assembles a single character into an isolated canvas
export function renderSingleCharacter(
  headTile: HTMLCanvasElement | null,
  bodyTile: HTMLCanvasElement | null,
  legTile: HTMLCanvasElement | null,
  config: SlotConfig,
  targetHeight = 800,
  layerOrder: 'head-body-leg' | 'head-leg-body' = 'head-body-leg'
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(targetHeight * 0.7);
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const centerX = canvas.width / 2;
  const baseScale = targetHeight / 850;

  const drawLegs = () => {
    if (!legTile) return;
    const s = (config.leg.scale || 1) * baseScale;
    const w = legTile.width * s * 0.65;
    const h = legTile.height * s * 0.65;
    const x = centerX + (config.leg.x || 0) - w / 2;
    const y = canvas.height * 0.52 + (config.leg.y || 0);
    ctx.drawImage(legTile, x, y, w, h);
  };

  const drawBody = () => {
    if (!bodyTile) return;
    const s = (config.body.scale || 1) * baseScale;
    const w = bodyTile.width * s * 0.65;
    const h = bodyTile.height * s * 0.65;
    const x = centerX + (config.body.x || 0) - w / 2;
    const y = canvas.height * 0.28 + (config.body.y || 0);
    ctx.drawImage(bodyTile, x, y, w, h);
  };

  const drawHead = () => {
    if (!headTile) return;
    const s = (config.head.scale || 1) * baseScale;
    const w = headTile.width * s * 0.65;
    const h = headTile.height * s * 0.65;
    const x = centerX + (config.head.x || 0) - w / 2;
    const y = canvas.height * 0.05 + (config.head.y || 0);
    ctx.drawImage(headTile, x, y, w, h);
  };

  if (layerOrder === 'head-body-leg') {
    drawLegs();
    drawBody();
    drawHead();
  } else {
    drawBody();
    drawLegs();
    drawHead();
  }

  return canvas;
}

// Render all 15 characters onto the main composite canvas
export function renderCompositeCanvas(
  canvas: HTMLCanvasElement,
  headTiles: HTMLCanvasElement[],
  bodyTiles: HTMLCanvasElement[],
  legTiles: HTMLCanvasElement[],
  slotConfigs: SlotConfig[],
  guideImage: HTMLImageElement | null,
  guideSettings: GuideLineSettings,
  processingSettings: ProcessingSettings,
  activeSlotId: number | null = null,
  hoverSlotId: number | null = null
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // Clear
  ctx.clearRect(0, 0, width, height);

  // Background
  if (guideSettings.backgroundColor === 'white') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  } else if (guideSettings.backgroundColor === 'dark') {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
  } else if (guideSettings.backgroundColor === 'grid') {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#e2e8f0';
    const sz = 24;
    for (let y = 0; y < height; y += sz) {
      for (let x = 0; x < width; x += sz) {
        if ((Math.floor(x / sz) + Math.floor(y / sz)) % 2 === 0) {
          ctx.fillRect(x, y, sz, sz);
        }
      }
    }
  }

  // 1. Guide background image (if enabled & available)
  if (guideSettings.showGuideBackground && guideImage) {
    ctx.save();
    ctx.globalAlpha = guideSettings.guideOpacity;
    ctx.drawImage(guideImage, 0, 0, width, height);
    ctx.restore();
  }

  const boxes = calculateSlotBoxes(
    width,
    height,
    !!guideImage,
    guideSettings.eyeLineYOffset || 0,
    guideSettings.footLineYOffset || 0
  );

  // 2. Draw slots & characters
  boxes.forEach((box) => {
    const config = slotConfigs.find((s) => s.id === box.id) || {
      id: box.id,
      name: `캐릭터 #${box.id}`,
      head: { x: 0, y: 0, scale: 1 },
      body: { x: 0, y: 0, scale: 1 },
      leg: { x: 0, y: 0, scale: 1 },
      global: { x: 0, y: 0, scale: 1 },
      enabled: true,
    };

    if (!config.enabled) return;

    const headTile = headTiles[box.id - 1] || null;
    const bodyTile = bodyTiles[box.id - 1] || null;
    const legTile = legTiles[box.id - 1] || null;

    const scaleFactor = (box.height / 520) * (config.global.scale || 1);
    const charCenterX = box.centerX + (config.global.x || 0);

    ctx.save();

    // Helper functions for parts
    const drawLeg = () => {
      if (!legTile) return;
      const legScale = (config.leg.scale || 1) * scaleFactor * 0.58;
      const legW = legTile.width * legScale;
      const legH = legTile.height * legScale;
      const legX = charCenterX + (config.leg.x || 0) - legW / 2;
      const legY = box.footY - legH * 0.98 + (config.leg.y || 0);
      ctx.drawImage(legTile, legX, legY, legW, legH);
    };

    const drawBody = () => {
      if (!bodyTile) return;
      const bodyScale = (config.body.scale || 1) * scaleFactor * 0.58;
      const bodyW = bodyTile.width * bodyScale;
      const bodyH = bodyTile.height * bodyScale;
      // Direct positioning based on charCenterX and box foot line, with exact body.x and body.y offset!
      const bodyX = charCenterX + (config.body.x || 0) - bodyW / 2;
      const bodyY = box.footY - box.height * 0.44 + (config.body.y || 0);
      ctx.drawImage(bodyTile, bodyX, bodyY, bodyW, bodyH);
    };

    const drawHead = () => {
      if (!headTile) return;
      const headScale = (config.head.scale || 1) * scaleFactor * 0.58;
      const headW = headTile.width * headScale;
      const headH = headTile.height * headScale;
      const headX = charCenterX + (config.head.x || 0) - headW / 2;
      const headY = box.eyeY - headH * 0.52 + (config.head.y || 0);
      ctx.drawImage(headTile, headX, headY, headW, headH);
    };

    // Layering
    if (processingSettings.layerOrder === 'head-body-leg') {
      drawLeg();
      drawBody();
      drawHead();
    } else {
      drawBody();
      drawLeg();
      drawHead();
    }

    ctx.restore();
  });

  // 3. Draw guide overlays if enabled (Eye line, foot line, box borders, cut marks)
  // Eye line (blue) - dynamically drawn at box.eyeY (movable!)
  if (guideSettings.showEyeLine) {
    ctx.save();
    ctx.strokeStyle = '#2563eb'; // blue-600
    ctx.lineWidth = 2.5;
    for (let r = 0; r < 3; r++) {
      const sampleBox = boxes[r * 5];
      ctx.beginPath();
      ctx.moveTo(boxes[r * 5].x, sampleBox.eyeY);
      ctx.lineTo(boxes[r * 5 + 4].x + boxes[r * 5 + 4].width, sampleBox.eyeY);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Foot line (orange) - dynamically drawn at box.footY (movable!)
  if (guideSettings.showFootLine) {
    ctx.save();
    ctx.strokeStyle = '#d97706'; // amber-600 / orange
    ctx.lineWidth = 2.5;
    for (let r = 0; r < 3; r++) {
      const sampleBox = boxes[r * 5];
      ctx.beginPath();
      ctx.moveTo(boxes[r * 5].x, sampleBox.footY);
      ctx.lineTo(boxes[r * 5 + 4].x + boxes[r * 5 + 4].width, sampleBox.footY);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Box borders & Center lines
  if (guideSettings.showBoxBorder || guideSettings.showCenterLine || guideSettings.showNumbers) {
    boxes.forEach((box) => {
      if (guideSettings.showBoxBorder) {
        ctx.save();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        ctx.restore();
      }

      if (guideSettings.showCenterLine) {
        ctx.save();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(box.centerX, box.y);
        ctx.lineTo(box.centerX, box.y + box.height);
        ctx.stroke();
        ctx.restore();
      }

      if (guideSettings.showNumbers) {
        ctx.save();
        ctx.fillStyle = '#94a3b8';
        ctx.font = `600 ${Math.max(14, Math.floor(box.height * 0.038))}px sans-serif`;
        ctx.fillText(String(box.id), box.x + 8, box.y + 20);
        ctx.restore();
      }
    });
  }

  // Cut marks (자르기용 재단선 / 칼선)
  if (guideSettings.showCutMarks) {
    ctx.save();
    ctx.strokeStyle = guideSettings.cutMarkColor || '#64748b';
    ctx.lineWidth = guideSettings.cutMarkWidth || 1.5;

    if (guideSettings.cutMarkStyle === 'dashed') {
      ctx.setLineDash([6, 6]);
      boxes.forEach((box) => {
        ctx.strokeRect(box.x - 2, box.y - 2, box.width + 4, box.height + 4);
      });
    } else if (guideSettings.cutMarkStyle === 'solid') {
      boxes.forEach((box) => {
        ctx.strokeRect(box.x - 2, box.y - 2, box.width + 4, box.height + 4);
      });
    } else if (guideSettings.cutMarkStyle === 'cropmarks') {
      const markLen = 14;
      boxes.forEach((box) => {
        const x1 = box.x;
        const y1 = box.y;
        const x2 = box.x + box.width;
        const y2 = box.y + box.height;

        ctx.beginPath();
        ctx.moveTo(x1 - markLen, y1);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x1, y1 - markLen);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x2 + markLen, y1);
        ctx.lineTo(x2, y1);
        ctx.lineTo(x2, y1 - markLen);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x1 - markLen, y2);
        ctx.lineTo(x1, y2);
        ctx.lineTo(x1, y2 + markLen);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x2 + markLen, y2);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2, y2 + markLen);
        ctx.stroke();
      });
    }
    ctx.restore();
  }

  // Active / Hovered slot highlighting
  boxes.forEach((box) => {
    if (box.id === activeSlotId) {
      ctx.save();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
      ctx.fillRect(box.x, box.y, box.width, box.height);
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect(box.x, box.y - 24, 70, 22, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`선택 #${box.id}`, box.x + 8, box.y - 8);
      ctx.restore();
    } else if (box.id === hoverSlotId) {
      ctx.save();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(59, 130, 246, 0.03)';
      ctx.fillRect(box.x, box.y, box.width, box.height);
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.restore();
    }
  });
}

// Download canvas as PNG
export function downloadCanvas(canvas: HTMLCanvasElement, filename = '15characters_aligned.png') {
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

// Export all 15 characters as a ZIP of separate PNGs
export async function exportAllCharactersZip(
  headTiles: HTMLCanvasElement[],
  bodyTiles: HTMLCanvasElement[],
  legTiles: HTMLCanvasElement[],
  slotConfigs: SlotConfig[],
  layerOrder: 'head-body-leg' | 'head-leg-body'
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder('characters_15') || zip;

  for (let id = 1; id <= 15; id++) {
    const config = slotConfigs.find((s) => s.id === id) || {
      id,
      name: `캐릭터 #${id}`,
      head: { x: 0, y: 0, scale: 1 },
      body: { x: 0, y: 0, scale: 1 },
      leg: { x: 0, y: 0, scale: 1 },
      global: { x: 0, y: 0, scale: 1 },
      enabled: true,
    };

    const head = headTiles[id - 1] || null;
    const body = bodyTiles[id - 1] || null;
    const leg = legTiles[id - 1] || null;

    const charCanvas = renderSingleCharacter(head, body, leg, config, 1200, layerOrder);

    const blob = await new Promise<Blob | null>((resolve) =>
      charCanvas.toBlob(resolve, 'image/png')
    );

    if (blob) {
      folder.file(`character_${String(id).padStart(2, '0')}.png`, blob);
    }
  }

  return zip.generateAsync({ type: 'blob' });
}
