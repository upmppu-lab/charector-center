import { AnchorSettings, GuideDisplaySettings, SlotConfig } from '../types';

export const INITIAL_SLOT_CONFIGS: SlotConfig[] = Array.from({ length: 30 }, (_, i) => {
  const id = i + 1;
  return {
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
});

export const DEFAULT_ANCHOR_SETTINGS: AnchorSettings = {
  faceNoseY: 10,      // Nose anchor Y offset for Face
  hairNoseY: 10,      // Nose anchor Y offset for Hair
  headNoseY: 10,      // Backwards compat
  bodyNeckY: -95,     // Neck joint anchor Y offset
  outfitNeckY: -95,   // Neck joint anchor for Outfit (상의+하의)
  legFootY: 130,      // Foot/Ground anchor Y offset
  neckJointGap: 0,    // Assembly neck adjustment
  waistJointGap: 0,   // Assembly waist adjustment
};

export const DEFAULT_GUIDE_SETTINGS: GuideDisplaySettings = {
  showAnchorCrosshair: true,
  showCenterLine: true,
  centerLineColor: '#00f0ff', // High visibility neon cyan
  centerLineWidth: 2.5,
  centerLineStyle: 'solid',
  showReferenceLines: true,
  showBoxBorder: true,
  showNumbers: true,
  showCutMarks: false,
  cutMarkColor: '#64748b',
  cutMarkStyle: 'dashed',
  cutMarkWidth: 1.5,
  backgroundColor: 'dark',
};

// Outfits & Character metadata for 15 / 30 slots
export const CHARACTER_DESCRIPTIONS = [
  { id: 1, face: '초롱초롱한 눈망울 & 미소', hair: '스트레이트 뱅 단발', top: '블루 후드 집업 & 크림 니트', bottom: '블루 플리츠 스커트 & 브라운 부츠' },
  { id: 2, face: '차분한 블루 눈매 & 온화한 미소', hair: '내추럴 레이어드 단발', top: '크림 카디건 & 블루 리본 타이', bottom: '블랙 플리츠 스커트 & 메리제인' },
  { id: 3, face: '깜찍한 윙크 & 핑크 볼터치', hair: '물결 웨이브 단발', top: '핑크 토끼 후디', bottom: '핑크 체크 플리츠 스커트' },
  { id: 4, face: '도도한 고양이 눈매', hair: '스트레이트 미디엄 단발', top: '화이트 러플 블라우스 & 블랙 리본', bottom: '블랙 티어드 고딕 스커트' },
  { id: 5, face: '발랄한 웃음 & 활기찬 눈', hair: '사이드 양갈래 번 헤어', top: '오프숄더 블랙 니트', bottom: '크림 리본 티어드 스커트' },
  { id: 6, face: '개구쟁이 미소 & 호기심 눈', hair: '레이어드 컷 & 사이드 뱅', top: '화이트 캣 그래픽 반팔티', bottom: '롤업 데님 숏팬츠 & 스니커즈' },
  { id: 7, face: '수줍은 미소 & 반달 눈', hair: '로우 트윈테일 (양갈래)', top: '스트라이프 배색 블랙 롱티', bottom: '블랙 카고 팬츠 & 청키 슈즈' },
  { id: 8, face: '반짝이는 보석 눈빛', hair: '샤기 숏 단발', top: '라이트 블루 러플 오프숄더', bottom: '와이드 라이트 블루 데님' },
  { id: 9, face: '다정한 미소 & 따뜻한 눈', hair: '사이드 브레이드 롱 웨이브', top: '아이보리 러플 오프숄더 탑', bottom: '그레이 토끼 조거 팬츠' },
  { id: 10, face: '신비로운 퍼플 눈매', hair: '탑노트 번 미디엄 단발', top: '블랙 시스루 레이스 고딕 탑', bottom: '베이지 하이웨이스트 롱 스커트' },
  { id: 11, face: '순수한 눈망울 & 살구 볼터치', hair: '풍성한 롱 웨이브', top: '크림 더플 코트 (떡볶이 단추)', bottom: '브라운 체크 플리츠 & 로퍼' },
  { id: 12, face: '자신감 넘치는 눈빛 & 입꼬리', hair: '사이드 하이 포니테일', top: '베이지 트렌치 재킷 & 터틀넥', bottom: '블랙 슬릿 롱 스커트 & 힐' },
  { id: 13, face: '단정한 눈매 & 수줍은 표정', hair: '헤어핀 스트레이트 롱', top: '교복 V넥 니트 베스트 & 타이', bottom: '라이트 블루 언밸런스 러플 스커트' },
  { id: 14, face: '동글동글 귀여운 눈 & 오물 미소', hair: '로우 트윈 번 (경단 머리)', top: '블루 플로럴 뷔스티에 탑', bottom: '화이트 블루 플로럴 롱 스커트' },
  { id: 15, face: '사랑스러운 하트 눈빛 & 미소', hair: '헤어밴드 땋은 머리 & 리본', top: '와인 레드 로리타 드레스 탑', bottom: '와인 레드 티어드 프릴 롱 스커트' },
  { id: 16, face: '시크한 루비 눈매', hair: '울프컷 쇼트 헤어', top: '차콜 크롭 라이더 재킷', bottom: '블랙 와이드 슬랙스 & 워커' },
  { id: 17, face: '상큼한 레몬빛 미소', hair: '하프 트윈테일 펌', top: '옐로우 테니스 카라티', bottom: '화이트 테니스 플리츠' },
  { id: 18, face: '그윽한 에메랄드 눈빛', hair: '우아한 포니테일 & 앞머리', top: '올리브 그린 니트 조끼', bottom: '카키 A라인 롱스커트' },
  { id: 19, face: '청순한 눈망울 & 홍조', hair: '내추럴 롱 스트레이트', top: '파스텔 라벤더 가디건', bottom: '화이트 쉬폰 플리츠 스커트' },
  { id: 20, face: '열정적인 눈빛 & 환한 웃음', hair: '스포티 번 헤어', top: '오렌지 윈드브레이커 점퍼', bottom: '블랙 트랙 팬츠 & 런닝화' },
  { id: 21, face: '새침한 캣츠아이', hair: '보브 뱅 단발', top: '퍼플 벨벳 뷔스티에 탑', bottom: '퍼플 플리츠 미니스커트' },
  { id: 22, face: '맑고 투명한 유리구슬 눈', hair: '히피펌 롱 웨이브', top: '민트 그린 오버핏 맨투맨', bottom: '데님 멜빵 팬츠 & 캔버스화' },
  { id: 23, face: '온화한 브라운 눈매', hair: '단정한 사이드 가르마', top: '브라운 클래식 블레이저', bottom: '베이지 플리츠 치마바지' },
  { id: 24, face: '신비로운 오드아이', hair: '투톤 옴브레 트윈테일', top: '사이버펑크 네온 크롭티', bottom: '네온 스트랩 조거 팬츠' },
  { id: 25, face: '천진난만한 아기 눈빛', hair: '귀여운 삐삐 머리', top: '체리 프린팅 베이비돌 탑', bottom: '레드 체크 미니스커트' },
  { id: 26, face: '고혹적인 버건디 눈빛', hair: '사이드 스윕 웨이브', top: '딥 버건디 오프숄더 드레스', bottom: '머메이드 라인 롱스커트' },
  { id: 27, face: '활발한 아치형 눈매', hair: '숏 레이어드 샤기컷', top: '스카이블루 아노락 후드', bottom: '그레이 스웨트 조거 팬츠' },
  { id: 28, face: '몽환적인 스타더스트 눈', hair: '하늘하늘 페어리 롱', top: '시스루 스타 더스트 블라우스', bottom: '미드나잇 블루 티어드 스커트' },
  { id: 29, face: '당찬 눈빛 & 미소', hair: '깔끔한 하이 번 머리', top: '네이비 세일러 칼라 셔츠', bottom: '화이트 세일러 플리츠 & 양말' },
  { id: 30, face: '영롱한 황금빛 눈매', hair: '로얄 프린세스 롱 컬', top: '골드 자수 벨벳 케이프 탑', bottom: '로열 골드 티어드 볼가운' },
];

// Generates procedural fallback preview tiles for Face, Hair, Body, Leg, Outfit
export function createMockTiles(
  category: 'face' | 'hair' | 'body' | 'leg' | 'outfit',
  count = 15
): HTMLCanvasElement[] {
  const tiles: HTMLCanvasElement[] = [];
  const tileW = 400;
  const tileH = 400;

  const hairHues = [
    '#935133', '#c084fc', '#f472b6', '#38bdf8', '#fb923c',
    '#a78bfa', '#4ade80', '#fb7185', '#60a5fa', '#facc15',
    '#94a3b8', '#e879f9', '#2dd4bf', '#818cf8', '#5b3924',
  ];

  const eyeHues = [
    '#5a3318', '#7c3aed', '#ec4899', '#0284c7', '#d97706',
    '#6366f1', '#059669', '#e11d48', '#2563eb', '#ca8a04',
    '#475569', '#c026d3', '#0d9488', '#4338ca', '#3f2214',
  ];

  const topColors = [
    '#0284c7', '#3b82f6', '#ec4899', '#1e293b', '#6366f1',
    '#10b981', '#0f172a', '#38bdf8', '#d97706', '#831843',
    '#ca8a04', '#059669', '#4f46e5', '#0891b2', '#991b1b',
  ];

  const bottomColors = [
    '#1d4ed8', '#0f172a', '#db2777', '#18181b', '#4338ca',
    '#047857', '#09090b', '#0284c7', '#b45309', '#500724',
    '#854d0e', '#065f46', '#3730a3', '#155e75', '#7f1d1d',
  ];

  for (let i = 0; i < count; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = tileW;
    canvas.height = tileH;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    const cx = tileW / 2;
    const cy = tileH / 2;
    const noseX = cx;
    const noseY = cy + 10;
    const faceCenterY = cy - 5;

    if (category === 'face') {
      // 1. FACE (얼굴형, 눈, 코, 입, 볼터치 - 기본 베이스)
      // Neck stub
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(cx - 16, cy + 45, 32, 45);

      // Ears
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(cx - 78, faceCenterY + 2, 14, 0, Math.PI * 2);
      ctx.arc(cx + 78, faceCenterY + 2, 14, 0, Math.PI * 2);
      ctx.fill();

      // Face head shape (매끄러운 애니 캐릭터 얼굴형)
      ctx.beginPath();
      ctx.ellipse(cx, faceCenterY, 78, 68, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ffedd5';
      ctx.fill();

      // Cheeks (볼터치)
      ctx.fillStyle = 'rgba(251, 113, 133, 0.45)';
      ctx.beginPath();
      ctx.arc(cx - 44, cy + 8, 14, 0, Math.PI * 2);
      ctx.arc(cx + 44, cy + 8, 14, 0, Math.PI * 2);
      ctx.fill();

      // Eyebrows
      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 48, cy - 28);
      ctx.quadraticCurveTo(cx - 32, cy - 34, cx - 16, cy - 30);
      ctx.moveTo(cx + 16, cy - 30);
      ctx.quadraticCurveTo(cx + 32, cy - 34, cx + 48, cy - 28);
      ctx.stroke();

      // Eyes (Anime chibi eyes with 15 variations)
      const eyeY = cy - 8;
      const eyeColor = eyeHues[i % eyeHues.length];

      if (i % 5 === 2) {
        // Wink expression (한쪽 윙크, 한쪽 큰 눈)
        // Left eye open
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.ellipse(cx - 32, eyeY, 15, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.arc(cx - 32, eyeY + 4, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx - 36, eyeY - 5, 5, 0, Math.PI * 2);
        ctx.arc(cx - 28, eyeY + 6, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Right eye wink arc
        ctx.strokeStyle = '#1e1b4b';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(cx + 32, eyeY + 2, 14, Math.PI + 0.3, Math.PI * 2 - 0.3);
        ctx.stroke();
      } else if (i % 5 === 4) {
        // Smiling closed crescent eyes (행복한 반달눈)
        ctx.strokeStyle = '#1e1b4b';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(cx - 32, eyeY + 2, 14, Math.PI + 0.3, Math.PI * 2 - 0.3);
        ctx.moveTo(cx + 46, eyeY + 2);
        ctx.arc(cx + 32, eyeY + 2, 14, Math.PI + 0.3, Math.PI * 2 - 0.3);
        ctx.stroke();
      } else {
        // Big sparkling eyes
        [-32, 32].forEach((xOff) => {
          ctx.fillStyle = '#1e1b4b';
          ctx.beginPath();
          ctx.ellipse(cx + xOff, eyeY, 15, 22, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = eyeColor;
          ctx.beginPath();
          ctx.arc(cx + xOff, eyeY + 4, 10, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(cx + xOff - 4, eyeY - 5, 5, 0, Math.PI * 2);
          ctx.arc(cx + xOff + 4, eyeY + 6, 2.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // NOSE (코 중심 앵커)
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(noseX, noseY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Cute Smile mouth
      ctx.strokeStyle = '#be123c';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      if (i % 3 === 0) {
        // Open joyful smile
        ctx.arc(cx, cy + 26, 8, 0, Math.PI);
        ctx.fillStyle = '#f43f5e';
        ctx.fill();
        ctx.stroke();
      } else {
        // Gentle smile curve
        ctx.arc(cx, cy + 28, 6, 0.15, Math.PI - 0.15);
        ctx.stroke();
      }

    } else if (category === 'hair') {
      // 2. HAIR (헤어 - 얼굴 위에 씌워지는 앞머리, 뒷머리, 다양한 헤어스타일 & 액세서리)
      const hairColor = hairHues[i % hairHues.length];

      // Hair back layer
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.arc(cx, faceCenterY - 15, 95, 0, Math.PI * 2);
      ctx.fill();

      // Hairstyle variations (twintails, buns, waves, side tails)
      if (i % 4 === 1) {
        // Twintails
        ctx.beginPath();
        ctx.arc(cx - 95, faceCenterY - 35, 34, 0, Math.PI * 2);
        ctx.arc(cx + 95, faceCenterY - 35, 34, 0, Math.PI * 2);
        ctx.fill();
      } else if (i % 4 === 2) {
        // Side bun
        ctx.beginPath();
        ctx.ellipse(cx + 90, faceCenterY - 25, 40, 65, 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (i % 4 === 3) {
        // Long wavy sides
        ctx.beginPath();
        ctx.ellipse(cx - 85, faceCenterY + 40, 25, 80, -0.15, 0, Math.PI * 2);
        ctx.ellipse(cx + 85, faceCenterY + 40, 25, 80, 0.15, 0, Math.PI * 2);
        ctx.fill();
      }

      // Cutout face opening so the face layer beneath remains visible
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.ellipse(cx, faceCenterY + 8, 70, 56, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Front Bangs & Side locks (얼굴 앞으로 흘러내리는 앞머리와 옆머리)
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.moveTo(cx - 88, faceCenterY - 35);
      ctx.quadraticCurveTo(cx - 40, faceCenterY - 65, cx, faceCenterY - 65);
      ctx.quadraticCurveTo(cx + 40, faceCenterY - 65, cx + 88, faceCenterY - 35);
      ctx.lineTo(cx + 78, faceCenterY - 8);
      ctx.quadraticCurveTo(cx + 40, faceCenterY - 22, cx + 15, faceCenterY - 12);
      ctx.quadraticCurveTo(cx, faceCenterY - 18, cx - 15, faceCenterY - 12);
      ctx.quadraticCurveTo(cx - 40, faceCenterY - 22, cx - 78, faceCenterY - 8);
      ctx.closePath();
      ctx.fill();

      // Side strands framing cheeks
      ctx.beginPath();
      ctx.moveTo(cx - 78, faceCenterY - 15);
      ctx.quadraticCurveTo(cx - 82, faceCenterY + 25, cx - 68, faceCenterY + 45);
      ctx.quadraticCurveTo(cx - 72, faceCenterY + 15, cx - 64, faceCenterY - 8);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx + 78, faceCenterY - 15);
      ctx.quadraticCurveTo(cx + 82, faceCenterY + 25, cx + 68, faceCenterY + 45);
      ctx.quadraticCurveTo(cx + 72, faceCenterY + 15, cx + 64, faceCenterY - 8);
      ctx.closePath();
      ctx.fill();

      // Hair Accessories (머리핀, 리본, 머리띠)
      if (i % 2 === 0) {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(cx - 55, faceCenterY - 45, 9, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(cx + 55, faceCenterY - 45, 8, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (category === 'body') {
      // 3. BODY / TOP (상의 - 목끝 결합 기준)
      const color = topColors[i % topColors.length];
      const neckY = cy - 95;

      // Neck collar / opening at anchor
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.ellipse(cx, neckY + 15, 20, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Shoulders & Torso
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx - 24, neckY + 18);
      ctx.lineTo(cx - 75, neckY + 55); // left shoulder
      ctx.lineTo(cx - 65, neckY + 160); // left waist
      ctx.lineTo(cx + 65, neckY + 160); // right waist
      ctx.lineTo(cx + 75, neckY + 55);  // right shoulder
      ctx.lineTo(cx + 24, neckY + 18);
      ctx.closePath();
      ctx.fill();

      // Sleeves & Arms
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(cx - 95, neckY + 55, 30, 85, 12);
      ctx.roundRect(cx + 65, neckY + 55, 30, 85, 12);
      ctx.fill();

      // Hands
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(cx - 80, neckY + 148, 12, 0, Math.PI * 2);
      ctx.arc(cx + 80, neckY + 148, 12, 0, Math.PI * 2);
      ctx.fill();

      // Collar / Tie / Details
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(cx - 20, neckY + 18);
      ctx.lineTo(cx, neckY + 45);
      ctx.lineTo(cx + 20, neckY + 18);
      ctx.closePath();
      ctx.fill();

      // Neck Tie / Bow
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.arc(cx, neckY + 42, 6, 0, Math.PI * 2);
      ctx.fill();

    } else if (category === 'leg') {
      // 4. LEG / BOTTOM (하의 - 발끝/바닥선 기준)
      const color = bottomColors[i % bottomColors.length];
      const footY = cy + 130;
      const waistY = cy - 85;

      // Skirt / Pants
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx - 52, waistY);
      ctx.lineTo(cx - 78, waistY + 68);
      ctx.lineTo(cx + 78, waistY + 68);
      ctx.lineTo(cx + 52, waistY);
      ctx.closePath();
      ctx.fill();

      // Skirt pleats / texture
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.5;
      [-40, -20, 0, 20, 40].forEach((xOff) => {
        ctx.beginPath();
        ctx.moveTo(cx + xOff * 0.7, waistY + 5);
        ctx.lineTo(cx + xOff * 1.3, waistY + 65);
        ctx.stroke();
      });

      // Legs
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.roundRect(cx - 34, waistY + 60, 24, 115, 8);
      ctx.roundRect(cx + 10, waistY + 60, 24, 115, 8);
      ctx.fill();

      // Socks
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(cx - 35, footY - 45, 26, 32, 4);
      ctx.roundRect(cx + 9, footY - 45, 26, 32, 4);
      ctx.fill();

      // Shoes / Boots touching foot ground anchor
      ctx.fillStyle = '#3f1a0e';
      ctx.beginPath();
      ctx.ellipse(cx - 24, footY - 4, 18, 10, -0.1, 0, Math.PI * 2);
      ctx.ellipse(cx + 24, footY - 4, 18, 10, 0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.roundRect(cx - 40, footY - 2, 32, 6, 2);
      ctx.roundRect(cx + 8, footY - 2, 32, 6, 2);
      ctx.fill();
    } else if (category === 'outfit') {
      // 5. OUTFIT / FULL COSTUME (상의+하의 일체형 의상 30종)
      const topColor = topColors[i % topColors.length];
      const bottomColor = bottomColors[i % bottomColors.length];
      const neckY = cy - 95; // 목끝 기준점
      const waistY = cy + 10; // 허리선
      const footY = cy + 130; // 발끝 기준선

      // --- Lower Body (하의 부분) ---
      // Skirt / Pants
      ctx.fillStyle = bottomColor;
      ctx.beginPath();
      ctx.moveTo(cx - 50, waistY);
      ctx.lineTo(cx - 74, waistY + 62);
      ctx.lineTo(cx + 74, waistY + 62);
      ctx.lineTo(cx + 50, waistY);
      ctx.closePath();
      ctx.fill();

      // Skirt pleats
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.5;
      [-36, -18, 0, 18, 36].forEach((xOff) => {
        ctx.beginPath();
        ctx.moveTo(cx + xOff * 0.7, waistY + 4);
        ctx.lineTo(cx + xOff * 1.3, waistY + 58);
        ctx.stroke();
      });

      // Legs
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.roundRect(cx - 32, waistY + 55, 22, 65, 6);
      ctx.roundRect(cx + 10, waistY + 55, 22, 65, 6);
      ctx.fill();

      // Socks
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(cx - 33, footY - 35, 24, 25, 4);
      ctx.roundRect(cx + 9, footY - 35, 24, 25, 4);
      ctx.fill();

      // Shoes
      ctx.fillStyle = '#3f1a0e';
      ctx.beginPath();
      ctx.ellipse(cx - 22, footY - 4, 16, 9, -0.1, 0, Math.PI * 2);
      ctx.ellipse(cx + 22, footY - 4, 16, 9, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // --- Upper Body (상의 부분) ---
      // Sleeves
      ctx.fillStyle = topColor;
      ctx.beginPath();
      ctx.roundRect(cx - 78, neckY + 22, 34, 75, 12);
      ctx.roundRect(cx + 44, neckY + 22, 34, 75, 12);
      ctx.fill();

      // Torso / Jacket / Knit
      ctx.fillStyle = topColor;
      ctx.beginPath();
      ctx.moveTo(cx - 52, neckY + 18);
      ctx.lineTo(cx - 48, waistY + 4);
      ctx.lineTo(cx + 48, waistY + 4);
      ctx.lineTo(cx + 52, neckY + 18);
      ctx.closePath();
      ctx.fill();

      // Collar
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(cx - 20, neckY + 18);
      ctx.lineTo(cx, neckY + 42);
      ctx.lineTo(cx + 20, neckY + 18);
      ctx.closePath();
      ctx.fill();

      // Ribbon / Necktie
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.arc(cx, neckY + 38, 5, 0, Math.PI * 2);
      ctx.fill();

      // Belt / Waistband detail
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - 48, waistY - 2, 96, 6);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(cx - 6, waistY - 4, 12, 10);
    }

    tiles.push(canvas);
  }

  return tiles;
}
