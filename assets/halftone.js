// Live halftone of the photo in the canvas' data-src, with a dot-size slider.
(() => {
  const canvas = document.getElementById('halftone');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const slider = document.getElementById('dots');
  const out = document.getElementById('dots-out');
  const img = new Image();
  const sample = document.createElement('canvas');
  const sctx = sample.getContext('2d', { willReadFrequently: true });
  let ready = false;

  function draw() {
    if (!ready) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const step = +slider.value;
    const cols = Math.ceil(w / step), rows = Math.ceil(h / step);
    sample.width = cols; sample.height = rows;
    // cover-crop the photo into the grid
    const r = Math.max(cols / img.width, rows / img.height);
    const sw = cols / r, sh = rows / r;
    sctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, cols, rows);
    let px;
    try { px = sctx.getImageData(0, 0, cols, rows).data; }
    catch (e) { // opened from disk: the browser blocks reading pixels, so show the still instead
      canvas.hidden = true; document.querySelector('.tool .fallback').hidden = false;
      document.querySelector('.tool-ui').hidden = true; ready = false; return; }

    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--tool-ink').trim() || '#000';
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const lum = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
        const lift = Math.min(1, lum * 1.6);           // the photo is dark; lift it
        const rad = (1 - lift) * step * 0.62;
        if (rad < 0.4) continue;
        ctx.beginPath();
        ctx.arc(x * step + step / 2, y * step + step / 2, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  img.onload = () => { ready = true; draw(); };
  img.src = canvas.dataset.src;
  slider.addEventListener('input', () => { out.value = slider.value; draw(); });
  new ResizeObserver(draw).observe(canvas);
})();
