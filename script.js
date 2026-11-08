// Revised Safety Commitment Twibbon generator
// Photo, commitment and signature positions are calibrated for the supplied 2048x2048 design.

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

// Photo framing: fit inside the inner green ring.
// Photo is cropped as a circle; adjust the center/radius here if the design is edited.
const PHOTO = { cx: 1024, cy: 925, radius: 548 };

// White signature panel inside the navy signature area.
const SIGNATURE_BOX = { x: 720, y: 1525, w: 610, h: 210 };

// Two commitment writing columns, positioned within the dashed writing guides.
const COMMITMENT = {
  left:  { x: 225, yTop: 690, yBottom: 1280, width: 365 },
  right: { x: 1823, yTop: 690, yBottom: 1280, width: 365 },
  maxFont: 30,
  minFont: 20,
  lineGap: 44
};

sigCtx.lineWidth = 5;
sigCtx.lineCap = 'round';
sigCtx.lineJoin = 'round';
sigCtx.strokeStyle = '#102044';

function pointerPoint(event) {
  const rect = sigCanvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * sigCanvas.width / rect.width,
    y: (event.clientY - rect.top) * sigCanvas.height / rect.height
  };
}
sigCanvas.addEventListener('pointerdown', event => {
  drawing = true;
  sigCanvas.setPointerCapture(event.pointerId);
  const p = pointerPoint(event);
  sigCtx.beginPath();
  sigCtx.moveTo(p.x, p.y);
});
sigCanvas.addEventListener('pointermove', event => {
  if (!drawing) return;
  const p = pointerPoint(event);
  sigCtx.lineTo(p.x, p.y);
  sigCtx.stroke();
  signatureHasInk = true;
});
function endStroke() { drawing = false; }
sigCanvas.addEventListener('pointerup', endStroke);
sigCanvas.addEventListener('pointercancel', endStroke);

document.getElementById('clearSignature').addEventListener('click', () => {
  sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
  signatureHasInk = false;
  render();
});

photoInput.addEventListener('change', () => {
  const file = photoInput.files && photoInput.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    status.textContent = 'Pilih file gambar yang valid.';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    photo = new Image();
    photo.onload = () => {
      status.textContent = '';
      render();
    };
    photo.onerror = () => { status.textContent = 'Foto tidak dapat dibaca. Coba file gambar lain.'; };
    photo.src = reader.result;
  };
  reader.readAsDataURL(file);
});

nameInput.addEventListener('input', render);
commitmentInput.addEventListener('input', () => {
  charCount.textContent = commitmentInput.value.length;
  render();
});

function drawCircularCover(ctx, image, cx, cy, radius) {
  // Crop the source to a square centered on the image, then cover the circular viewport.
  const side = Math.min(image.width, image.height);
  const sx = (image.width - side) / 2;
  const sy = (image.height - side) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(image, sx, sy, side, side, cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.restore();
}

function splitWords(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}
function wrapWords(ctx, words, maxWidth) {
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}
function distributeLines(lines) {
  // Divide text as evenly as possible between the two printed columns.
  const midpoint = Math.ceil(lines.length / 2);
  return [lines.slice(0, midpoint), lines.slice(midpoint)];
}
function drawCommitment(ctx, text) {
  if (!text.trim()) return;

  const allWords = splitWords(text);
  const leftColumn = COMMITMENT.left;
  const rightColumn = COMMITMENT.right;

  // Determine a font size that keeps each column within its allotted writing area.
  let chosenFont = COMMITMENT.maxFont;
  let columns = [[], []];

  for (let font = COMMITMENT.maxFont; font >= COMMITMENT.minFont; font -= 1) {
    ctx.font = `bold ${font}px Arial`;
    const wrapped = wrapWords(ctx, allWords, Math.min(leftColumn.width, rightColumn.width));
    const split = distributeLines(wrapped);
    const maxLines = Math.max(split[0].length, split[1].length);
    if (maxLines * COMMITMENT.lineGap <= (leftColumn.yBottom - leftColumn.yTop)) {
      chosenFont = font;
      columns = split;
      break;
    }
  }

  ctx.save();
  ctx.fillStyle = '#111111';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${chosenFont}px Arial`;

  [
    { spec: leftColumn, lines: columns[0] },
    { spec: rightColumn, lines: columns[1] }
  ].forEach(({ spec, lines }) => {
    if (!lines.length) return;
    const blockHeight = (lines.length - 1) * COMMITMENT.lineGap;
    const startY = (spec.yTop + spec.yBottom) / 2 - blockHeight / 2;
    lines.forEach((line, index) => {
      // Use a small safety margin inside the column width.
      ctx.fillText(line, spec.x, startY + index * COMMITMENT.lineGap, spec.width - 16);
    });
  });
  ctx.restore();
}

function drawNameAndSignature(ctx) {
  const name = nameInput.value.trim();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#102044';

  // Keep the name in the upper section of the white signature area.
  if (name) {
    let fontSize = 42;
    ctx.font = `bold ${fontSize}px Arial`;
    while (ctx.measureText(name).width > SIGNATURE_BOX.w - 50 && fontSize > 24) {
      fontSize -= 1;
      ctx.font = `bold ${fontSize}px Arial`;
    }
    ctx.fillText(name, SIGNATURE_BOX.x + SIGNATURE_BOX.w / 2, SIGNATURE_BOX.y + 50, SIGNATURE_BOX.w - 40);
  }

  // Draw signature in a clipped lower area so ink cannot spill outside the white panel.
  if (signatureHasInk) {
    const target = {
      x: SIGNATURE_BOX.x + 65,
      y: SIGNATURE_BOX.y + 95,
      w: SIGNATURE_BOX.w - 130,
      h: SIGNATURE_BOX.h - 115
    };

    // Find actual ink bounds from the signature canvas (alpha pixels).
    const pixels = sigCtx.getImageData(0, 0, sigCanvas.width, sigCanvas.height).data;
    let minX = sigCanvas.width, minY = sigCanvas.height, maxX = -1, maxY = -1;
    for (let y = 0; y < sigCanvas.height; y += 2) {
      for (let x = 0; x < sigCanvas.width; x += 2) {
        const alpha = pixels[(y * sigCanvas.width + x) * 4 + 3];
        if (alpha > 0) {
          minX = Math.min(minX, x); minY = Math.min(minY, y);
          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
      }
    }
    if (maxX >= minX && maxY >= minY) {
      const inkW = maxX - minX + 1;
      const inkH = maxY - minY + 1;
      const scale = Math.min(target.w / inkW, target.h / inkH);
      const drawW = inkW * scale;
      const drawH = inkH * scale;
      const dx = target.x + (target.w - drawW) / 2;
      const dy = target.y + (target.h - drawH) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(SIGNATURE_BOX.x, SIGNATURE_BOX.y, SIGNATURE_BOX.w, SIGNATURE_BOX.h);
      ctx.clip();
      ctx.drawImage(sigCanvas, minX, minY, inkW, inkH, dx, dy, drawW, drawH);
      ctx.restore();
    }
  }
  ctx.restore();
}

function renderAt(ctx) {
  ctx.clearRect(0, 0, SIZE, SIZE);
  if (frame.complete && frame.naturalWidth) {
    ctx.drawImage(frame, 0, 0, SIZE, SIZE);
  }

  if (photo) {
    drawCircularCover(ctx, photo, PHOTO.cx, PHOTO.cy, PHOTO.radius);
  }

  drawCommitment(ctx, commitmentInput.value);
  drawNameAndSignature(ctx);
}

function render() {
  const temp = document.createElement('canvas');
  temp.width = SIZE;
  temp.height = SIZE;
  renderAt(temp.getContext('2d'));

  pctx.clearRect(0, 0, preview.width, preview.height);
  pctx.drawImage(temp, 0, 0, preview.width, preview.height);
}

document.getElementById('downloadBtn').addEventListener('click', () => {
  if (!frame.complete || !frame.naturalWidth) {
    status.textContent = 'Desain Twibbon sedang dimuat. Coba lagi sebentar.';
    return;
  }
  if (!photo) {
    status.textContent = 'Silakan unggah foto terlebih dahulu.';
    return;
  }

  status.textContent = '';
  const output = document.createElement('canvas');
  output.width = SIZE;
  output.height = SIZE;
  renderAt(output.getContext('2d'));

  output.toBlob(blob => {
    if (!blob) {
      status.textContent = 'Gagal membuat PNG. Silakan coba kembali.';
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'safety-commitment-twibbon.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, 'image/png');
});

frame.onload = render;
frame.onerror = () => { status.textContent = 'File twibbon.png tidak ditemukan. Pastikan file ada di root repository.'; };
render();
