const SIZE = 2048;
const photoInput = document.getElementById('photoInput');
const nameInput = document.getElementById('nameInput');
const commitmentInput = document.getElementById('commitmentInput');
const sigCanvas = document.getElementById('signatureCanvas');
const sigCtx = sigCanvas.getContext('2d');
const preview = document.getElementById('previewCanvas');
const pctx = preview.getContext('2d');
const status = document.getElementById('status');
const charCount = document.getElementById('charCount');

const frame = new Image();
frame.src = 'twibbon.png';
let photo = null;
let drawing = false;
let signatureHasInk = false;

sigCtx.lineWidth = 5;
sigCtx.lineCap = 'round';
sigCtx.lineJoin = 'round';
sigCtx.strokeStyle = '#102044';

function pointFromEvent(event) {
  const rect = sigCanvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * sigCanvas.width / rect.width,
    y: (event.clientY - rect.top) * sigCanvas.height / rect.height
  };
}
sigCanvas.addEventListener('pointerdown', e => {
  drawing = true; sigCanvas.setPointerCapture(e.pointerId);
  const p = pointFromEvent(e); sigCtx.beginPath(); sigCtx.moveTo(p.x, p.y);
});
sigCanvas.addEventListener('pointermove', e => {
  if (!drawing) return;
  const p = pointFromEvent(e); sigCtx.lineTo(p.x, p.y); sigCtx.stroke(); signatureHasInk = true;
});
function stopDrawing() { drawing = false; }
sigCanvas.addEventListener('pointerup', stopDrawing);
sigCanvas.addEventListener('pointercancel', stopDrawing);
document.getElementById('clearSignature').addEventListener('click', () => {
  sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height); signatureHasInk = false; render();
});

photoInput.addEventListener('change', () => {
  const file = photoInput.files && photoInput.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { status.textContent = 'Pilih file gambar yang valid.'; return; }
  const reader = new FileReader();
  reader.onload = () => {
    photo = new Image();
    photo.onload = () => { status.textContent = ''; render(); };
    photo.onerror = () => { status.textContent = 'Foto tidak dapat dibaca. Coba file gambar lain.'; };
    photo.src = reader.result;
  };
  reader.readAsDataURL(file);
});
nameInput.addEventListener('input', render);
commitmentInput.addEventListener('input', () => { charCount.textContent = commitmentInput.value.length; render(); });

function drawCoverCircle(ctx, img, cx, cy, radius) {
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.clip();
  ctx.drawImage(img, sx, sy, side, side, cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.restore();
}
function wrapText(ctx, text, maxWidth) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? line + ' ' + word : word;
    if (ctx.measureText(candidate).width > maxWidth && line) { lines.push(line); line = word; }
    else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}
function renderAt(ctx, scale) {
  ctx.clearRect(0, 0, SIZE, SIZE);
  if (frame.complete && frame.naturalWidth) ctx.drawImage(frame, 0, 0, SIZE, SIZE);
  // User portrait is clipped to the open center of the circular frame.
  if (photo) drawCoverCircle(ctx, photo, 1024, 925, 485);

  // Place commitment text into the two printed commitment columns.
  const commitment = commitmentInput.value.trim();
  if (commitment) {
    ctx.save();
    ctx.fillStyle = '#111111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 31px Arial';
    const lines = wrapText(ctx, commitment, 365);
    const leftLines = Math.ceil(lines.length / 2);
    const columns = [
      { x: 225, y: 765, lines: lines.slice(0, leftLines) },
      { x: 1823, y: 765, lines: lines.slice(leftLines) }
    ];
    for (const col of columns) {
      let y = col.y - (col.lines.length - 1) * 42 / 2;
      for (const line of col.lines) { ctx.fillText(line, col.x, y, 390); y += 42; }
    }
    ctx.restore();
  }

  // Name is rendered within the white signature box, above the handwritten mark.
  const name = nameInput.value.trim();
  if (name) {
    ctx.save();
    ctx.fillStyle = '#102044';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 42px Arial';
    ctx.fillText(name, 1024, 1570, 850);
    ctx.restore();
  }
  if (signatureHasInk) {
    ctx.drawImage(sigCanvas, 700, 1595, 650, 205);
  }
}
function render() {
  const off = document.createElement('canvas'); off.width = SIZE; off.height = SIZE;
  const ctx = off.getContext('2d');
  renderAt(ctx, 1);
  pctx.clearRect(0, 0, preview.width, preview.height);
  pctx.drawImage(off, 0, 0, preview.width, preview.height);
}
document.getElementById('downloadBtn').addEventListener('click', () => {
  if (!frame.complete || !frame.naturalWidth) { status.textContent = 'Desain Twibbon sedang dimuat. Coba lagi sebentar.'; return; }
  if (!photo) { status.textContent = 'Silakan unggah foto terlebih dahulu.'; return; }
  status.textContent = '';
  const out = document.createElement('canvas'); out.width = SIZE; out.height = SIZE;
  renderAt(out.getContext('2d'), 1);
  out.toBlob(blob => {
    if (!blob) { status.textContent = 'Gagal membuat PNG. Coba lagi.'; return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'safety-commitment-twibbon.png';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }, 'image/png');
});
frame.onload = render;
frame.onerror = () => { status.textContent = 'File twibbon.png tidak ditemukan.'; };
render();
