/* ============================================
   SIGNLY — Export System
   PNG download, clipboard copy, SVG export.
   ============================================ */

window.SignlyExport = (() => {
  function init() {
    const btnDownload = document.getElementById('btnDownload');
    const btnCopy = document.getElementById('btnCopy');
    const btnSvg = document.getElementById('btnSvg');

    btnDownload.addEventListener('click', downloadPNG);
    btnCopy.addEventListener('click', copyToClipboard);
    btnSvg.addEventListener('click', downloadSVG);
  }

  // ---- PNG Download ----
  function downloadPNG() {
    if (!SignlyCanvas.hasContent()) return;

    const whiteBackground = document.getElementById('whiteExport')?.checked || false;
    const dataURL = SignlyCanvas.toDataURL(whiteBackground);

    const link = document.createElement('a');
    link.download = 'signly-signature.png';
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Feedback
    flashButton('btnDownload', 'Downloaded!');
    SignlyApp.showToast('Signature downloaded as PNG', 'success');
  }

  // ---- Copy to Clipboard ----
  async function copyToClipboard() {
    if (!SignlyCanvas.hasContent()) return;

    const whiteBackground = document.getElementById('whiteExport')?.checked || false;

    try {
      if (navigator.clipboard && navigator.clipboard.write) {
        const blob = await SignlyCanvas.toBlob(whiteBackground);
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        flashButton('btnCopy', 'Copied!');
        SignlyApp.showToast('Signature copied to clipboard', 'success');
      } else {
        // Fallback: download instead
        downloadPNG();
        SignlyApp.showToast('Clipboard blocked — file downloaded instead', 'error');
      }
    } catch (err) {
      // Fallback
      downloadPNG();
      SignlyApp.showToast('Clipboard blocked — file downloaded instead', 'error');
    }
  }

  // ---- SVG Export ----
  function downloadSVG() {
    if (!SignlyCanvas.hasContent()) return;

    const strokes = SignlyCanvas.getStrokes();
    const canvas = document.getElementById('signatureCanvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;

    if (strokes.length === 0) {
      // If no stroke data (e.g. type or upload mode), rasterize to SVG as embedded image
      const dataURL = SignlyCanvas.toDataURL(false);
      svgContent += `  <image href="${dataURL}" width="${width}" height="${height}"/>\n`;
    } else {
      // Convert each stroke to SVG path
      for (const stroke of strokes) {
        const points = stroke.points;
        if (points.length < 2) continue;

        const pathData = pointsToSVGPath(points);
        svgContent += `  <path d="${pathData}" fill="${stroke.color}" stroke="none"/>\n`;
      }
    }

    svgContent += '</svg>';

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = 'signly-signature.svg';
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    flashButton('btnSvg', 'Exported!');
    SignlyApp.showToast('Signature downloaded as SVG', 'success');
  }

  function pointsToSVGPath(points) {
    if (points.length < 2) return '';

    // Generate outline polygon similar to canvas rendering
    const outline = generateOutline(points);
    if (outline.length === 0) return '';

    let d = `M ${outline[0][0].toFixed(2)} ${outline[0][1].toFixed(2)}`;
    for (let i = 1; i < outline.length; i++) {
      d += ` L ${outline[i][0].toFixed(2)} ${outline[i][1].toFixed(2)}`;
    }
    d += ' Z';
    return d;
  }

  function generateOutline(points) {
    if (points.length < 2) return [];

    const leftSide = [];
    const rightSide = [];

    for (let i = 0; i < points.length; i++) {
      const [x, y, pressure = 0.5] = points[i];
      const width = (pressure * 6 + 2) / 2;

      let angle;
      if (i === 0) {
        angle = Math.atan2(points[1][1] - y, points[1][0] - x) + Math.PI / 2;
      } else if (i === points.length - 1) {
        angle = Math.atan2(y - points[i-1][1], x - points[i-1][0]) + Math.PI / 2;
      } else {
        angle = Math.atan2(points[i+1][1] - points[i-1][1], points[i+1][0] - points[i-1][0]) + Math.PI / 2;
      }

      const cos = Math.cos(angle) * width;
      const sin = Math.sin(angle) * width;

      leftSide.push([x - cos, y - sin]);
      rightSide.push([x + cos, y + sin]);
    }

    return [...leftSide, ...rightSide.reverse()];
  }

  // ---- Button Flash Feedback ----
  function flashButton(btnId, text) {
    const btn = document.getElementById(btnId);
    if (!btn || btn.hasAttribute('data-flashing')) return;

    const originalHTML = btn.innerHTML;
    btn.setAttribute('data-flashing', 'true');
    btn.classList.add('btn--success');
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> ${text}`;

    setTimeout(() => {
      btn.classList.remove('btn--success');
      btn.innerHTML = originalHTML;
      btn.removeAttribute('data-flashing');
    }, 1800);
  }

  // ---- Enable/Disable Buttons ----
  function updateButtons(hasContent) {
    const btnDownload = document.getElementById('btnDownload');
    const btnCopy = document.getElementById('btnCopy');
    const btnSvg = document.getElementById('btnSvg');
    const btnUndo = document.getElementById('btnUndo');
    const downloadTooltip = document.getElementById('downloadTooltip');

    btnDownload.disabled = !hasContent;
    btnCopy.disabled = !hasContent;
    btnSvg.disabled = !hasContent;
    btnUndo.disabled = !hasContent;

    if (downloadTooltip) {
      downloadTooltip.textContent = hasContent ? 'Download transparent PNG' : 'Draw your signature first';
    }
  }

  return { init, updateButtons };
})();
