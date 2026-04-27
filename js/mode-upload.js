/* ============================================
   SIGNLY — Upload Mode Controller
   Handles drag-and-drop and file upload with
   automatic white background removal.
   ============================================ */

window.ModeUpload = (() => {
  let uploadZone, uploadInput, uploadError;
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/png', 'image/jpeg'];

  function init() {
    uploadZone = document.getElementById('uploadZone');
    uploadInput = document.getElementById('uploadInput');
    uploadError = document.getElementById('uploadError');

    // Click to upload
    uploadZone.addEventListener('click', () => uploadInput.click());
    uploadZone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        uploadInput.click();
      }
    });

    // File input change
    uploadInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      uploadInput.value = ''; // Reset so same file can be re-uploaded
    });

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadZone.classList.add('upload-zone--dragover');
    });

    uploadZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadZone.classList.remove('upload-zone--dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadZone.classList.remove('upload-zone--dragover');

      const file = e.dataTransfer?.files?.[0];
      if (file) handleFile(file);
    });
  }

  function activate() {
    SignlyCanvas.setDrawingEnabled(false);

    // Show upload zone
    document.getElementById('uploadZone')?.classList.add('upload-zone--visible');
    document.getElementById('typeInputWrap')?.classList.remove('type-input-wrap--visible');
    document.getElementById('fontPicker')?.classList.remove('font-picker--visible');
    const sizeGroup = document.getElementById('fontSizeGroup');
    if (sizeGroup) sizeGroup.style.display = 'none';
    document.getElementById('canvasGuide').style.display = 'none';
  }

  function deactivate() {
    document.getElementById('uploadZone').classList.remove('upload-zone--visible');
    hideError();
  }

  function handleFile(file) {
    hideError();

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      showError('Please upload a PNG or JPEG file.');
      return;
    }

    // Validate size
    if (file.size > MAX_SIZE) {
      showError('File too large. Max 5MB.');
      return;
    }

    // Load and process
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        SignlyCanvas.renderImage(img);
        // Hide upload zone and show canvas
        uploadZone.classList.remove('upload-zone--visible');

        if (typeof SignlyApp !== 'undefined' && SignlyApp.showToast) {
          SignlyApp.showToast('Image uploaded — white background removed', 'success');
        }
      };
      img.onerror = () => {
        showError('Could not load the image. Please try another file.');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function showError(msg) {
    uploadError.textContent = msg;
    uploadError.classList.add('upload-error--visible');
  }

  function hideError() {
    uploadError.textContent = '';
    uploadError.classList.remove('upload-error--visible');
  }

  return { init, activate, deactivate };
})();
