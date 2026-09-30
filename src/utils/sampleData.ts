import { SlotConfig } from '../types';

export const INITIAL_SLOT_CONFIGS: SlotConfig[] = Array.from({ length: 15 }, (_, i) => {
  const id = i + 1;
  return {
    id,
    name: `캐릭터 #${id}`,
    head: { x: 0, y: 0, scale: 1 },
    body: { x: 0, y: 0, scale: 1 },
    leg: { x: 0, y: 0, scale: 1 },
    global: { x: 0, y: 0, scale: 1 },
    enabled: true,
  };
});

// Outfits metadata matching the user's images for reference & labels
export const CHARACTER_DESCRIPTIONS = [
  { id: 1, hair: '스트레이트 뱅 단발', top: '블루 후드 집업 & 크림 니트', bottom: '블루 플리츠 스커트 & 브라운 부츠' },
  { id: 2, hair: '내추럴 레이어드 단발', top: '크림 카디건 & 블루 리본 타이', bottom: '블랙 플리츠 스커트 & 메리제인' },
  { id: 3, hair: '물결 웨이브 단발', top: '핑크 토끼 후디', bottom: '핑크 체크 플리츠 스커트' },
  { id: 4, hair: '스트레이트 미디엄 단발', top: '화이트 러플 블라우스 & 블랙 리본', bottom: '블랙 티어드 고딕 스커트' },
  { id: 5, hair: '사이드 양갈래 번 헤어', top: '오프숄더 블랙 니트', bottom: '크림 리본 티어드 스커트' },
  { id: 6, hair: '레이어드 컷 & 사이드 뱅', top: '화이트 캣 그래픽 반팔티', bottom: '롤업 데님 숏팬츠 & 스니커즈' },
  { id: 7, hair: '로우 트윈테일 (양갈래)', top: '스트라이프 배색 블랙 롱티', bottom: '블랙 카고 팬츠 & 청키 슈즈' },
  { id: 8, hair: '샤기 숏 단발', top: '라이트 블루 러플 오프숄더', bottom: '와이드 라이트 블루 데님' },
  { id: 9, hair: '사이드 브레이드 롱 웨이브', top: '아이보리 러플 오프숄더 탑', bottom: '그레이 토끼 조거 팬츠' },
  { id: 10, hair: '탑노트 번 미디엄 단발', top: '블랙 시스루 레이스 고딕 탑', bottom: '베이지 하이웨이스트 롱 스커트' },
  { id: 11, hair: '풍성한 롱 웨이브', top: '크림 더플 코트 (떡볶이 단추)', bottom: '브라운 체크 플리츠 & 로퍼' },
  { id: 12, hair: '사이드 하이 포니테일', top: '베이지 트렌치 재킷 & 터틀넥', bottom: '블랙 슬릿 롱 스커트 & 힐' },
  { id: 13, hair: '헤어핀 스트레이트 롱', top: '교복 V넥 니트 베스트 & 타이', bottom: '라이트 블루 언밸런스 러플 스커트' },
  { id: 14, hair: '로우 트윈 번 (경단 머리)', top: '블루 플로럴 뷔스티에 탑', bottom: '화이트 블루 플로럴 롱 스커트' },
  { id: 15, hair: '헤어밴드 땋은 머리 & 리본', top: '와인 레드 로리타 드레스 탑', bottom: '와인 레드 티어드 프릴 롱 스커트' },
];

// Generates an initial high-res guide template canvas matching the 4th screenshot style
export function createGuideTemplateCanvas(width = 2400, height = 1700): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Title header text
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText(
    '가이드선: 15개 캐릭터 전부 이 2개 선에 맞춰서 그려주세요 (그 사이 옷/머리 길이는 자유, 칸 사이 여백은 넉넉히 두었어요)',
    width * 0.022,
    height * 0.038
  );

  // Legend
  ctx.lineWidth = 3;
  // Blue Eye line legend
  ctx.strokeStyle = '#2563eb';
  ctx.beginPath();
  ctx.moveTo(width * 0.022, height * 0.065);
  ctx.lineTo(width * 0.05, height * 0.065);
  ctx.stroke();

  ctx.fillStyle = '#1e293b';
  ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('눈 중앙선', width * 0.055, height * 0.07);

  // Orange Foot line legend
  ctx.strokeStyle = '#d97706';
  ctx.beginPath();
  ctx.moveTo(width * 0.022, height * 0.088);
  ctx.lineTo(width * 0.05, height * 0.088);
  ctx.stroke();

  ctx.fillText('발끝/바닥선', width * 0.055, height * 0.093);

  // Slot boxes
  const startX = width * 0.022;
  const gapX = width * 0.032;
  const boxWidth = (width - startX * 2 - gapX * 4) / 5;

  const headerY = height * 0.108;
  const availableH = height - headerY - height * 0.035;
  const gapY = height * 0.038;
  const boxHeight = (availableH - gapY * 2) / 3;

  let id = 1;
  for (let r = 0; r < 3; r++) {
    const boxY = headerY + r * (boxHeight + gapY);
    const eyeY = boxY + boxHeight * 0.352;
    const footY = boxY + boxHeight * 0.942;

    // Row-spanning eye and foot lines
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(startX, eyeY);
    ctx.lineTo(startX + 5 * boxWidth + 4 * gapX, eyeY);
    ctx.stroke();

    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(startX, footY);
    ctx.lineTo(startX + 5 * boxWidth + 4 * gapX, footY);
    ctx.stroke();

    for (let c = 0; c < 5; c++) {
      const boxX = startX + c * (boxWidth + gapX);
      const centerX = boxX + boxWidth * 0.5;

      // Box outline
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

      // Center guide line
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX, boxY);
      ctx.lineTo(centerX, boxY + boxHeight);
      ctx.stroke();

      // Box number
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText(String(id), boxX + 8, boxY + 20);

      id++;
    }
  }

  return canvas;
}

// Generates procedural fallback preview tiles (so UI renders immediately prior to file drop)
export function createMockTiles(category: 'face' | 'body' | 'leg', count = 15): HTMLCanvasElement[] {
  const tiles: HTMLCanvasElement[] = [];
  const tileW = 400;
  const tileH = 400;

  for (let i = 0; i < count; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = tileW;
    canvas.height = tileH;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    const cx = tileW / 2;
    const desc = CHARACTER_DESCRIPTIONS[i];

    if (category === 'face') {
      // Draw purple haired cute chibi head
      // Neck
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(cx - 16, 260, 32, 50);

      // Face
      ctx.beginPath();
      ctx.ellipse(cx, 210, 85, 75, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ffedd5';
      ctx.fill();

      // Cheeks
      ctx.fillStyle = 'rgba(251, 113, 133, 0.4)';
      ctx.beginPath();
      ctx.arc(cx - 50, 230, 16, 0, Math.PI * 2);
      ctx.arc(cx + 50, 230, 16, 0, Math.PI * 2);
      ctx.fill();

      // Big purple anime eyes
      const eyeY = 210;
      [-36, 36].forEach((xOff) => {
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.ellipse(cx + xOff, eyeY, 18, 26, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.arc(cx + xOff, eyeY + 4, 12, 0, Math.PI * 2);
        ctx.fill();

        // Eye highlights
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx + xOff - 4, eyeY - 6, 6, 0, Math.PI * 2);
        ctx.arc(cx + xOff + 5, eyeY + 8, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Mouth
      ctx.strokeStyle = '#be123c';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, 245, 6, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // Hair (Lavender / Purple shades)
      ctx.fillStyle = '#c084fc';
      // Hair back
      ctx.beginPath();
      ctx.arc(cx, 180, 105, Math.PI * 0.8, Math.PI * 2.2);
      ctx.fill();

      // Bangs
      ctx.beginPath();
      ctx.moveTo(cx - 95, 170);
      ctx.quadraticCurveTo(cx - 50, 120, cx, 120);
      ctx.quadraticCurveTo(cx + 50, 120, cx + 95, 170);
      ctx.lineTo(cx + 80, 195);
      ctx.quadraticCurveTo(cx, 205, cx - 80, 195);
      ctx.closePath();
      ctx.fillStyle = '#a855f7';
      ctx.fill();

      // Hairstyle variations
      if (i === 4) {
        // Double buns
        ctx.beginPath();
        ctx.arc(cx - 95, 120, 35, 0, Math.PI * 2);
        ctx.arc(cx + 95, 120, 35, 0, Math.PI * 2);
        ctx.fill();
      } else if (i === 11) {
        // High ponytail
        ctx.beginPath();
        ctx.arc(cx - 100, 130, 45, 0, Math.PI * 2);
        ctx.fill();
      }

      // Label
      ctx.fillStyle = '#6b21a8';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`#${i + 1} 머리`, cx, 40);
    } else if (category === 'body') {
      // Draw tops
      const topColors = [
        '#0284c7', '#f8fafc', '#f472b6', '#ffffff', '#1e293b',
        '#f1f5f9', '#0f172a', '#93c5fd', '#fef3c7', '#18181b',
        '#fef08a', '#d97706', '#f8fafc', '#bae6fd', '#991b1b',
      ];
      ctx.fillStyle = topColors[i % topColors.length];

      // Torso & sleeves
      ctx.beginPath();
      ctx.roundRect(cx - 65, 120, 130, 150, 14);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Neck cut
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(cx, 118, 25, 0, Math.PI);
      ctx.fill();

      // Small graphic or buttons
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(cx, 160, 5, 0, Math.PI * 2);
      ctx.arc(cx, 190, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`#${i + 1} 상의`, cx, 40);
    } else {
      // Draw bottoms / legs
      const bottomColors = [
        '#3b82f6', '#18181b', '#f472b6', '#0f172a', '#fef08a',
        '#0284c7', '#1e293b', '#60a5fa', '#94a3b8', '#fef3c7',
        '#b45309', '#09090b', '#7dd3fc', '#e0f2fe', '#881337',
      ];

      // Skirt or pants
      ctx.fillStyle = bottomColors[i % bottomColors.length];
      ctx.beginPath();
      ctx.moveTo(cx - 60, 80);
      ctx.lineTo(cx + 60, 80);
      ctx.lineTo(cx + 80, 180);
      ctx.lineTo(cx - 80, 180);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Legs
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(cx - 38, 180, 24, 140);
      ctx.fillRect(cx + 14, 180, 24, 140);

      // Shoes
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(cx - 44, 310, 34, 25, 6);
      ctx.roundRect(cx + 10, 310, 34, 25, 6);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`#${i + 1} 하의`, cx, 40);
    }

    tiles.push(canvas);
  }

  return tiles;
}
