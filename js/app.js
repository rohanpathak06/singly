/* ============================================
   SIGNLY — Main Application Entry Point
   Initializes all modules and manages mode
   switching between Draw / Type / Upload.
   ============================================ */

window.SignlyApp = (() => {
  let currentMode = 'draw';
  const modes = {
    draw: ModeDraw,
    type: ModeType,
    upload: ModeUpload,
  };

  function init() {
    // Initialize canvas engine
    const canvas = document.getElementById('signatureCanvas');
    if (!canvas || !canvas.getContext) {
      // Canvas not supported
      document.getElementById('canvasCard').innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--color-text-secondary);">
          <p>Your browser does not support the Canvas element.</p>
          <p style="margin-top: 8px;">Please use a recent version of <a href="https://www.google.com/chrome/" style="color: var(--color-accent);">Chrome</a>, 
          <a href="https://www.mozilla.org/firefox/" style="color: var(--color-accent);">Firefox</a>, 
          <a href="https://www.apple.com/safari/" style="color: var(--color-accent);">Safari</a>, or 
          <a href="https://www.microsoft.com/edge" style="color: var(--color-accent);">Edge</a>.</p>
        </div>
      `;
      return;
    }

    SignlyCanvas.init(canvas);

    // Initialize modules
    ModeType.init();
    ModeUpload.init();
    SignlyControls.init();
    SignlyExport.init();

    // Listen for stroke changes
    SignlyCanvas.onStrokeEnd = (strokeCount) => {
      SignlyExport.updateButtons(strokeCount > 0);
    };

    // Initialize mode tabs
    initModeTabs();

    // Initialize undo/clear buttons
    initCanvasActions();

    // Set initial mode
    activateMode('draw');

    // Fade-in animations
    initFadeAnimations();

    console.log(
      '%c{ Signly } %cv1.0 — Your Signature. Zero Servers.',
      'color: #7C3AED; font-weight: bold; font-size: 14px;',
      'color: #9CA3AF; font-size: 12px;'
    );
  }

  // ---- Mode Tabs ----
  function initModeTabs() {
    const tabs = document.querySelectorAll('.mode-tab');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        if (mode === currentMode) return;
        activateMode(mode);
      });
    });
  }

  function activateMode(mode) {
    // Deactivate current
    if (modes[currentMode]?.deactivate) {
      modes[currentMode].deactivate();
    }

    currentMode = mode;

    // Update tab UI
    document.querySelectorAll('.mode-tab').forEach(tab => {
      const isActive = tab.dataset.mode === mode;
      tab.classList.toggle('mode-tab--active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Activate new mode
    if (modes[mode]?.activate) {
      modes[mode].activate();
    }
  }

  // ---- Canvas Action Buttons ----
  function initCanvasActions() {
    const btnUndo = document.getElementById('btnUndo');
    const btnClear = document.getElementById('btnClear');

    btnUndo.addEventListener('click', () => {
      SignlyCanvas.undo();
    });

    btnClear.addEventListener('click', () => {
      const mode = modes[currentMode];
      if (mode && typeof mode.clear === 'function') {
        mode.clear();
      } else {
        SignlyCanvas.clear();
      }
    });
  }
  // ---- Fade-in Animations ----
  function initFadeAnimations() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.fade-in').forEach(el => {
      el.style.opacity = '0';
      observer.observe(el);
    });
  }

  // ---- Toast Notification System ----
  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${type === 'success' ? 'var(--color-success)' : 'var(--color-error)'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${type === 'success'
          ? '<polyline points="20 6 9 17 4 12"/>'
          : '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'
        }
      </svg>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
      toast.style.animation = `toast-out var(--duration-normal) var(--ease-out) forwards`;
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ---- Public API ----
  return {
    init,
    showToast,
    activateMode,
  };
})();

// ---- Boot ----
document.addEventListener('DOMContentLoaded', SignlyApp.init);
