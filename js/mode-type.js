/* ============================================
   SIGNLY — Type Mode Controller
   Lazy-loads handwriting Google Fonts and
   renders typed text as a signature.
   ============================================ */

window.ModeType = (() => {
  let fontsLoaded = false;
  let currentFont = 'Pacifico';
  let currentFontSize = 64;
  let typeInput, fontPicker, fontSizeSlider, fontSizeValue;

  const FONTS = [
    'Pacifico',
    'Dancing Script',
    'Caveat',
    'Great Vibes',
    'Sacramento',
    'Satisfy',
  ];

  function init() {
    typeInput = document.getElementById('typeInput');
    fontPicker = document.getElementById('fontPicker');
    fontSizeSlider = document.getElementById('fontSize');
    fontSizeValue = document.getElementById('fontSizeValue');

    // Text input handler
    typeInput.addEventListener('input', debounce(renderSignature, 100));

    // Font picker buttons
    fontPicker.querySelectorAll('.font-option').forEach(btn => {
      btn.addEventListener('click', () => {
        // Update active state
        fontPicker.querySelector('.font-option--active')?.classList.remove('font-option--active');
        fontPicker.querySelectorAll('.font-option').forEach(b => b.setAttribute('aria-checked', 'false'));

        btn.classList.add('font-option--active');
        btn.setAttribute('aria-checked', 'true');

        currentFont = btn.dataset.font;
        renderSignature();
      });
    });

    // Font size slider (optional)
    if (fontSizeSlider) {
      fontSizeSlider.addEventListener('input', () => {
        currentFontSize = parseInt(fontSizeSlider.value);
        if (fontSizeValue) fontSizeValue.textContent = currentFontSize + 'px';
        renderSignature();
      });
    }
  }

  function activate() {
    SignlyCanvas.setDrawingEnabled(false);

    // Show type UI
    document.getElementById('typeInputWrap')?.classList.add('type-input-wrap--visible');
    document.getElementById('fontPicker')?.classList.add('font-picker--visible');
    const sizeGroup = document.getElementById('fontSizeGroup');
    if (sizeGroup) sizeGroup.style.display = '';
    document.getElementById('uploadZone')?.classList.remove('upload-zone--visible');
    document.getElementById('canvasGuide').style.display = 'none';

    typeInput.focus();
    renderSignature();
  }

  function deactivate() {
    document.getElementById('typeInputWrap')?.classList.remove('type-input-wrap--visible');
    document.getElementById('fontPicker')?.classList.remove('font-picker--visible');
    const sizeGroup = document.getElementById('fontSizeGroup');
    if (sizeGroup) sizeGroup.style.display = 'none';
  }

  function clear() {
    if (typeInput) {
      typeInput.value = '';
      SignlyCanvas.clear();
    }
  }



  function renderSignature() {
    const text = typeInput?.value?.trim();
    if (!text) {
      SignlyCanvas.clear();
      return;
    }

    // Ensure font is loaded before rendering
    if (document.fonts) {
      document.fonts.ready.then(() => {
        SignlyCanvas.renderText(text, currentFont, currentFontSize, null);
      });
    } else {
      SignlyCanvas.renderText(text, currentFont, currentFontSize, null);
    }
  }

  function debounce(fn, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }

  return { init, activate, deactivate, renderSignature, clear };
})();
