const vscode = require('vscode');
const fs = require('fs');
const os = require('os');
const path = require('path');

function activate(context) {
  const panel = vscode.window.createWebviewPanel(
    'pixelOfficeWelcome',
    '⬛ AI Team HQ',
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  panel.webview.html = getHtml();

  let idleTimer = null;

  function goActive() {
    clearTimeout(idleTimer);
    panel.webview.postMessage({ type: 'mode', value: 'active' });
    // Safety-net only — Stop hook is the primary idle trigger
    idleTimer = setTimeout(() => {
      panel.webview.postMessage({ type: 'mode', value: 'idle' });
    }, 300000);
  }

  function goIdle() {
    clearTimeout(idleTimer);
    panel.webview.postMessage({ type: 'mode', value: 'idle' });
  }

  // Watch ~/.claude/ directory — hq-active touched on every prompt+tool call,
  // hq-done touched by the Stop hook when Claude's turn ends
  const claudeDir = path.join(os.homedir(), '.claude');
  try {
    fs.watch(claudeDir, (eventType, filename) => {
      if (filename === 'hq-active') goActive();
      if (filename === 'hq-done')   goIdle();
    });
  } catch(e) {
    // fall back to workspace events
  }

  // Fallback: workspace file changes (catches Claude's file edits)
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(() => goActive()));
  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(() => goActive()));
}

function getHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Pixel Office - AI Team HQ</title>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: #080818;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: 'Press Start 2P', monospace;
  overflow: hidden;
}
.title {
  color: #FFE000;
  font-size: 11px;
  letter-spacing: 2px;
  margin-bottom: 10px;
  text-shadow: 0 0 12px #FF8800, 2px 2px 0 #AA4400;
  animation: titlePulse 2s ease-in-out infinite;
}
@keyframes titlePulse {
  0%,100% { opacity:1; }
  50%      { opacity:0.7; }
}
#cvs {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  border: 3px solid #333;
  box-shadow: 0 0 40px rgba(80,120,255,0.25), 0 0 0 1px #222;
  cursor: default;
}
.statusbar {
  display: flex;
  gap: 18px;
  margin-top: 10px;
  font-size: 7px;
  color: #888;
}
.statusbar span { color: #44FF88; }
.statusbar .warn { color: #FFAA00; }
</style>
</head>
<body>

<div class="title">★ AI TEAM HEADQUARTERS ★</div>
<canvas id="cvs" width="900" height="540"></canvas>
<div class="statusbar">
  <div>EMPLOYEES: <span id="employees">0 / 5 ONLINE</span></div>
  <div>VIBE: <span id="vibe">CHILLING</span></div>
</div>

<script>
let globalMode = 'idle';

window.addEventListener('message', function(event) {
  const msg = event.data;
  if (msg.type === 'mode') {
    globalMode = msg.value;
    document.getElementById('vibe').textContent      = msg.value === 'active' ? 'SHIPPING'     : 'CHILLING';
    document.getElementById('employees').textContent = msg.value === 'active' ? '5 / 5 ONLINE' : '0 / 5 ONLINE';
  }
});

const S  = 3;
const GW = 300;
const GH = 180;
const cvs = document.getElementById('cvs');
const ctx = cvs.getContext('2d');
ctx.imageSmoothingEnabled = false;

const bgCvs = document.createElement('canvas');
bgCvs.width = 900; bgCvs.height = 540;
const bg = bgCvs.getContext('2d');
bg.imageSmoothingEnabled = false;

let frame = 0;
let lastTime = 0;

function p(c, x, y, w, h, color) {
  if(w === undefined) w = 1;
  if(h === undefined) h = 1;
  c.fillStyle = color;
  c.fillRect(x*S, y*S, w*S, h*S);
}
function pLine(c, x0, y0, x1, y1, col) {
  c.fillStyle = col;
  let dx = Math.abs(x1-x0), dy = Math.abs(y1-y0);
  let sx = x0<x1?1:-1, sy = y0<y1?1:-1, err = dx-dy;
  while(true) {
    c.fillRect(x0*S,y0*S,S,S);
    if(x0===x1&&y0===y1) break;
    let e2=2*err;
    if(e2>-dy){err-=dy;x0+=sx;}
    if(e2<dx) {err+=dx;y0+=sy;}
  }
}
function lum(hex, amt) {
  const n = parseInt(hex.replace('#',''),16);
  const r = Math.min(255,Math.max(0,((n>>16)&0xFF)+Math.round(amt)));
  const g = Math.min(255,Math.max(0,((n>>8)&0xFF)+Math.round(amt)));
  const b = Math.min(255,Math.max(0,(n&0xFF)+Math.round(amt)));
  return '#'+(r*65536+g*256+b).toString(16).padStart(6,'0');
}

// ─── CHARACTERS ────────────────────────────────────────────────────────────────
// Customize this array to staff your office however you like.
// Each character needs: id, name, type, colors (nc/skin/hair/hair2/shirt/shirt2/eye), deskX, animOff
//
// Types: 'fire' | 'water' | 'grass' | 'electric' | 'psychic'
// deskX: horizontal position — space 5 characters across 0-270 (14 / 70 / 128 / 186 / 242)
// animOff: animation phase offset — spread them out so they don't all move in sync
// ───────────────────────────────────────────────────────────────────────────────
const CHARS = [
  { id:'blaze',  name:'BLAZE',  type:'fire',     nc:'#FF5533', skin:'#F5C884', hair:'#CC1100', hair2:'#FF4400', shirt:'#FF6622', shirt2:'#BB3300', eye:'#2A0A00', deskX:14,  animOff:0   },
  { id:'tide',   name:'TIDE',   type:'water',    nc:'#44AAFF', skin:'#F0C880', hair:'#1133BB', hair2:'#2255DD', shirt:'#2266BB', shirt2:'#114488', eye:'#001188', deskX:70,  animOff:97  },
  { id:'grove',  name:'GROVE',  type:'grass',    nc:'#44CC44', skin:'#E8C870', hair:'#117711', hair2:'#229922', shirt:'#226633', shirt2:'#114422', eye:'#0A2A0A', deskX:128, animOff:43  },
  { id:'bolt',   name:'BOLT',   type:'electric', nc:'#FFEE00', skin:'#FAD098', hair:'#BBAA00', hair2:'#FFDD00', shirt:'#998800', shirt2:'#111111', eye:'#332200', deskX:186, animOff:151 },
  { id:'mystic', name:'MYSTIC', type:'psychic',  nc:'#CC44FF', skin:'#F0C090', hair:'#7711BB', hair2:'#AA33FF', shirt:'#771199', shirt2:'#550077', eye:'#330066', deskX:242, animOff:67  },
];

const GLOW = { fire:'#FF4400', water:'#0066FF', grass:'#00BB44', electric:'#BBAA00', psychic:'#9922CC' };

// ─── TASK BUBBLES ───────────────────────────────────────────────────────────────
// Customize the chat bubble messages for each type.
// active: shown while Claude is working | idle: shown while chilling
// Keep strings exactly 14 chars (padded with spaces) for clean alignment.
// ───────────────────────────────────────────────────────────────────────────────
const TASKS = {
  fire:     { active: ['Building prod...','Hot deploy!  ','On it!        ','Generating... '],
               idle:   ['Coffee break  ','Warming up...','Chilling...   ','Vibing...     '] },
  water:    { active: ['Analyzing logs ','Reading files ','Searching...  ','Code review   '],
               idle:   ['Taking 5...   ','Flow state...','Hydrating...  ','Thinking...   '] },
  grass:    { active: ['Writing code..','Pair coding...','Green tests!  ','Committing... '],
               idle:   ['Touch grass..','Breather...   ','Daydreaming..','Stretching... '] },
  electric: { active: ['Running CI... ','Type check... ','Benchmarks    ','Ship it!      '],
               idle:   ['Low power...  ','Recharging...','Idle...       ','Standby...    '] },
  psychic:  { active: ['Designing UI..','Plotting...   ','Envisioning..','Manifesting.. '],
               idle:   ['Reading vibes','Astral plane.','Deep thought.','Crystal ball. '] },
};

const DESK_W = 52;
const DESK_TOP = 88;
const DESK_H   = 6;

function drawBG() {
  p(bg,0,0,GW,6,'#1A1830');
  p(bg,0,5,GW,1,'#222038');
  [80,160,240].forEach(function(lx){
    p(bg,lx,0,20,3,'#333355');
    p(bg,lx+3,1,14,2,'#888899');
    p(bg,lx+5,2,10,1,'#CCCCDD');
  });
  p(bg,0,6,GW,76,'#C4B49A');
  for(let wx=0;wx<GW;wx+=12) p(bg,wx,6,1,76,'#B8A88A');
  p(bg,0,80,GW,5,'#8A7258');
  p(bg,0,79,GW,1,'#AA9068');
  p(bg,0,84,GW,1,'#6A5238');
  for(let fy=85;fy<GH;fy++){
    for(let fx=0;fx<GW;fx++){
      const t=((fx/12|0)+(fy-85)/12|0)%2;
      p(bg,fx,fy,1,1,t?'#CEC0A0':'#BEB090');
    }
  }
  p(bg,0,85,GW,1,'#DDCC99');
  for(let i=0;i<8;i++){
    bg.fillStyle='rgba(0,0,0,'+(0.18-i*0.022)+')';
    bg.fillRect(i*S,0,S,540);
    bg.fillRect((GW-1-i)*S,0,S,540);
  }
  drawWallDecor();
}

function drawWallDecor() {
  const px=8, py=10;
  p(bg,px,py,30,30,'#2A1A10');
  p(bg,px+1,py+1,28,28,'#000000');
  p(bg,px,py,30,1,'#AA9944'); p(bg,px,py+29,30,1,'#AA9944');
  p(bg,px,py,1,30,'#AA9944'); p(bg,px+29,py,1,30,'#AA9944');

  const wx=74, wy=7;
  p(bg,wx,wy,80,42,'#556677');
  p(bg,wx+2,wy+2,76,38,'#F2EDE8');
  p(bg,wx+2,wy+38,76,2,'#889988');
  p(bg,wx+2,wy+37,76,1,'#99AAAA');
  [[4,'#FF2244'],[10,'#2244FF'],[16,'#22AA44']].forEach(function(m){
    p(bg,wx+2+m[0],wy+38,5,2,m[1]);
    p(bg,wx+2+m[0]+4,wy+38,1,2,'#333');
  });
  p(bg,wx+5,wy+5,20,2,'#223388');
  p(bg,wx+6,wy+6,18,1,'#4466CC');
  p(bg,wx+28,wy+10,1,27,'#CCBBAA'); p(bg,wx+52,wy+10,1,27,'#CCBBAA');
  p(bg,wx+6, wy+10,18,3,'#FF9944');
  p(bg,wx+31,wy+10,18,3,'#44BB66');
  p(bg,wx+55,wy+10,18,3,'#4488FF');
  const cards=[
    [wx+4, wy+15,20,8,'#FFEE99'],[wx+4, wy+25,20,8,'#FFEE99'],
    [wx+29,wy+15,20,8,'#AAFFBB'],[wx+29,wy+25,20,8,'#AAFFBB'],
    [wx+53,wy+15,20,8,'#AADDFF'],[wx+53,wy+25,20,8,'#AADDFF'],[wx+53,wy+10,20,3,'#AADDFF'],
  ];
  cards.forEach(function(card){
    const cx=card[0],cy=card[1],cw=card[2],ch=card[3],cc=card[4];
    p(bg,cx,cy,cw,ch,cc);
    p(bg,cx+1,cy+1,cw-2,1,lum(cc,20));
    p(bg,cx+2,cy+3,cw-4,1,'#88888877');
    p(bg,cx+2,cy+5,cw-6,1,'#88888855');
  });

  const wdx=162, wdy=5;
  p(bg,wdx,wdy,58,42,'#6A5A40');
  p(bg,wdx+3,wdy+3,52,36,'#7AAABB');
  for(let i=0;i<22;i++) p(bg,wdx+3,wdy+3+i,52,1,'hsl('+(200+i*1.5)+','+(55-i)+'%,'+(55+i)+'%)');
  p(bg,wdx+45,wdy+5,7,7,'#FFE030');
  p(bg,wdx+47,wdy+3,3,2,'#FFD000');
  p(bg,wdx+50,wdy+7,2,3,'#FFD000');
  p(bg,wdx+43,wdy+7,2,3,'#FFD000');
  p(bg,wdx+48,wdy+11,3,2,'#FFD000');
  [[3,14,10,25,'#334455'],[15,18,9,21,'#445566'],[26,10,13,29,'#2A3A4A'],[41,19,9,20,'#3A4A5A']].forEach(function(b){
    p(bg,wdx+3+b[0],wdy+b[1],b[2],b[3],b[4]);
    for(let wy2=2;wy2<b[3]-2;wy2+=5)
      for(let wx2=1;wx2<b[2]-1;wx2+=4)
        p(bg,wdx+3+b[0]+wx2,wdy+b[1]+wy2,2,3,'#FFFF99');
  });
  p(bg,wdx+3,wdy+33,52,6,'#556677');
  p(bg,wdx+3,wdy+36,52,1,'#FFEE00');
  p(bg,wdx+30,wdy+3,3,36,'#6A5A40');
  p(bg,wdx+3,wdy+22,52,3,'#6A5A40');
  p(bg,wdx+4,wdy+4,8,1,'#FFFFFF88');
  p(bg,wdx+4,wdy+4,1,4,'#FFFFFF88');

  const clx=42, cly=9;
  p(bg,clx,cly,22,22,'#444455');
  p(bg,clx+1,cly+1,20,20,'#EEEEFF');
  p(bg,clx+2,cly+2,18,18,'#F8F8FF');
  for(let i=0;i<12;i++){
    const a=(i/12)*Math.PI*2-Math.PI/2;
    const r=8, tx=Math.round(11+Math.cos(a)*r), ty=Math.round(11+Math.sin(a)*r);
    p(bg,clx+tx,cly+ty,1,1,'#888899');
  }
  p(bg,clx+11,cly+11,1,1,'#222233');

  const bsx=277, bsy=14;
  p(bg,bsx,bsy,22,64,'#5A4030');
  p(bg,bsx+1,bsy+1,20,62,'#221810');
  [15,29,43,57].forEach(function(sy){ p(bg,bsx+1,bsy+sy,20,2,'#5A4030'); p(bg,bsx+1,bsy+sy-1,20,1,'#7A6050'); });
  const bookCols=[
    ['#FF4444','#4488FF','#44FF44','#FFAA00','#FF44FF','#00FFFF','#FFFF44'],
    ['#FF8844','#8844FF','#44FFAA','#FF4488','#AAFF44','#44AAFF'],
    ['#CC2244','#2244CC','#22CC88','#CC8822','#CC22CC','#22CCCC','#CCCC22'],
    ['#884444','#4444AA','#448844','#888800','#884488','#448888'],
  ];
  bookCols.forEach(function(cols,si){
    let bx=bsx+2;
    const by=bsy+2+si*14;
    cols.forEach(function(c,bi){
      const bw=2+(bi%2);
      p(bg,bx,by,bw,12,c);
      p(bg,bx,by,bw,1,'#FFFFFF55');
      p(bg,bx,by+11,bw,1,'#00000044');
      bx+=bw+1;
    });
  });

  const cmx=1, cmy=130;
  p(bg,cmx,cmy,20,30,'#2A2A2A');
  p(bg,cmx+1,cmy+1,18,28,'#383838');
  p(bg,cmx+1,cmy+5,18,2,'#AA1100');
  p(bg,cmx+2,cmy+8,16,9,'#111111');
  p(bg,cmx+3,cmy+9,6,2,'#00FF88');
  p(bg,cmx+3,cmy+12,9,1,'#00AA44');
  p(bg,cmx+11,cmy+9,4,2,'#CC1100');
  p(bg,cmx+11,cmy+12,4,2,'#116611');
  p(bg,cmx+4,cmy+18,12,5,'#1A1A1A');
  p(bg,cmx+5,cmy+19,10,3,'#404040');
  p(bg,cmx+6,cmy+20,8,1,'#606060');
  p(bg,cmx+1,cmy+23,18,1,'#444');
  p(bg,cmx+2,cmy+24,8,5,'#F0ECE8');
  p(bg,cmx+3,cmy+25,6,4,'#2A1205');
  p(bg,cmx+1,cmy+26,10,1,'#F0ECE8');
  p(bg,cmx+11,cmy+24,6,5,'#DDD8D0');
  p(bg,cmx+12,cmy+25,4,4,'#1A0C00');
  p(bg,cmx+2,cmy+1,4,3,'#111');
  p(bg,cmx+3,cmy+2,5,1,'#FFAA00');

  const plx=248, ply=130;
  p(bg,plx+3,ply+15,16,2,'#8B4513');
  p(bg,plx+4,ply+17,14,10,'#9B5523');
  p(bg,plx+6,ply+27,10,2,'#8B4513');
  p(bg,plx+5,ply+16,10,1,'#C87040');
  p(bg,plx+5,ply+17,4,4,'#3C2010');
  const leaves=[
    [7,2,8,11,'#228B22'],[2,5,7,9,'#2E8B57'],[12,4,7,9,'#22AA22'],
    [1,9,9,7,'#196619'],[11,8,9,7,'#33AA55'],[6,0,8,6,'#1FAF1F'],
    [4,11,6,5,'#228B22'],[11,10,7,5,'#2E8B57'],
  ];
  leaves.forEach(function(l){
    p(bg,plx+l[0],ply+l[1],l[2],l[3],l[4]);
    p(bg,plx+l[0]+Math.floor(l[2]/2),ply+l[1],1,l[3],'#1A6020');
    p(bg,plx+l[0]+1,ply+l[1]+1,2,2,lum(l[4],40));
  });

  p(bg,22,148,10,20,'#444455');
  p(bg,23,149,8,18,'#333344');
  p(bg,22,148,10,2,'#555566');
  p(bg,24,147,6,1,'#666677');
  p(bg,25,150,1,15,'#3A3A4A');
  p(bg,27,150,1,15,'#3A3A4A');

  p(bg,278,130,14,40,'#DDDDEE');
  p(bg,279,131,12,38,'#EEEEFF');
  p(bg,279,131,12,22,'#AACCFF88');
  p(bg,280,132,10,20,'#CCE8FF');
  p(bg,282,128,8,4,'#CCCCDD');
  p(bg,283,129,6,2,'#AAAACC');
  p(bg,279,153,5,3,'#CC2222');
  p(bg,285,153,5,3,'#2244CC');
  p(bg,278,168,14,2,'#BBBBCC');

  p(bg,226,10,38,18,'#1A2A1A');
  p(bg,227,11,36,16,'#223322');
  p(bg,229,13,8,2,'#44FF44');
  p(bg,239,13,22,2,'#FF4444');
  p(bg,229,17,30,1,'#33AA33');
  p(bg,229,19,20,1,'#226622');
  p(bg,229,23,12,1,'#FF4444');
  p(bg,243,23,6,1,'#FFAA00');
  p(bg,234,8,2,3,'#AA9977'); p(bg,248,8,2,3,'#AA9977');
}

function drawPoster(c) {
  const px=8, py=10;
  c.save();
  c.font = '5px "Press Start 2P"';
  c.fillStyle = '#FFFFFF';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('HUSTLE',  (px+15)*S, (py+8)*S);
  c.fillText('GRIND',   (px+15)*S, (py+15)*S);
  c.fillText('EXECUTE', (px+15)*S, (py+22)*S);
  c.restore();
}

function drawClock(c, f) {
  const cx=42+11, cy=9+11;
  const now = new Date();
  const sec = now.getSeconds() + now.getMilliseconds()/1000;
  const min = now.getMinutes() + sec/60;
  const hr  = (now.getHours() % 12) + min/60;
  const ha=(hr/12)*Math.PI*2-Math.PI/2;
  pLine(c,cx,cy, cx+Math.round(Math.cos(ha)*5), cy+Math.round(Math.sin(ha)*5), '#222233');
  const ma=(min/60)*Math.PI*2-Math.PI/2;
  pLine(c,cx,cy, cx+Math.round(Math.cos(ma)*7), cy+Math.round(Math.sin(ma)*7), '#333344');
  const sa=(sec%60/60)*Math.PI*2-Math.PI/2;
  pLine(c,cx,cy, cx+Math.round(Math.cos(sa)*8), cy+Math.round(Math.sin(sa)*8), '#EE1122');
  p(c,cx,cy,1,1,'#333344');
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 6  && h < 10) return 'morning';
  if (h >= 10 && h < 16) return 'midday';
  if (h >= 16 && h < 20) return 'evening';
  return 'night';
}

function drawCitySkyline(c, tod) {
  const wdx=165, base=44;
  const col = tod==='morning' ? '#3A2818' : tod==='midday' ? '#2A3540' : tod==='evening' ? '#1A0808' : '#080810';
  const bldgs = [[0,5,8],[4,3,12],[6,7,9],[12,4,15],[15,6,8],[20,5,18],
                 [24,3,7],[26,6,13],[31,4,10],[34,5,16],[38,4,9],[41,6,12],
                 [46,3,14],[48,4,9]];
  bldgs.forEach(function(b) {
    p(c, wdx+b[0], base-b[2], b[1], b[2], col);
    p(c, wdx+b[0], base-b[2], b[1], 1, lum(col, 15));
    if (tod === 'night') {
      for(let wy=2; wy<b[2]-1; wy+=3) {
        for(let wx=1; wx<b[1]-1; wx+=2) {
          if((b[0]+wx+wy)%3!==0) p(c, wdx+b[0]+wx, base-b[2]+wy, 1, 1, '#FFEE88');
        }
      }
    }
  });
}

function drawWindowSky(c) {
  const tod = getTimeOfDay();
  c.save();
  c.beginPath();
  c.rect(165*S, 8*S,  27*S, 19*S);
  c.rect(195*S, 8*S,  22*S, 19*S);
  c.rect(165*S, 30*S, 27*S, 14*S);
  c.rect(195*S, 30*S, 22*S, 14*S);
  c.clip();
  const wdx=165, wdy=8, ww=52, wh=36;
  if (tod === 'morning') {
    for(let i=0;i<wh;i++) p(c,wdx,wdy+i,ww,1,'hsl('+(30-i*0.5)+','+(80-i*1.5)+'%,'+(45+i*1.2)+'%)');
    p(c,wdx+20,wdy+22,8,7,'#FFD040');
    p(c,wdx+22,wdy+20,4,2,'#FFE060');
    drawCitySkyline(c, tod);
  } else if (tod === 'midday') {
    for(let i=0;i<wh;i++) p(c,wdx,wdy+i,ww,1,'hsl('+(200+i*1.5)+','+(55-i)+'%,'+(55+i)+'%)');
    p(c,wdx+38,wdy+5,7,7,'#FFE030');
    p(c,wdx+40,wdy+3,3,2,'#FFD000');
    p(c,wdx+43,wdy+7,2,3,'#FFD000');
    p(c,wdx+36,wdy+7,2,3,'#FFD000');
    p(c,wdx+41,wdy+12,3,2,'#FFD000');
    drawCitySkyline(c, tod);
  } else if (tod === 'evening') {
    for(let i=0;i<wh;i++) p(c,wdx,wdy+i,ww,1,'hsl('+(15+i*0.8)+','+(75-i*1.2)+'%,'+(35+i*1.0)+'%)');
    p(c,wdx+18,wdy+28,10,8,'#FF5010');
    p(c,wdx+20,wdy+26,6,3,'#FF7030');
    drawCitySkyline(c, tod);
  } else {
    for(let i=0;i<wh;i++) p(c,wdx,wdy+i,ww,1,'hsl(230,'+(25-i*0.3)+'%,'+(12+i*0.5)+'%)');
    [[3,3],[9,1],[18,4],[24,2],[31,7],[40,2],[47,5],[12,9],[36,3],[5,6],[44,5]].forEach(function(s,i){
      if(s[1] < 18) {
        const tw = 0.4 + 0.6*Math.abs(Math.sin(frame/55 + i*1.7));
        p(c,wdx+s[0],wdy+s[1],1,1,'rgba(255,255,200,'+tw.toFixed(2)+')');
      }
    });
    p(c,wdx+42,wdy+4,5,5,'#EEEECC');
    p(c,wdx+44,wdy+3,3,1,'#EEEECC');
    p(c,wdx+44,wdy+9,3,1,'#EEEECC');
    p(c,wdx+43,wdy+4,2,5,'#C8C8AA');
    drawCitySkyline(c, tod);
  }
  c.restore();
}

function drawWindowAnim(c, f) {
  c.save();
  c.beginPath();
  c.rect(165*S, 8*S,  27*S, 19*S);
  c.rect(195*S, 8*S,  22*S, 19*S);
  c.rect(165*S, 30*S, 27*S, 14*S);
  c.rect(195*S, 30*S, 22*S, 14*S);
  c.clip();
  if (getTimeOfDay() === 'midday') {
    const cl1 = 166 + (f * 0.12) % 35;
    [[cl1,18,14,3],[cl1+2,16,10,2],[cl1-1,19,15,2]].forEach(function(x){p(c,x[0],x[1],x[2],x[3],'#E8F0FF');});
    const cl2 = 167 + (f * 0.07) % 38;
    [[cl2+4,24,8,2],[cl2+5,23,6,2]].forEach(function(x){p(c,x[0],x[1],x[2],x[3],'#D8E8FF');});
    const bx = (165 + (f*0.2) % 40)|0;
    p(c,bx,14,2,1,'#1A1A22'); p(c,bx+3,14,2,1,'#1A1A22'); p(c,bx+2,15,1,1,'#1A1A22');
  }
  c.restore();
}

function drawSteam(c, f) {
  const phase = (f/15)%6|0;
  const steamPts = [
    [[6,128],[8,126]],[[7,127],[9,125]],[[5,127],[7,125]],
    [[6,127],[8,125]],[[7,128],[9,126]],[[5,128],[7,126]],
  ];
  c.fillStyle='#FFFFFF99';
  steamPts[phase].forEach(function(pt){c.fillRect(pt[0]*S,pt[1]*S,S,S);});
}

function drawChair(c, gx, gy) {
  p(c,gx+14,gy,   10,16,'#1E1E2E');
  p(c,gx+15,gy+1,  8,14,'#2A2A3E');
  p(c,gx+15,gy,    8,1, '#3A3A4E');
  p(c,gx+12,gy+9,  3,5, '#1E1E2E');
  p(c,gx+23,gy+9,  3,5, '#1E1E2E');
  p(c,gx+11,gy+16,16,5,'#1E1E2E');
  p(c,gx+11,gy+16,16,2,'#2A2A3E');
  p(c,gx+14,gy+21, 3,2,'#111');
  p(c,gx+21,gy+21, 3,2,'#111');
  p(c,gx+17,gy+21, 2,3,'#222');
}

function drawDesk(c, gx) {
  const gy = DESK_TOP;
  p(c,gx,gy,  DESK_W,DESK_H, '#C09050');
  p(c,gx,gy,  DESK_W,1,      '#D4A860');
  p(c,gx,gy+1,DESK_W,1,      '#B88840');
  p(c,gx,gy+DESK_H, DESK_W,18,'#8A6028');
  p(c,gx,gy+DESK_H, DESK_W,1, '#AA8040');
  p(c,gx+2,gy+DESK_H+5, DESK_W-4,1,'#9A702A55');
  p(c,gx+2,gy+DESK_H+10,DESK_W-4,1,'#9A702A55');
  p(c,gx+2,gy+DESK_H+15,DESK_W-4,1,'#9A702A44');
  p(c,gx+3,gy+DESK_H+1,  3,17,'#7A5020');
  p(c,gx+DESK_W-6,gy+DESK_H+1,3,17,'#7A5020');
  p(c,gx+3,gy+DESK_H+17, 3,1,'#5A3810');
  p(c,gx+DESK_W-6,gy+DESK_H+17,3,1,'#5A3810');
}

function drawMonitorShell(c, gx, gy) {
  p(c,gx+7, gy+15,4,4,'#3A3A4A');
  p(c,gx+5, gy+18,8,2,'#2A2A3A');
  p(c,gx,   gy,   18,16,'#222233');
  p(c,gx+1, gy+1, 16,14,'#111122');
}

function drawMonitorScreen(c, char, f) {
  const gx = char.deskX + 17;
  const gy = DESK_TOP - 20;
  const sx = gx+2, sy = gy+2;

  if (globalMode !== 'active') {
    p(c, sx, sy, 14, 12, '#050505');
    return;
  }

  if(char.type === 'fire') {
    p(c,sx,sy,14,12,'#0E0500');
    const cols=['#FF6633','#FFAA44','#FF4444','#FFCC55','#FF8822','#CC4422'];
    for(let i=0;i<6;i++){
      const w=2+((i*5+f/2)%9|0);
      const indent=(i%3===0)?0:2+(i%2);
      p(c,sx+1+indent,sy+1+i*2,w,1,cols[i]);
    }
    if(Math.floor(f/25)%2===0) p(c,sx+3,sy+11,1,1,'#FF6633');
  } else if(char.type === 'water') {
    p(c,sx,sy,14,12,'#000A18');
    const heights=[3,7,4,8,5,6];
    heights.forEach(function(h,i){
      const hue = 200+i*8;
      for(let hh=0;hh<h;hh++) p(c,sx+1+i*2,sy+11-hh,1,1,'hsl('+hue+',80%,'+(35+hh*5)+'%)');
    });
    p(c,sx+1,sy+2,12,1,'#1144AA22');
    p(c,sx+1,sy+6,12,1,'#1144AA22');
    const spike=Math.sin(f/30)*2|0;
    p(c,sx+9,sy+3-spike,1,2,'#88DDFF');
  } else if(char.type === 'grass') {
    p(c,sx,sy,14,12,'#000D00');
    for(let i=0;i<10;i++){
      const w=2+(i%4)*2+(i%2);
      p(c,sx+1,sy+1+i,w,1,'#33AA44');
      if(i%3===0) p(c,sx+w+2,sy+1+i,3,1,'#22882288');
    }
    p(c,sx+13,sy+1,1,10,'#224422');
    const scrollY=((f/80)%7|0);
    p(c,sx+13,sy+1+scrollY,1,3,'#44BB44');
  } else if(char.type === 'electric') {
    p(c,sx,sy,14,12,'#080600');
    const lineCount=Math.floor(f/18)%7;
    for(let i=0;i<=lineCount;i++){
      const w=3+((i*3)%8);
      p(c,sx+1,sy+1+i*2,w,1,'#BBAA00');
      if(i<lineCount) p(c,sx+1,sy+1+i*2+1,w-1,1,'#776600');
    }
    if(Math.floor(f/15)%2===0) p(c,sx+1,sy+11,5,1,'#FFEE00');
  } else if(char.type === 'psychic') {
    p(c,sx,sy,14,12,'#060012');
    const ang=(f/80)*Math.PI*2;
    for(let i=0;i<4;i++){
      const a=ang+i*(Math.PI/2);
      const rx=6+Math.round(Math.cos(a)*4);
      const ry=6+Math.round(Math.sin(a)*3);
      p(c,sx+rx,sy+ry,2,2,'hsl('+(270+i*30)+',90%,65%)');
    }
    p(c,sx+5,sy+4,4,4,'#FF44FF44');
    p(c,sx+6,sy+5,2,2,'#FF88FF');
    p(c,sx+1,sy+10,12,1,'#6622AA55');
    p(c,sx+1,sy+11,8,1,'#AA44FF55');
  }
}

function drawDeskItems(c, char, f) {
  const gx = char.deskX;
  const gy = DESK_TOP;
  if(char.type === 'fire') {
    p(c,gx+38,gy+1,6,5,'#CC1100'); p(c,gx+39,gy+2,4,3,'#3A1000');
    p(c,gx+44,gy+2,2,3,'#CC1100');
    if(Math.floor(f/20)%2===0){ p(c,gx+40,gy-1,1,2,'#FFFFFF88'); p(c,gx+41,gy-2,1,2,'#FFFFFF55'); }
    p(c,gx+3,gy+2,7,5,'#FFEE55'); p(c,gx+4,gy+3,5,1,'#AA990044'); p(c,gx+4,gy+5,4,1,'#AA990033');
    p(c,gx+11,gy+4,10,1,'#FFCC44'); p(c,gx+21,gy+4,2,1,'#FF8800'); p(c,gx+10,gy+4,1,1,'#DDDDDD');
  } else if(char.type === 'water') {
    p(c,gx+38,gy+0,5,7,'#AACCFF'); p(c,gx+39,gy-1,3,1,'#8899CC');
    p(c,gx+38,gy+2,5,2,'#CCE8FF'); p(c,gx+38,gy+6,5,1,'#8899BB');
    p(c,gx+3,gy+1,10,2,'#333344'); p(c,gx+3,gy+3,2,3,'#333344'); p(c,gx+11,gy+3,2,3,'#333344');
    p(c,gx+4,gy+1,8,1,'#444466');
    p(c,gx+3,gy+2,8,4,'#F0EEE8'); p(c,gx+3,gy+2,1,4,'#CCBBAA'); p(c,gx+4,gy+3,6,1,'#CCCCBB55');
  } else if(char.type === 'grass') {
    p(c,gx+38,gy+3,6,4,'#7A3C10'); p(c,gx+37,gy+0,8,4,'#228B22');
    p(c,gx+35,gy+1,3,3,'#33AA33'); p(c,gx+42,gy+1,4,3,'#33AA33');
    p(c,gx+39,gy-1,2,1,'#44BB44');
    p(c,gx+3,gy+1,12,5,'#F0E8D0'); p(c,gx+9,gy+1,1,5,'#888877');
    p(c,gx+4,gy+2,4,1,'#9988AA44'); p(c,gx+10,gy+2,3,1,'#9988AA44');
    p(c,gx+4,gy+4,5,1,'#9988AA33'); p(c,gx+10,gy+4,3,1,'#9988AA33');
  } else if(char.type === 'electric') {
    p(c,gx+38,gy+0,5,7,'#AABB00'); p(c,gx+39,gy-1,3,1,'#889900');
    p(c,gx+38,gy+2,5,2,'#CCEE00'); p(c,gx+38,gy+6,5,1,'#667700');
    p(c,gx+43,gy+3,7,4,'#AABB0077'); p(c,gx+43,gy+4,7,2,'#CCEE0055');
    p(c,gx+3,gy+1,6,5,'#FFCC00'); p(c,gx+2,gy+2,6,5,'#FFDD44'); p(c,gx+4,gy+0,6,5,'#FFEE66');
    p(c,gx+4,gy+2,4,1,'#AA880044'); p(c,gx+3,gy+4,5,1,'#AA880033');
  } else if(char.type === 'psychic') {
    p(c,gx+38,gy+1,7,6,'#AA66EE'); p(c,gx+39,gy+0,5,7,'#BB77FF');
    p(c,gx+40,gy+1,3,3,'#DD99FF'); p(c,gx+41,gy+2,1,1,'#FFFFFF');
    const sp=Math.floor(f/12)%5;
    if(sp===0) p(c,gx+36,gy-2,1,1,'#FF88FF');
    if(sp===1) p(c,gx+46,gy-3,2,2,'#CC44FF');
    if(sp===2) p(c,gx+38,gy-4,1,1,'#FFAAFF');
    if(sp===3) p(c,gx+44,gy-1,1,2,'#FF44FF');
    p(c,gx+3,gy+1,9,5,'#771199'); p(c,gx+3,gy+1,1,5,'#550077');
    p(c,gx+4,gy+3,7,1,'#AA33CC44'); p(c,gx+4,gy+5,6,1,'#AA33CC33');
  }
}

function getState(char, f) {
  if (globalMode === 'active') {
    return { state: 'typing', sub: (f + char.animOff) % 8 };
  }
  const t = (f + char.animOff) % 300;
  if(t < 80)  return { state: 'thinking',   sub: t };
  if(t < 160) return { state: 'stretching', sub: t - 80 };
  if(t < 220) return { state: 'idle',       sub: t - 160 };
  return             { state: 'drinking',   sub: t - 220 };
}

function drawChar(c, char, state, sub) {
  const skin=char.skin, hair=char.hair, hair2=char.hair2, shirt=char.shirt, shirt2=char.shirt2, eye=char.eye;
  const gx = char.deskX + 19;
  const bob = (state==='typing' && sub%10<5) ? 1 : 0;
  const gy  = DESK_TOP - 22 + bob;

  if(char.id === 'blaze') {
    p(c,gx+2,gy+1,8,4,hair); p(c,gx+1,gy,2,2,hair); p(c,gx+9,gy,2,2,hair);
    p(c,gx+4,gy-1,4,2,hair); p(c,gx+3,gy-2,2,1,hair); p(c,gx+7,gy-2,2,1,hair);
    p(c,gx+5,gy-3,2,1,hair2);
  } else if(char.id === 'tide') {
    p(c,gx+1,gy,10,4,hair); p(c,gx+0,gy+2,2,5,hair); p(c,gx+10,gy+2,2,5,hair);
    p(c,gx+2,gy-1,7,1,hair); p(c,gx+3,gy-2,4,1,hair2);
    p(c,gx+2,gy,3,1,lum(hair2,40));
  } else if(char.id === 'grove') {
    p(c,gx+2,gy+1,8,4,hair); p(c,gx+1,gy,3,2,hair); p(c,gx+8,gy,3,2,hair);
    p(c,gx+3,gy-1,6,2,hair); p(c,gx+1,gy-1,1,1,hair); p(c,gx+5,gy-2,3,1,hair);
    p(c,gx+9,gy+0,2,1,hair); p(c,gx+2,gy-2,1,1,hair2);
  } else if(char.id === 'bolt') {
    p(c,gx+1,gy+1,10,4,hair); p(c,gx+0,gy+2,2,3,hair); p(c,gx+11,gy+2,2,3,hair);
    p(c,gx+2,gy-1,8,2,hair); p(c,gx+4,gy-2,4,1,hair);
    p(c,gx-1,gy+2,1,2,hair2); p(c,gx+12,gy+3,1,2,hair2);
    p(c,gx+3,gy-3,2,1,hair2); p(c,gx+7,gy-3,2,1,hair2);
  } else if(char.id === 'mystic') {
    p(c,gx+2,gy+2,8,4,hair); p(c,gx+2,gy+1,3,1,hair); p(c,gx+7,gy+1,3,1,hair);
    p(c,gx+1,gy-1,4,4,hair); p(c,gx+2,gy-2,2,1,hair); p(c,gx+2,gy-1,1,1,lum(hair2,50));
    p(c,gx+7,gy-1,4,4,hair); p(c,gx+8,gy-2,2,1,hair); p(c,gx+8,gy-1,1,1,lum(hair2,50));
  }

  p(c,gx+2,gy+3,8,7,skin);
  p(c,gx+2,gy+9,8,1,lum(skin,-20));
  p(c,gx+1,gy+5,1,3,lum(skin,-10));
  p(c,gx+10,gy+5,1,3,lum(skin,-10));

  if(state==='typing'||state==='idle') {
    p(c,gx+3,gy+5,2,2,eye); p(c,gx+7,gy+5,2,2,eye);
    p(c,gx+4,gy+5,1,1,'#FFFFFF88'); p(c,gx+8,gy+5,1,1,'#FFFFFF88');
  } else if(state==='thinking') {
    p(c,gx+3,gy+5,2,2,eye); p(c,gx+7,gy+6,2,1,eye);
  } else if(state==='stretching') {
    p(c,gx+3,gy+6,2,1,eye); p(c,gx+7,gy+6,2,1,eye);
  } else {
    p(c,gx+3,gy+5,2,2,eye); p(c,gx+7,gy+5,2,2,eye);
    p(c,gx+4,gy+5,1,1,'#FFFFFF88'); p(c,gx+8,gy+5,1,1,'#FFFFFF88');
  }

  p(c,gx+5,gy+7,2,1,lum(skin,-18));

  if(state==='typing' && sub%40<5) {
    p(c,gx+4,gy+8,4,1,eye); p(c,gx+4,gy+9,4,1,'#BB4444');
  } else if(state==='stretching') {
    p(c,gx+4,gy+8,4,1,eye); p(c,gx+5,gy+9,2,1,'#BB4444');
    p(c,gx+4,gy+9,4,1,'#992222'); p(c,gx+5,gy+10,2,1,'#BB4444');
  } else {
    p(c,gx+4,gy+8,4,1,eye);
  }

  p(c,gx+4,gy+10,4,2,skin);
  p(c,gx+1,gy+12,10,8,shirt);
  p(c,gx+1,gy+12,10,1,lum(shirt,25));
  p(c,gx+1,gy+19,10,1,shirt2);
  p(c,gx+3,gy+11,6,2,lum(shirt,20));

  if(state==='typing') {
    const af = sub%8<4;
    p(c,gx-1,gy+13,3,3,shirt2); p(c,gx+10,gy+13,3,3,shirt2);
    p(c,gx+0, gy+16+(af?1:0),2,2,skin);
    p(c,gx+10,gy+16+(af?0:1),2,2,skin);
  } else if(state==='stretching') {
    const st=Math.min(sub,40);
    const ext=Math.floor(st/8);
    p(c,gx-2-ext,gy+12,4+ext,2,shirt2);
    p(c,gx+10,   gy+12,4+ext,2,shirt2);
    p(c,gx-3-ext,gy+11,2,2,skin);
    p(c,gx+12+ext,gy+11,2,2,skin);
  } else if(state==='thinking') {
    p(c,gx-1,gy+13,3,3,shirt2); p(c,gx+10,gy+13,3,3,shirt2);
    p(c,gx+1,gy+11,2,4,shirt);
    p(c,gx+2,gy+9,2,2,skin);
  } else if(state==='drinking') {
    p(c,gx-1,gy+13,3,3,shirt2); p(c,gx+10,gy+13,3,4,shirt2);
    p(c,gx+11,gy+10,2,4,skin);
    p(c,gx+12,gy+9,4,3,char.nc);
    p(c,gx+13,gy+10,2,2,lum(char.nc,-60));
  } else {
    p(c,gx-1,gy+12,3,6,shirt2); p(c,gx+10,gy+12,3,6,shirt2);
    p(c,gx-1,gy+18,2,2,skin);   p(c,gx+11,gy+18,2,2,skin);
  }

  if(char.type==='fire')  { p(c,gx+10,gy+5,1,2,char.nc); p(c,gx+10,gy+4,1,1,lum(char.nc,40)); }
  else if(char.type==='water') { p(c,gx+5,gy+11,2,3,'#4488FF'); p(c,gx+6,gy+13,1,1,'#2266CC'); }
  else if(char.type==='grass') { p(c,gx+9,gy+3,3,2,'#44AA44'); p(c,gx+10,gy+2,2,1,'#66CC66'); }
  else if(char.type==='electric') {
    p(c,gx+5,gy+13,1,4,'#FFEE00'); p(c,gx+6,gy+15,1,4,'#FFEE00'); p(c,gx+5,gy+15,2,1,'#FFEE00');
  } else if(char.type==='psychic') {
    p(c,gx+5,gy+13,2,1,char.nc); p(c,gx+4,gy+14,4,1,char.nc);
    p(c,gx+5,gy+15,2,1,char.nc); p(c,gx+4,gy+13,1,1,lum(char.nc,30));
  }
}

function drawBubble(c, char, f) {
  if (globalMode !== 'active') return;
  const visible = Math.floor((f+char.animOff)/240)%2===0;
  if(!visible) return;
  const gx = char.deskX+2, gy = DESK_TOP-36;
  const taskArr = TASKS[char.type][globalMode];
  const taskIdx = Math.floor((f+char.animOff)/480) % taskArr.length;
  const progress = ((f+char.animOff)%240)/240;

  p(c,gx,  gy,   50,14,'#00000088');
  p(c,gx,  gy,   50,1, '#FFFFFF33');
  p(c,gx,  gy,   1, 14,'#FFFFFF22');
  p(c,gx+1,gy+1, 3, 3, char.nc);
  p(c,gx+5,gy+2, 38,1, '#FFFFFF66');
  p(c,gx+5,gy+4, 28,1, '#FFFFFF44');
  p(c,gx+1,gy+9, 48,3, '#222222');
  p(c,gx+1,gy+9, Math.floor(48*progress),3, char.nc);
  p(c,gx+1,gy+9, Math.floor(48*progress),1, lum(char.nc,40));
  p(c,gx+23,gy+13,2,2,'#00000088');
  p(c,gx+24,gy+15,1,1,'#00000066');
}

function drawGlow(c, char, f) {
  const gx = char.deskX + 17;
  const gy = DESK_TOP - 20;
  const glowAmt = 0.06 + Math.sin(f*0.05)*0.02;
  c.fillStyle = GLOW[char.type] + Math.round(glowAmt*255).toString(16).padStart(2,'0');
  c.fillRect((gx)*S, (gy-2)*S, 18*S, 14*S);
  c.fillStyle = GLOW[char.type] + '11';
  c.fillRect((char.deskX+8)*S, (DESK_TOP+24)*S, 34*S, 20*S);
}

function drawNameTag(c, char) {
  const gx = char.deskX + 16, gy = DESK_TOP + 28;
  p(c,gx,gy,20,8,'#000000AA');
  p(c,gx,gy,3,8,char.nc);
  p(c,gx,gy,20,1,'#FFFFFF22');
  c.save();
  c.font = '6px "Press Start 2P"';
  c.fillStyle = char.nc;
  c.textBaseline = 'middle';
  c.fillText(char.name, (gx+4)*S, (gy+4)*S);
  c.restore();
}

function drawNotifications(c, f) {
  if (globalMode !== 'active') return;
  CHARS.forEach(function(char){
    const phase=(f+char.animOff*3)%600;
    if(phase<30){
      const blink=Math.floor(phase/5)%2;
      if(blink){
        p(c,char.deskX+46,DESK_TOP-22,5,5,'#FF2222');
        p(c,char.deskX+47,DESK_TOP-21,3,3,'#FF6666');
        p(c,char.deskX+48,DESK_TOP-20,1,1,'#FFFFFF');
      }
    }
  });
}

drawBG();

function render(ts) {
  if(ts - lastTime < 32) { requestAnimationFrame(render); return; }
  lastTime = ts;

  ctx.drawImage(bgCvs, 0, 0);
  drawWindowSky(ctx);
  drawWindowAnim(ctx, frame);
  drawClock(ctx, frame);
  drawPoster(ctx);
  drawSteam(ctx, frame);

  if(Math.random()<0.002){
    ctx.fillStyle='rgba(255,255,200,0.04)';
    ctx.fillRect(0,0,900,540);
  }

  CHARS.forEach(function(char){
    const st = getState(char, frame);
    const state = st.state, sub = st.sub;
    drawChair(ctx, char.deskX, DESK_TOP - 8);
    drawChar(ctx, char, state, sub);
    drawDesk(ctx, char.deskX);
    const mx = char.deskX + 17;
    const my = DESK_TOP - 20;
    drawMonitorShell(ctx, mx, my);
    drawMonitorScreen(ctx, char, frame);
    drawGlow(ctx, char, frame);
    p(ctx,char.deskX+14,DESK_TOP+3,22,2,'#3A3A4A');
    p(ctx,char.deskX+14,DESK_TOP+3,22,1,'#4A4A5A');
    p(ctx,char.deskX+37,DESK_TOP+2,5,4,'#3A3A4A');
    p(ctx,char.deskX+38,DESK_TOP+2,3,1,'#4A4A5A');
    p(ctx,char.deskX+39,DESK_TOP+3,1,2,'#222233');
    drawDeskItems(ctx, char, frame);
    drawBubble(ctx, char, frame);
    drawNameTag(ctx, char);
  });

  drawNotifications(ctx, frame);

  const vgrd = ctx.createRadialGradient(450,270,100,450,270,500);
  vgrd.addColorStop(0,'rgba(0,0,0,0)');
  vgrd.addColorStop(1,'rgba(0,0,0,0.45)');
  ctx.fillStyle = vgrd;
  ctx.fillRect(0,0,900,540);

  ctx.fillStyle='rgba(0,0,0,0.06)';
  for(let y=0;y<540;y+=4) ctx.fillRect(0,y,900,2);

  frame++;
  requestAnimationFrame(render);
}

requestAnimationFrame(render);
</script>
</body>
</html>`;
}

module.exports = { activate };
