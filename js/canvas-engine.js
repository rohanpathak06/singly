/* ============================================
   SIGNLY — Canvas Drawing Engine
   Pressure-sensitive stroke rendering using
   a perfect-freehand-inspired algorithm.
   ============================================ */

window.SignlyCanvas = (() => {
  // ---- State ----
  let canvas, ctx;
  let offscreenCanvas, offscreenCtx;
  let isDrawing = false;
  let currentPoints = [];
  let strokes = []; // Array of completed stroke data
  let undoStack = []; // ImageData snapshots for undo
  let currentColor = '#000000';
  let strokeWeightMultiplier = 3;
  let animFrameId = null;
  let dpr = 1;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let hasActiveContent = false;

  // ---- Stroke Options ----
  const STROKE_OPTIONS = {
    size: 16,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: true,
    start: { taper: 0, cap: true },
    end: { taper: 0, cap: true },
  };

  // ---- Init ----
  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d', { willReadFrequently: true });

    offscreenCanvas = document.createElement('canvas');
    offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });

    resize();
    bindEvents();

    window.addEventListener('resize', debounce(resize, 200));
    return { canvas, ctx };
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvasWidth = rect.width;
    canvasHeight = rect.height || parseInt(getComputedStyle(canvas).height);

    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';

    offscreenCanvas.width = canvas.width;
    offscreenCanvas.height = canvas.height;

    ctx.scale(dpr, dpr);
    offscreenCtx.scale(dpr, dpr);

    redrawAll();
  }

  // ---- Event Binding ----
  function bindEvents() {
    canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
    canvas.addEventListener('pointermove', onPointerMove, { passive: false });
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);

    // Prevent touch scroll on canvas
    canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
    canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    });
  }

  // ---- Pointer Event Handlers ----
  function onPointerDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    isDrawing = true;
    currentPoints = [];

    // Save state for undo before starting a new stroke
    saveUndoState();

    const point = getPoint(e);
    currentPoints.push(point);

    // Start render loop
    if (animFrameId) cancelAnimationFrame(animFrameId);
    renderLoop();
  }

  function onPointerMove(e) {
    if (!isDrawing) return;
    e.preventDefault();

    const point = getPoint(e);
    currentPoints.push(point);
  }

  function onPointerUp(e) {
    if (!isDrawing) return;
    isDrawing = false;

    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }

    if (currentPoints.length > 1) {
      // Commit stroke to offscreen canvas and store data
      const strokeData = {
        points: [...currentPoints],
        color: currentColor,
        weight: strokeWeightMultiplier,
      };
      strokes.push(strokeData);
      drawStrokeToCtx(offscreenCtx, strokeData);
    }

    currentPoints = [];
    compositeToScreen();

    hasActiveContent = true;

    // Notify listeners
    if (typeof SignlyCanvas.onStrokeEnd === 'function') {
      SignlyCanvas.onStrokeEnd(1);
    }
  }

  function getPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return [
      e.clientX - rect.left,
      e.clientY - rect.top,
      e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5,
    ];
  }

  // ---- Render Loop ----
  function renderLoop() {
    compositeToScreen();

    if (currentPoints.length > 1) {
      drawCurrentStroke();
    }

    if (isDrawing) {
      animFrameId = requestAnimationFrame(renderLoop);
    }
  }

  function compositeToScreen() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(offscreenCanvas, 0, 0, canvasWidth, canvasHeight);
  }

  function drawCurrentStroke() {
    if (currentPoints.length < 2) return;

    const strokeData = {
      points: currentPoints,
      color: currentColor,
      weight: strokeWeightMultiplier,
    };

    drawStrokeToCtx(ctx, strokeData);
  }

  // ---- Stroke Rendering (Perfect Freehand Inspired) ----
  function drawStrokeToCtx(targetCtx, strokeData) {
    const { points, color, weight } = strokeData;
    if (points.length < 2) return;

    const outline = getStrokeOutline(points, weight);

    targetCtx.save();
    targetCtx.fillStyle = color;
    targetCtx.beginPath();

    // Draw the polygon outline
    const [firstX, firstY] = outline[0];
    targetCtx.moveTo(firstX, firstY);

    for (let i = 1; i < outline.length; i++) {
      const [x, y] = outline[i];
      targetCtx.lineTo(x, y);
    }

    targetCtx.closePath();
    targetCtx.fill();
    targetCtx.restore();
  }

  /**
   * Generate a stroke polygon outline from input points.
   * Inspired by Steve Ruiz's perfect-freehand algorithm.
   * Returns an array of [x, y] points forming the outline polygon.
   */
  function getStrokeOutline(inputPoints, weight) {
    if (inputPoints.length < 2) return [];

    const size = weight * 3;
    const minWidth = size * 0.3;
    const maxWidth = size;

    // Smooth the input points
    const smoothed = smoothPoints(inputPoints);

    // Calculate outline
    const leftSide = [];
    const rightSide = [];

    for (let i = 0; i < smoothed.length; i++) {
      const [x, y, pressure] = smoothed[i];

      // Determine width based on pressure and velocity
      let velocity = 0;
      if (i > 0) {
        const [px, py] = smoothed[i - 1];
        const dx = x - px;
        const dy = y - py;
        velocity = Math.sqrt(dx * dx + dy * dy);
      }

      // Simulate pressure from velocity if not available
      let effectivePressure = pressure;
      if (pressure === 0.5 && STROKE_OPTIONS.simulatePressure) {
        // Fast motion = thinner, slow motion = thicker
        const velocityScale = Math.min(velocity / 10, 1);
        effectivePressure = 1 - velocityScale * 0.6;
      }

      const width = lerp(minWidth, maxWidth, effectivePressure) / 2;

      // Get perpendicular direction
      let angle;
      if (i === 0) {
        const [nx, ny] = smoothed[1];
        angle = Math.atan2(ny - y, nx - x) + Math.PI / 2;
      } else if (i === smoothed.length - 1) {
        const [px, py] = smoothed[i - 1];
        angle = Math.atan2(y - py, x - px) + Math.PI / 2;
      } else {
        const [px, py] = smoothed[i - 1];
        const [nx, ny] = smoothed[i + 1];
        angle = Math.atan2(ny - py, nx - px) + Math.PI / 2;
      }

      const cos = Math.cos(angle) * width;
      const sin = Math.sin(angle) * width;

      leftSide.push([x - cos, y - sin]);
      rightSide.push([x + cos, y + sin]);
    }

    // Add rounded caps at start and end
    const startCap = generateCap(smoothed[0], smoothed[1], lerp(minWidth, maxWidth, smoothed[0][2]) / 2, 'start');
    const endCap = generateCap(smoothed[smoothed.length - 1], smoothed[smoothed.length - 2], lerp(minWidth, maxWidth, smoothed[smoothed.length - 1][2]) / 2, 'end');

    // Combine: left side → end cap → right side (reversed) → start cap
    return [...leftSide, ...endCap, ...rightSide.reverse(), ...startCap];
  }

  function generateCap(point, adjacentPoint, radius, type) {
    const [x, y] = point;
    const [ax, ay] = adjacentPoint;
    const angle = Math.atan2(y - ay, x - ax);
    const steps = 8;
    const cap = [];

    const startAngle = type === 'end' ? angle - Math.PI / 2 : angle + Math.PI / 2;
    const endAngle = type === 'end' ? angle + Math.PI / 2 : angle - Math.PI / 2;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = lerpAngle(startAngle, endAngle, t);
      cap.push([x + Math.cos(a) * radius, y + Math.sin(a) * radius]);
    }

    return cap;
  }

  // ---- Smoothing (Catmull-Rom to Bezier) ----
  function smoothPoints(points) {
    if (points.length < 3) return points;

    const smoothed = [points[0]];

    for (let i = 1; i < points.length - 1; i++) {
      const [px, py, pp] = points[i - 1];
      const [cx, cy, cp] = points[i];
      const [nx, ny, np] = points[i + 1];

      const smoothFactor = STROKE_OPTIONS.smoothing;
      const sx = cx + (nx - px) * 0.1 * smoothFactor;
      const sy = cy + (ny - py) * 0.1 * smoothFactor;

      smoothed.push([
        lerp(cx, sx, smoothFactor),
        lerp(cy, sy, smoothFactor),
        cp
      ]);
    }

    smoothed.push(points[points.length - 1]);

    // Streamline: interpolate additional points for smoother curves
    if (points.length > 4 && STROKE_OPTIONS.streamline > 0) {
      return streamline(smoothed, STROKE_OPTIONS.streamline);
    }

    return smoothed;
  }

  function streamline(points, factor) {
    const result = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const [px, py, pp] = result[result.length - 1];
      const [cx, cy, cp] = points[i];
      result.push([
        lerp(px, cx, 1 - factor),
        lerp(py, cy, 1 - factor),
        lerp(pp, cp, 1 - factor),
      ]);
    }
    return result;
  }

  // ---- Undo ----
  function saveUndoState() {
    // Store current offscreen image data
    const imageData = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    undoStack.push({
      imageData,
      strokeCount: strokes.length,
    });
    // Keep max 30 undo levels
    if (undoStack.length > 30) undoStack.shift();
  }

  function undo() {
    if (undoStack.length === 0) return;

    const state = undoStack.pop();
    offscreenCtx.putImageData(state.imageData, 0, 0);
    strokes.length = state.strokeCount;
    compositeToScreen();

    hasActiveContent = strokes.length > 0;

    if (typeof SignlyCanvas.onStrokeEnd === 'function') {
      SignlyCanvas.onStrokeEnd(strokes.length);
    }
  }

  // ---- Clear ----
  function clear() {
    if (strokes.length === 0) return;

    // Save undo state before clearing
    saveUndoState();

    strokes = [];
    offscreenCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    compositeToScreen();
    hasActiveContent = false;

    // Trigger clear animation
    canvas.classList.add('canvas-clearing');
    setTimeout(() => canvas.classList.remove('canvas-clearing'), 400);

    if (typeof SignlyCanvas.onStrokeEnd === 'function') {
      SignlyCanvas.onStrokeEnd(0);
    }
  }

  // ---- Redraw all strokes ----
  function redrawAll() {
    offscreenCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    for (const stroke of strokes) {
      drawStrokeToCtx(offscreenCtx, stroke);
    }
    compositeToScreen();
  }

  // ---- Render text to canvas (type mode) ----
  function renderText(text, fontFamily, fontSize, color) {
    clear();
    strokes = []; // Reset strokes for type mode
    undoStack = [];

    offscreenCtx.save();
    offscreenCtx.font = `${fontSize}px '${fontFamily}'`;
    offscreenCtx.fillStyle = color || currentColor;
    offscreenCtx.textAlign = 'center';
    offscreenCtx.textBaseline = 'middle';

    const x = canvasWidth / 2;
    const y = canvasHeight / 2;

    offscreenCtx.fillText(text, x, y);
    offscreenCtx.restore();

    compositeToScreen();
    hasActiveContent = text.length > 0;

    // Mark as having content
    if (typeof SignlyCanvas.onStrokeEnd === 'function') {
      SignlyCanvas.onStrokeEnd(text.length > 0 ? 1 : 0);
    }
  }

  // ---- Render uploaded image ----
  function renderImage(imgElement) {
    clear();
    strokes = [];
    undoStack = [];

    // Scale image to fit canvas
    const scale = Math.min(
      (canvasWidth * 0.9) / imgElement.width,
      (canvasHeight * 0.9) / imgElement.height
    );
    const w = imgElement.width * scale;
    const h = imgElement.height * scale;
    const x = (canvasWidth - w) / 2;
    const y = (canvasHeight - h) / 2;

    offscreenCtx.drawImage(imgElement, x, y, w, h);

    // Remove white background
    removeWhiteBackground(offscreenCtx, offscreenCanvas.width, offscreenCanvas.height);

    compositeToScreen();
    hasActiveContent = true;

    if (typeof SignlyCanvas.onStrokeEnd === 'function') {
      SignlyCanvas.onStrokeEnd(1);
    }
  }

  // ---- White Background Removal ----
  function removeWhiteBackground(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const threshold = 240;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      if (r > threshold && g > threshold && b > threshold) {
        data[i + 3] = 0; // Set alpha to 0
      } else {
        // Edge feathering: partial transparency for near-white pixels
        const luminance = (r + g + b) / 3;
        if (luminance > threshold - 30) {
          const alphaMod = 1 - (luminance - (threshold - 30)) / 30;
          data[i + 3] = Math.round(data[i + 3] * Math.max(0, Math.min(1, alphaMod)));
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  // ---- Export Helpers ----
  function getExportCanvas(whiteBackground) {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = offscreenCanvas.width;
    exportCanvas.height = offscreenCanvas.height;
    const exportCtx = exportCanvas.getContext('2d');

    if (whiteBackground) {
      exportCtx.fillStyle = '#FFFFFF';
      exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    }

    exportCtx.drawImage(offscreenCanvas, 0, 0);
    return exportCanvas;
  }

  function toDataURL(whiteBackground) {
    return getExportCanvas(whiteBackground).toDataURL('image/png');
  }

  function toBlob(whiteBackground) {
    return new Promise((resolve) => {
      getExportCanvas(whiteBackground).toBlob(resolve, 'image/png');
    });
  }

  function hasContent() {
    return hasActiveContent;
  }

  function getStrokes() {
    return strokes;
  }

  // ---- Setters ----
  function setColor(color) {
    currentColor = color;
  }

  function setStrokeWeight(weight) {
    strokeWeightMultiplier = weight;
  }

  function setDrawingEnabled(enabled) {
    canvas.style.pointerEvents = enabled ? 'auto' : 'none';
    canvas.style.cursor = enabled ? 'crosshair' : 'default';
  }

  // ---- Utilities ----
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function lerpAngle(a, b, t) {
    return a + (b - a) * t;
  }

  function debounce(fn, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }

  // ---- Public API ----
  return {
    init,
    resize,
    undo,
    clear,
    renderText,
    renderImage,
    setColor,
    setStrokeWeight,
    setDrawingEnabled,
    toDataURL,
    toBlob,
    hasContent,
    getStrokes,
    onStrokeEnd: null,
  };
})();
