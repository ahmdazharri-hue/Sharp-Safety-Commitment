'use strict';

// Artwork asli 2048 x 2048. Semua koordinat di bawah menggunakan satuan piksel artwork.
const DESIGN_W = 2048;
const DESIGN_H = 2048;

// Pusat dan radius diukur dari lingkaran hijau pada PNG original.
const PHOTO = Object.freeze({ x: 1023.5, y: 936.6, radius: 556.5 });

// Area teks berada di ruang antara garis putus-putus pertama dan kedua.
const COMMITMENT = Object.freeze({
  left:  { x: 28, y: 790, width: 382, height: 128 },
  right: { x: 1638, y: 790, width: 382, height: 128 }
});

// Kotak putih tanda tangan pada artwork original.
const SIGNATURE_BOX = Object.freeze({
  x: 718, y: 1520, width: 612, height: 228,
  nameY: 1574,
  signature: { x: 760, y: 1630, width: 528, height: 92 }
});

const photoInput = document.getElementById('photoInput');
const nameInput = document.getElementById('nameInput');
const commitment1 = document.getElementById('commitment1');
const commitment2 = document.getElementById('commitment2');
const signatureCanvas = document.getElementById('signatureCanvas');
const signatureCtx = signatureCanvas.getContext('2d');
const previewCanvas = document.getElementById('previewCanvas');
const previewCtx = previewCanvas.getContext('2d');
const statusEl = document.getElementById('status');

const overlay = new Image();
overlay.src = 'twibbon-overlay.png';

let userPhoto = null;
let isDrawing = false;
let hasSignature = false;

signatureCtx.strokeStyle = '#102044';
signatureCtx.lineWidth = 8;
signatureCtx.lineCap = 'round';
signatureCtx.lineJoin = 'round';

function setStatus(message, isError = true) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#a12b2b' : '#16784a';
}

function eventPoint(event) {
  const rect = signatureCanvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * signatureCanvas.width / rect.width,
    y: (event.clientY - rect.top) * signatureCanvas.height / rect.height
  };
}

signatureCanvas.addEventListener('pointerdown', event => {
  event.preventDefault();
  isDrawing = true;
  signatureCanvas.setPointerCapture(event.pointerId);
  const point = eventPoint(event);
  signatureCtx.beginPath();
  signatureCtx.moveTo(point.x, point.y);
  signatureCtx.lineTo(point.x + 0.1, point.y + 0.1);
  signatureCtx.stroke();
  hasSignature = true;
  render();
});

signatureCanvas.addEventListener('pointermove', event => {
  if (!isDrawing) return;
  event.preventDefault();
  const point = eventPoint(event);
  signatureCtx.lineTo(point.x, point.y);
  signatureCtx.stroke();
  render();
});

function finishStroke() {
  if (!isDrawing) return;
  isDrawing = false;
  signatureCtx.closePath();
  render();
}
signatureCanvas.addEventListener('pointerup', finishStroke);
signatureCanvas.addEventListener('pointercancel', finishStroke);
signatureCanvas.addEventListener('lostpointercapture', finishStroke);

document.getElementById('clearSignature').addEventListener('click', () => {
  signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
  hasSignature = false;
  render();
});

photoInput.addEventListener('change', () => {
  const file = photoInput.files && photoInput.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    setStatus('Silakan pilih file gambar yang valid.');
    return;
  }
  const reader = new FileReader();
  reader.onerror = () => setStatus('File foto tidak dapat dibaca.');
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => setStatus('Format foto tidak dapat dibuka browser.');
    image.onload = () => {
      userPhoto = image;
      setStatus('Foto berhasil dimuat.', false);
      render();
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});

function drawPhoto(ctx) {
  if (!userPhoto) return;
  const diameter = PHOTO.radius * 2;
  const scale = Math.max(diameter / userPhoto.width, diameter / userPhoto.height);
  const sourceWidth = diameter / scale;
  const sourceHeight = diameter / scale;
  const sourceX = (userPhoto.width - sourceWidth) / 2;
  const sourceY = (userPhoto.height - sourceHeight) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(PHOTO.x, PHOTO.y, PHOTO.radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(
    userPhoto,
    sourceX, sourceY, sourceWidth, sourceHeight,
    PHOTO.x - PHOTO.radius, PHOTO.y - PHOTO.radius, diameter, diameter
  );
  ctx.restore();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? line + ' ' + word : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawCommitment(ctx, value, side) {
  const text = value.trim();
  if (!text) return;
  const area = COMMITMENT[side];
  let fontSize = 38;
  let lines = [];

  // Font diperkecil sampai kalimat muat di ruang tanpa menghapus garis artwork.
  for (; fontSize >= 20; fontSize -= 1) {
    ctx.font = `700 ${fontSize}px Arial, Helvetica, sans-serif`;
    lines = wrapText(ctx, text, area.width - 18);
    if (lines.length <= 3 && lines.every(line => ctx.measureText(line).width <= area.width - 18)) break;
  }

  ctx.save();
  ctx.font = `700 ${fontSize}px Arial, Helvetica, sans-serif`;
  ctx.fillStyle = '#111111';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lineHeight = fontSize * 1.18;
  const blockHeight = lines.length * lineHeight;
  const firstY = area.y + (area.height - blockHeight) / 2 + lineHeight / 2;
  lines.forEach((line, index) => {
    ctx.fillText(line, area.x + area.width / 2, firstY + index * lineHeight, area.width - 18);
  });
  ctx.restore();
}

function signatureBounds() {
  const pixels = signatureCtx.getImageData(0, 0, signatureCanvas.width, signatureCanvas.height).data;
  let minX = signatureCanvas.width, minY = signatureCanvas.height;
  let maxX = -1, maxY = -1;
  for (let y = 0; y < signatureCanvas.height; y += 1) {
    for (let x = 0; x < signatureCanvas.width; x += 1) {
      if (pixels[(y * signatureCanvas.width + x) * 4 + 3] > 0) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < 0) return null;
  const padding = 5;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(signatureCanvas.width - 1, maxX + padding);
  maxY = Math.min(signatureCanvas.height - 1, maxY + padding);
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function drawNameAndSignature(ctx) {
  ctx.save();
  // Clip ke kotak putih yang sudah ada pada artwork original; tidak dibuat background baru.
  ctx.beginPath();
  ctx.roundRect(SIGNATURE_BOX.x, SIGNATURE_BOX.y, SIGNATURE_BOX.width, SIGNATURE_BOX.height, 116);
  ctx.clip();

  const name = nameInput.value.trim();
  if (name) {
    let fontSize = 42;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#102044';
    do {
      ctx.font = `700 ${fontSize}px Arial, Helvetica, sans-serif`;
      if (ctx.measureText(name).width <= SIGNATURE_BOX.width - 54) break;
      fontSize -= 1;
    } while (fontSize > 23);
    ctx.fillText(name, SIGNATURE_BOX.x + SIGNATURE_BOX.width / 2, SIGNATURE_BOX.nameY);
  }

  if (hasSignature) {
    const bounds = signatureBounds();
    if (bounds) {
      const target = SIGNATURE_BOX.signature;
      const scale = Math.min(target.width / bounds.width, target.height / bounds.height);
      const width = bounds.width * scale;
      const height = bounds.height * scale;
      const x = target.x + (target.width - width) / 2;
      const y = target.y + (target.height - height) / 2;
      ctx.drawImage(
        signatureCanvas,
        bounds.x, bounds.y, bounds.width, bounds.height,
        x, y, width, height
      );
    }
  }
  ctx.restore();
}

function renderTo(ctx) {
  ctx.clearRect(0, 0, DESIGN_W, DESIGN_H);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);
  drawPhoto(ctx);                         // 1. Foto di belakang seluruh artwork.
  ctx.drawImage(overlay, 0, 0, DESIGN_W, DESIGN_H); // 2. Artwork original dengan aperture transparan.
  drawCommitment(ctx, commitment1.value, 'left');   // 3. Komitmen di ruang sisi kiri.
  drawCommitment(ctx, commitment2.value, 'right');  // 4. Komitmen di ruang sisi kanan.
  drawNameAndSignature(ctx);                         // 5. Nama dan tanda tangan di kotak putih.
}

function render() {
  if (!overlay.complete || !overlay.naturalWidth) return;
  renderTo(previewCtx);
}

[nameInput, commitment1, commitment2].forEach(element => {
  element.addEventListener('input', () => {
    if (element === commitment1) document.getElementById('count1').textContent = element.value.length;
    if (element === commitment2) document.getElementById('count2').textContent = element.value.length;
    render();
  });
});

overlay.onload = () => {
  render();
  setStatus('Desain siap digunakan.', false);
};
overlay.onerror = () => setStatus('twibbon-overlay.png tidak ditemukan. Pastikan semua file berada di root repository.');

document.getElementById('downloadBtn').addEventListener('click', () => {
  if (!overlay.complete || !overlay.naturalWidth) {
    setStatus('Desain belum selesai dimuat. Silakan tunggu sebentar.');
    return;
  }
  if (!userPhoto) {
    setStatus('Silakan unggah foto terlebih dahulu.');
    return;
  }
  const output = document.createElement('canvas');
  output.width = DESIGN_W;
  output.height = DESIGN_H;
  renderTo(output.getContext('2d'));
  output.toBlob(blob => {
    if (!blob) {
      setStatus('PNG gagal dibuat. Silakan coba kembali.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'safety-commitment-twibbon.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    setStatus('Twibbon berhasil dibuat dalam resolusi 2048 × 2048 px.', false);
  }, 'image/png');
});

render();
