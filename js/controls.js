/* ============================================
   SIGNLY — Customisation Controls
   Manages color picker, stroke weight, canvas
   background, and mobile drawer.
   ============================================ */

window.SignlyControls = (() => {
  let currentColor = '#000000';

  function init() {
    initColorSwatches();
    initStrokeWeight();
    initCanvasBackground();
    initMobileDrawer();
  }

  // ---- Color Swatches ----
  function initColorSwatches() {
    const swatches = document.getElementById('colorSwatches');
    if (!swatches) return;

    const swatchButtons = swatches.querySelectorAll('.color-swatch[data-color]');

    swatchButtons.forEach(swatch => {
      swatch.addEventListener('click', () => {
        setActiveColor(swatch.dataset.color);
        updateSwatchUI(swatch);
      });
    });

    // Custom color picker
    const customColorInput = document.getElementById('customColor');
    if (customColorInput) {
      customColorInput.addEventListener('input', (e) => {
        currentColor = e.target.value;
        SignlyCanvas.setColor(currentColor);
        
        // If in type mode, re-render immediately
        if (typeof ModeType !== 'undefined' && ModeType.renderSignature) {
          ModeType.renderSignature();
        }

        // Remove active from all preset swatches
        swatchButtons.forEach(s => {
          s.classList.remove('color-swatch--active');
          s.setAttribute('aria-checked', 'false');
        });
      });
    }
  }

  function setActiveColor(color) {
    currentColor = color;
    SignlyCanvas.setColor(color);
    
    // If in type mode, re-render immediately
    if (typeof ModeType !== 'undefined' && ModeType.renderSignature) {
      ModeType.renderSignature();
    }
  }

  function updateSwatchUI(activeSwatch) {
    const all = document.querySelectorAll('#colorSwatches .color-swatch[data-color]');
    all.forEach(s => {
      s.classList.remove('color-swatch--active');
      s.setAttribute('aria-checked', 'false');
    });
    activeSwatch.classList.add('color-swatch--active');
    activeSwatch.setAttribute('aria-checked', 'true');
  }

  // ---- Stroke Weight ----
  function initStrokeWeight() {
    const slider = document.getElementById('strokeWeight');
    const valueDisplay = document.getElementById('strokeWeightValue');
    if (!slider) return;

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      if (valueDisplay) valueDisplay.textContent = val.toFixed(1);
      SignlyCanvas.setStrokeWeight(val);
    });
  }

  // ---- Canvas Background ----
  function initCanvasBackground() {
    const whiteExport = document.getElementById('whiteExport');
    const canvasWrap = document.getElementById('canvasWrap');

    if (whiteExport && canvasWrap) {
      whiteExport.addEventListener('change', () => {
        if (whiteExport.checked) {
          canvasWrap.classList.add('canvas-wrap--white');
        } else {
          canvasWrap.classList.remove('canvas-wrap--white');
        }
      });
    }
  }



  // ---- Mobile Drawer ----
  function initMobileDrawer() {
    const drawer = document.getElementById('mobileDrawer');
    const handle = document.getElementById('drawerHandle');
    const drawerControls = document.getElementById('drawerControls');

    if (!drawer || !handle || !drawerControls) return;

    // Clone desktop controls into mobile drawer
    const desktopPanel = document.getElementById('controlsPanel');
    if (desktopPanel) {
      const clone = desktopPanel.cloneNode(true);
      clone.removeAttribute('id');
      clone.classList.remove('controls-panel');
      clone.style.display = 'flex';
      clone.style.flexDirection = 'column';
      clone.style.gap = 'var(--space-4)';

      // Update IDs on cloned elements to avoid duplicates
      clone.querySelectorAll('[id]').forEach(el => {
        el.id = 'mobile-' + el.id;
      });

      drawerControls.appendChild(clone);

      // Re-bind events on mobile clones
      bindMobileControls(clone);
    }

    // Toggle drawer
    let isOpen = false;
    handle.addEventListener('click', () => {
      isOpen = !isOpen;
      drawer.classList.toggle('mobile-drawer--open', isOpen);
    });

    handle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        isOpen = !isOpen;
        drawer.classList.toggle('mobile-drawer--open', isOpen);
      }
    });

    // Swipe gesture for drawer
    let touchStartY = 0;
    drawer.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    drawer.addEventListener('touchmove', (e) => {
      const diff = touchStartY - e.touches[0].clientY;
      if (diff > 40 && !isOpen) {
        isOpen = true;
        drawer.classList.add('mobile-drawer--open');
      } else if (diff < -40 && isOpen) {
        isOpen = false;
        drawer.classList.remove('mobile-drawer--open');
      }
    }, { passive: true });
  }

  function bindMobileControls(container) {
    // Color swatches
    container.querySelectorAll('.color-swatch[data-color]').forEach(swatch => {
      swatch.addEventListener('click', () => {
        setActiveColor(swatch.dataset.color);
        // Update both desktop and mobile UI
        document.querySelectorAll('.color-swatch[data-color]').forEach(s => {
          s.classList.toggle('color-swatch--active', s.dataset.color === swatch.dataset.color);
        });
      });
    });

    // Stroke weight
    const mobileSlider = container.querySelector('[id*="strokeWeight"]');
    if (mobileSlider && mobileSlider.type === 'range') {
      mobileSlider.addEventListener('input', () => {
        const val = parseFloat(mobileSlider.value);
        SignlyCanvas.setStrokeWeight(val);
        // Sync desktop slider
        const desktopSlider = document.getElementById('strokeWeight');
        if (desktopSlider) desktopSlider.value = val;
        const desktopValue = document.getElementById('strokeWeightValue');
        if (desktopValue) desktopValue.textContent = val.toFixed(1);
      });
    }

    // Background toggles
    container.querySelectorAll('.bg-toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const bg = toggle.dataset.bg;
        const canvasWrap = document.getElementById('canvasWrap');
        canvasWrap.className = 'canvas-wrap';
        if (bg === 'white') canvasWrap.classList.add('canvas-wrap--white');
        else if (bg === 'gray') canvasWrap.classList.add('canvas-wrap--gray');
      });
    });
  }

  function getCurrentColor() {
    return currentColor;
  }

  return {
    init,
    getCurrentColor,
  };
})();
