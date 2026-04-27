/* ============================================
   SIGNLY — Draw Mode Controller
   ============================================ */

window.ModeDraw = (() => {
  function activate() {
    SignlyCanvas.setDrawingEnabled(true);

    // Hide type and upload UI
    document.getElementById('typeInputWrap').classList.remove('type-input-wrap--visible');
    document.getElementById('fontPicker').classList.remove('font-picker--visible');
    document.getElementById('uploadZone').classList.remove('upload-zone--visible');
    document.getElementById('fontSizeGroup').style.display = 'none';

    // Show guide line
    document.getElementById('canvasGuide').style.display = 'block';
  }

  function deactivate() {
    SignlyCanvas.setDrawingEnabled(false);
    document.getElementById('canvasGuide').style.display = 'none';
  }

  return { activate, deactivate };
})();
