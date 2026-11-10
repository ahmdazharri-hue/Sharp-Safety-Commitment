// Safety Commitment Twibbon Generator — P2K3 SEID
// Foto digambar terlebih dahulu, kemudian overlay desain diletakkan di atasnya.

const DESIGN_W = 1536;
const DESIGN_H = 1536;
const photoInput = document.getElementById('photoInput');
const nameInput = document.getElementById('nameInput');
const c1Input = document.getElementById('commitment1');
const c2Input = document.getElementById('commitment2');
const sigCanvas = document.getElementById('signatureCanvas');
const sigCtx = sigCanvas.getContext('2d');
const preview = document.getElementById('previewCanvas');
const previewCtx = preview.getContext('2d');
const statusEl = document.getElementById('status');

const overlay = new Image();
overlay.src = 'twibbon-overlay.png';
let userPhoto = null;
let hasSignature = false;
let isDrawing = false;

// Foto pas di area dalam lingkaran hijau.
const PHOTO = { x: 624, y: 575, radius: 327 };

// Kotak putih signature pada desain.
const SIGN_BOX = { x: 440, y: 930, w: 374, h: 136 };

sigCtx.strokeStyle = '#102044';
sigCtx.lineWidth = 6;
sigCtx.lineCap = 'round';
sigCtx.lineJoin = 'round';

function pointFromEvent(e) {
  const r = sigCanvas.getBoundingClientRect();
  return {x:(e.clientX-r.left)*sigCanvas.width/r.width,
          y:(e.clientY-r.top)*sigCanvas.height/r.height};
}
sigCanvas.addEventListener('pointerdown', e => {
  isDrawing = true;
  sigCanvas.setPointerCapture(e.pointerId);
  const p = pointFromEvent(e);
  sigCtx.beginPath();
  sigCtx.moveTo(p.x,p.y);
});
sigCanvas.addEventListener('pointermove', e => {
  if(!isDrawing) return;
  const p = pointFromEvent(e);
  sigCtx.lineTo(p.x,p.y);
  sigCtx.stroke();
  hasSignature = true;
});
function stopDrawing(){isDrawing=false;}
sigCanvas.addEventListener('pointerup',stopDrawing);
sigCanvas.addEventListener('pointercancel',stopDrawing);

document.getElementById('clearSignature').addEventListener('click',()=>{
  sigCtx.clearRect(0,0,sigCanvas.width,sigCanvas.height);
  hasSignature=false;
  render();
});

photoInput.addEventListener('change',()=>{
  const f=photoInput.files && photoInput.files[0];
  if(!f) return;
  if(!f.type.startsWith('image/')){statusEl.textContent='Pilih file foto yang valid.';return;}
  const reader=new FileReader();
  reader.onload=()=>{
    const img=new Image();
    img.onload=()=>{userPhoto=img;statusEl.textContent='';render();};
    img.onerror=()=>{statusEl.textContent='Foto tidak dapat dibaca.';};
    img.src=reader.result;
  };
  reader.readAsDataURL(f);
});
[nameInput,c1Input,c2Input].forEach(el=>el.addEventListener('input',render));
c1Input.addEventListener('input',()=>document.getElementById('count1').textContent=c1Input.value.length);
c2Input.addEventListener('input',()=>document.getElementById('count2').textContent=c2Input.value.length);

function drawPhoto(ctx){
  if(!userPhoto) return;
  const img=userPhoto;
  const scale=Math.max((PHOTO.radius*2)/img.width,(PHOTO.radius*2)/img.height);
  const sw=PHOTO.radius*2/scale, sh=PHOTO.radius*2/scale;
  const sx=(img.width-sw)/2, sy=(img.height-sh)/2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(PHOTO.x,PHOTO.y,PHOTO.radius,0,Math.PI*2);
  ctx.clip();
  ctx.drawImage(img,sx,sy,sw,sh,PHOTO.x-PHOTO.radius,PHOTO.y-PHOTO.radius,PHOTO.radius*2,PHOTO.radius*2);
  ctx.restore();
}

function wrap(ctx,text,maxWidth){
  const words=text.trim().split(/\s+/).filter(Boolean);
  const lines=[]; let line='';
  for(const word of words){
    const candidate=line?line+' '+word:word;
    if(ctx.measureText(candidate).width>maxWidth && line){lines.push(line);line=word;}
    else line=candidate;
  }
  if(line) lines.push(line);
  return lines;
}

// Satu komitmen utuh per sisi. Area teks dibuat bersih agar tidak terpotong garis putus-putus.
function drawCommitment(ctx,text,side){
  if(!text.trim()) return;
  const area=side==='left'?{x:18,y:420,w:226,h:365}:{x:992,y:420,w:226,h:365};
  ctx.save();
  ctx.fillStyle='rgba(255,255,255,0.82)';
  ctx.fillRect(area.x,area.y,area.w,area.h);
  let size=27, lines=[];
  for(;size>=19;size--){
    ctx.font=`bold ${size}px Arial`;
    lines=wrap(ctx,text,area.w-16);
    if(lines.length<=7) break;
  }
  ctx.font=`bold ${size}px Arial`;
  ctx.fillStyle='#111';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  const lineH=size*1.38;
  const total=(lines.length-1)*lineH;
  const startY=area.y+area.h/2-total/2;
  lines.forEach((line,i)=>ctx.fillText(line,area.x+area.w/2,startY+i*lineH,area.w-12));
  ctx.restore();
}

function signatureBounds(){
  const data=sigCtx.getImageData(0,0,sigCanvas.width,sigCanvas.height).data;
  let minX=sigCanvas.width,minY=sigCanvas.height,maxX=-1,maxY=-1;
  for(let y=0;y<sigCanvas.height;y+=2){
    for(let x=0;x<sigCanvas.width;x+=2){
      if(data[(y*sigCanvas.width+x)*4+3]>0){
        minX=Math.min(minX,x);minY=Math.min(minY,y);
        maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
      }
    }
  }
  return maxX<0?null:{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1};
}

function drawNameAndSignature(ctx){
  ctx.save();
  ctx.beginPath();
  ctx.rect(SIGN_BOX.x,SIGN_BOX.y,SIGN_BOX.w,SIGN_BOX.h);
  ctx.clip();

  const name=nameInput.value.trim();
  if(name){
    let font=32;
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#102044';
    do{ctx.font=`bold ${font}px Arial`;if(ctx.measureText(name).width<=SIGN_BOX.w-30)break;font--;}while(font>18);
    ctx.fillText(name,SIGN_BOX.x+SIGN_BOX.w/2,SIGN_BOX.y+35,SIGN_BOX.w-24);
  }

  if(hasSignature){
    const b=signatureBounds();
    if(b){
      const target={x:SIGN_BOX.x+48,y:SIGN_BOX.y+65,w:SIGN_BOX.w-96,h:SIGN_BOX.h-76};
      const scale=Math.min(target.w/b.w,target.h/b.h);
      const dw=b.w*scale,dh=b.h*scale;
      const dx=target.x+(target.w-dw)/2,dy=target.y+(target.h-dh)/2;
      ctx.drawImage(sigCanvas,b.x,b.y,b.w,b.h,dx,dy,dw,dh);
    }
  }
  ctx.restore();
}

function renderTo(ctx){
  ctx.clearRect(0,0,DESIGN_W,DESIGN_H);
  drawPhoto(ctx);                         // layer 1: photo
  if(overlay.complete && overlay.naturalWidth) ctx.drawImage(overlay,0,0,DESIGN_W,DESIGN_H); // layer 2: design
  drawCommitment(ctx,c1Input.value,'left');  // layer 3: user text
  drawCommitment(ctx,c2Input.value,'right');
  drawNameAndSignature(ctx);
}
function render(){
  const temp=document.createElement('canvas');
  temp.width=DESIGN_W;temp.height=DESIGN_H;
  renderTo(temp.getContext('2d'));
  previewCtx.clearRect(0,0,preview.width,preview.height);
  previewCtx.drawImage(temp,0,0,preview.width,preview.height);
}
overlay.onload=render;
overlay.onerror=()=>statusEl.textContent='twibbon-overlay.png tidak ditemukan di root repository.';
document.getElementById('downloadBtn').addEventListener('click',()=>{
  if(!userPhoto){statusEl.textContent='Silakan unggah foto terlebih dahulu.';return;}
  if(!overlay.complete||!overlay.naturalWidth){statusEl.textContent='Desain belum selesai dimuat. Coba lagi.';return;}
  statusEl.textContent='';
  const canvas=document.createElement('canvas');
  canvas.width=DESIGN_W;canvas.height=DESIGN_H;
  renderTo(canvas.getContext('2d'));
  canvas.toBlob(blob=>{
    if(!blob){statusEl.textContent='Gagal membuat PNG. Coba kembali.';return;}
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download='safety-commitment-twibbon.png';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  },'image/png');
});
render();
