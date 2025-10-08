/* Finger Maze – canvas corridor hit-test using isPointInStroke
   - Draws a glowing corridor path
   - Player must press/hold within START, stay inside stroke, and reach END
   - Leaving stroke or lifting finger resets progress
*/
(() => {
  const canvas = document.getElementById('maze');
  const ctx = canvas.getContext('2d', { alpha: true });

  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetBtn');
  const statusEl = document.getElementById('status');
  const successDlg = document.getElementById('successDlg');
  const closeBtn = document.getElementById('closeBtn');
  const copyBtn = document.getElementById('copyBtn');
  const CODE = 'THIRTEENWHISPERS';

  const laneWidth = 36; // base lane width (scales with DPR)
  let DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

  // “S”-style corridor path (normalized coordinates 0..1)
  const points = [
    [0.10, 0.85], [0.22, 0.85], [0.35, 0.80], [0.45, 0.70],
    [0.55, 0.60], [0.62, 0.50], [0.55, 0.40], [0.45, 0.32],
    [0.35, 0.28], [0.25, 0.24], [0.20, 0.18], [0.25, 0.12],
    [0.35, 0.10], [0.50, 0.12], [0.65, 0.18], [0.78, 0.28],
    [0.86, 0.40], [0.88, 0.52], [0.84, 0.64], [0.74, 0.74],
    [0.60, 0.80], [0.48, 0.84], [0.34, 0.88], [0.22, 0.90],
    [0.12, 0.92], [0.08, 0.94], [0.06, 0.95]
  ];

  const startPos = { x: 0.10, y: 0.85, r: 22 };
  const endPos   = { x: 0.90, y: 0.52, r: 24 };

  let scaleX = 1, scaleY = 1, strokePx = 1;

  function resizeCanvas() {
    const cssWidth = canvas.clientWidth;
    const cssHeight = cssWidth * (canvas.height / canvas.width);
    canvas.style.height = cssHeight + 'px';

    const w = Math.floor(cssWidth * DPR);
    const h = Math.floor(cssHeight * DPR);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
    }
    scaleX = canvas.width;
    scaleY = canvas.height;
    strokePx = Math.max(18 * DPR, laneWidth * DPR);

    buildPath();
    draw();
  }

  const corridor = new Path2D();
  function buildPath() {
    // rebuild the path at current scale
    const [x0, y0] = toPix(points[0]);
    corridor.moveTo(x0, y0);
    for (let i = 1; i < points.length; i++) {
      const [x, y] = toPix(points[i]);
      corridor.lineTo(x, y);
    }
  }

  function toPix([nx, ny]) { return [nx * scaleX, ny * scaleY]; }
  function nToPix(nx, ny) { return [nx * scaleX, ny * scaleY]; }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#0a0e14'); g.addColorStop(1, '#0a0c11');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0e1a1f';
    ctx.lineWidth = strokePx + 14 * DPR;
    ctx.globalAlpha = 0.9;
    ctx.stroke(corridor);
    ctx.restore();
  }

  function drawCorridor() {
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(112, 240, 255, 0.6)';
    ctx.shadowBlur = 18 * DPR;
    ctx.strokeStyle = '#70f0ff';
    ctx.lineWidth = strokePx;
    ctx.stroke(corridor);

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(2, strokePx * 0.15);
    ctx.stroke(corridor);
    ctx.restore();
  }

  function drawMarkers() {
    const [sx, sy] = nToPix(startPos.x, startPos.y);
    const [ex, ey] = nToPix(endPos.x, endPos.y);
    const sr = startPos.r * DPR;
    const er = endPos.r * DPR;
    circle(sx, sy, sr, '#39d98a', 'START');
    circle(ex, ey, er, '#ffae00', 'END');
  }

  function circle(x, y, r, color, label) {
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = '#0b0f15';
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(3, 3 * DPR);
    ctx.shadowColor = color; ctx.shadowBlur = 14 * DPR;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#cfd7e6';
    ctx.font = `${Math.max(12, 12*DPR)}px Inter, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y);
    ctx.restore();
  }

  function drawTrail() {
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#a6ffbc'; ctx.globalAlpha = 0.85;
    ctx.lineWidth = Math.max(4, 4 * DPR);
    ctx.beginPath();
    for (let i = 0; i < trail.length; i++) {
      const p = trail[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawCorridor();
    drawMarkers();
    if (trail.length) drawTrail();
  }

  // Game state
  let playing = false;
  let startedInside = false;
  let reachedEnd = false;
  let trail = [];

  function reset(hard = false) {
    if (hard) trail = [];
    playing = false; startedInside = false; reachedEnd = false;
    statusEl.textContent = 'Reset. Hold to start inside the START circle.';
    draw();
  }

  function eventPoint(evt) {
    const rect = canvas.getBoundingClientRect();
    const clientX = (evt.touches?.[0]?.clientX ?? evt.clientX);
    const clientY = (evt.touches?.[0]?.clientY ?? evt.clientY);
    return { x: (clientX - rect.left) * DPR, y: (clientY - rect.top) * DPR };
  }

  function insideStart(p) {
    const [sx, sy] = nToPix(startPos.x, startPos.y);
    const r = startPos.r * DPR;
    const dx = p.x - sx, dy = p.y - sy;
    return dx*dx + dy*dy <= r*r;
  }

  function insideEnd(p) {
    const [ex, ey] = nToPix(endPos.x, endPos.y);
    const r = endPos.r * DPR;
    const dx = p.x - ex, dy = p.y - ey;
    return dx*dx + dy*dy <= r*r;
  }

  function insideLane(p) {
    ctx.save(); ctx.lineWidth = strokePx;
    const ok = ctx.isPointInStroke(corridor, p.x, p.y);
    ctx.restore();
    return ok;
  }

  function startFromPoint(p) {
    if (!insideStart(p)) {
      flashStatus('Touch & hold inside the START circle to begin.', 'warn');
      return;
    }
    playing = true; startedInside = true;
    trail = [p];
    statusEl.textContent = 'Go! Stay inside the lane…';
    draw();
  }

  function stepToPoint(p) {
    if (!playing) return;
    if (!insideLane(p)) {
      flashStatus('❌ Oops—left the lane. Try again.', 'bad');
      reset(); return;
    }
    trail.push(p); draw();
    if (insideEnd(p)) {
      reachedEnd = true; playing = false;
      statusEl.textContent = 'Solved!';
      openSuccess();
    }
  }

  function liftEnd() {
    if (playing) {
      flashStatus('You lifted your finger. Restart from START.', 'bad');
      reset();
    }
  }

  function flashStatus(msg, tone='info') {
    statusEl.textContent = msg;
    statusEl.style.color = tone === 'bad' ? '#ff797b'
                         : tone === 'warn' ? '#ffae00'
                         : '#9aa0ad';
    setTimeout(() => { statusEl.style.color = '#9aa0ad'; }, 1200);
  }

  function openSuccess() {
    document.getElementById('codeBox').textContent = CODE;
    if (typeof successDlg.showModal === 'function') successDlg.showModal();
    else alert(`Passcode: ${CODE}`);
  }

  // Controls
  startBtn.addEventListener('pointerdown', () => {
    flashStatus('Press & hold on the START circle in the maze.', 'info');
  });
  resetBtn.addEventListener('click', () => reset(true));
  closeBtn.addEventListener('click', () => successDlg.close());
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(CODE);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => (copyBtn.textContent = 'Copy code'), 1000);
    } catch {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(document.getElementById('codeBox'));
      sel.removeAllRanges(); sel.addRange(range);
      document.execCommand('copy'); sel.removeAllRanges();
      copyBtn.textContent = 'Copied!';
      setTimeout(() => (copyBtn.textContent = 'Copy code'), 1000);
    }
  });

  // Pointer handling on canvas
  canvas.addEventListener('pointerdown', (evt) => {
    canvas.setPointerCapture?.(evt.pointerId);
    startFromPoint(eventPoint(evt));
  });
  canvas.addEventListener('pointermove', (evt) => {
    if (startedInside) stepToPoint(eventPoint(evt));
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev =>
    canvas.addEventListener(ev, liftEnd)
  );

  // Init
  const ro = new ResizeObserver(resizeCanvas);
  ro.observe(canvas);
  resizeCanvas();
})();
