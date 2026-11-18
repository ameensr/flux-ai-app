export interface ReportHeroScreenData {
  projectName?: string;
  reportTitle?: string;
  subtitle?: string;
  weekStart?: string;
  weekEnd?: string;
  reportStatus?: string;
  supportEmails?: number;
  newFeatures?: number;
  codeFixes?: number;
  qualityScore?: number;
  qualityLabel?: string;
}

function formatDate(value?: string) {
  if (!value) return '';
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function drawReportHeroScreen(canvas: HTMLCanvasElement, data: ReportHeroScreenData, isDark: boolean) {
  canvas.width = 1400;
  canvas.height = 500;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const bg = ctx.createLinearGradient(0, 0, 1400, 500);
  bg.addColorStop(0, isDark ? '#0a0e1e' : '#eef2fa');
  bg.addColorStop(1, isDark ? '#18203e' : '#dfe7f4');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1400, 500);
  const glow = ctx.createRadialGradient(450, 60, 10, 450, 60, 540);
  glow.addColorStop(0, 'rgba(212,175,55,.22)');
  glow.addColorStop(1, 'rgba(212,175,55,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1400, 500);
  const blueGlow = ctx.createRadialGradient(1200, 390, 5, 1200, 390, 380);
  blueGlow.addColorStop(0, 'rgba(77,109,229,.2)');
  blueGlow.addColorStop(1, 'rgba(77,109,229,0)');
  ctx.fillStyle = blueGlow;
  ctx.fillRect(0, 0, 1400, 500);

  const text = isDark ? '#f8fafc' : '#14203a';
  const muted = isDark ? '#aeb8ce' : '#53647d';
  const gold = '#d4af37';
  const rounded = (x: number, y: number, w: number, h: number, radius = 18) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
  };
  const label = [formatDate(data.weekStart), formatDate(data.weekEnd)].filter(Boolean).join('  —  ');
  rounded(66, 38, Math.max(300, Math.min(600, label.length * 17 + 90)), 44, 15);
  ctx.fillStyle = isDark ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.8)';
  ctx.fill();
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,.15)' : 'rgba(80,99,145,.2)';
  ctx.stroke();
  ctx.fillStyle = gold;
  ctx.font = 'bold 21px Arial';
  ctx.fillText(label || 'EXECUTIVE QA REPORT', 86, 68);
  if (data.reportStatus) {
    ctx.textAlign = 'right';
    ctx.fillText(data.reportStatus.toUpperCase(), 1335, 67);
    ctx.textAlign = 'left';
  }

  ctx.fillStyle = gold;
  ctx.font = 'bold 23px Arial';
  ctx.fillText((data.projectName || 'EXECUTIVE BRIEFING').toUpperCase().slice(0, 44), 68, 137);
  ctx.fillStyle = text;
  ctx.font = 'bold 76px Arial';
  const title = data.reportTitle || 'Weekly Status Report';
  const words = title.split(/\s+/);
  let line = '';
  let y = 223;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > 930 && line) {
      ctx.fillText(line, 68, y);
      line = word;
      y += 79;
    } else line = next;
  }
  ctx.fillText(line, 68, y);
  if (data.subtitle) {
    ctx.fillStyle = muted;
    ctx.font = '23px Arial';
    const subtitle = data.subtitle.length > 92 ? `${data.subtitle.slice(0, 89)}…` : data.subtitle;
    ctx.fillText(subtitle, 70, Math.min(320, y + 53));
  }

  const cards = [
    { x: 68, value: data.supportEmails, name: 'SUPPORT EMAILS', accent: '#62b4f8' },
    { x: 388, value: data.newFeatures, name: 'NEW RELEASE FEATURES', accent: '#e7bb55' },
    { x: 708, value: data.codeFixes, name: 'SUPPORT FIX TESTING', accent: '#b79af8' },
  ];
  for (const card of cards) {
    rounded(card.x, 352, 294, 115, 19);
    ctx.fillStyle = isDark ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.75)';
    ctx.fill();
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,.14)' : 'rgba(80,99,145,.15)';
    ctx.stroke();
    ctx.fillStyle = card.accent;
    ctx.fillRect(card.x + 20, 370, 50, 3);
    ctx.font = 'bold 50px Arial';
    ctx.fillText(String(card.value ?? 0), card.x + 20, 430);
    ctx.fillStyle = muted;
    ctx.font = 'bold 16px Arial';
    ctx.fillText(card.name, card.x + 20, 452);
  }
  if (data.qualityScore !== undefined) {
    rounded(1030, 150, 300, 317, 22);
    ctx.fillStyle = isDark ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.73)';
    ctx.fill();
    ctx.strokeStyle = isDark ? 'rgba(212,175,55,.3)' : 'rgba(176,139,34,.3)';
    ctx.stroke();
    ctx.fillStyle = muted;
    ctx.font = 'bold 17px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('EXECUTIVE QUALITY SCORE', 1180, 192);
    ctx.beginPath();
    ctx.arc(1180, 313, 83, -Math.PI / 2, 1.5 * Math.PI);
    ctx.strokeStyle = isDark ? '#394354' : '#c7d0dc';
    ctx.lineWidth = 13;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(1180, 313, 83, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(100, data.qualityScore)) / 100);
    ctx.strokeStyle = gold;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.fillStyle = text;
    ctx.font = 'bold 68px Arial';
    ctx.fillText(String(Math.round(data.qualityScore)), 1180, 328);
    ctx.fillStyle = gold;
    ctx.font = 'bold 18px Arial';
    ctx.fillText((data.qualityLabel || 'QUALITY').toUpperCase().slice(0, 24), 1180, 436);
    ctx.textAlign = 'left';
  }
}
