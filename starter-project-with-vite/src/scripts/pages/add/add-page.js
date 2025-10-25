import StoriesService from '../../data/api';
import CONFIG from '../../config';
import { showNotification } from '../../utils/index';
import StoryCreatePresenter from '../../presenters/add-story-presenter';

class StoryCreatePage {
  #map = null;
  #marker = null;
  #selectedLat = null;
  #selectedLng = null;
  #mediaStream = null;
  #capturedPhoto = null;
  #presenter = null;
  #pendingStories = [];
  #pendingListElement = null;

  constructor() {
    this.#presenter = new StoryCreatePresenter(this, StoriesService);
  }

  async render() {
    return `
      <section class="add-story-section">
        <div class="container">
          <h1>Buat Cerita Baru</h1>
          
          <form id="story-form" class="story-form" novalidate>
            <div class="form-group">
              <label for="description">Deskripsi Cerita</label>
              <textarea 
                id="description" 
                name="description" 
                rows="5" 
                required
                placeholder="Ceritakan pengalaman Anda..."
                aria-required="true"
              ></textarea>
              <span class="error-message" id="description-error"></span>
            </div>

            <div class="form-group">
              <label>Pilih Foto</label>
              <div class="photo-options">
                <div class="upload-section">
                  <label for="photo" class="file-label">
                    <span>Pilih dari File</span>
                    <input 
                      type="file" 
                      id="photo" 
                      name="photo" 
                      accept="image/*"
                      aria-label="Pilih file foto"
                    />
                  </label>
                  <button type="button" id="camera-btn" class="camera-btn">
                    Ambil dari Kamera
                  </button>
                </div>
                
                <div id="camera-container" class="camera-container" hidden>
                  <video id="camera-preview" autoplay playsinline></video>
                  <div class="camera-controls">
                    <button type="button" id="capture-btn" class="capture-btn">Ambil Foto</button>
                    <button type="button" id="close-camera-btn" class="close-camera-btn">Tutup Kamera</button>
                  </div>
                </div>

                <div id="preview-container" class="preview-container" hidden>
                  <img id="photo-preview" src="" alt="Preview foto yang dipilih" />
                  <button type="button" id="remove-photo-btn" class="remove-photo-btn" aria-label="Hapus foto">✕</button>
                </div>
              </div>
              <span class="error-message" id="photo-error"></span>
            </div>

            <div class="form-group">
              <label for="map-container">Pilih Lokasi di Peta</label>
              <p class="hint-text">Klik pada peta untuk menentukan lokasi cerita Anda</p>
              <div id="map-container" class="map-container" role="application" aria-label="Peta interaktif untuk memilih lokasi"></div>
              <div id="location-info" class="location-info"></div>
            </div>

            <div class="form-actions">
              <button type="submit" class="submit-btn" id="submit-btn">
                Kirim Cerita
              </button>
            </div>
          </form>

          <section class="pending-section">
            <h2>Draft Offline</h2>
            <p class="pending-hint">Cerita yang tersimpan saat offline akan muncul di sini.</p>
            <div id="pending-list" class="pending-list" role="list">
              <div class="empty-pending">Belum ada draft offline.</div>
            </div>
          </section>
        </div>
      </section>
    `;
  }

  async afterRender() {
    await this._initMap();
    this._setupForm();
    this._setupPhotoHandlers();
    this._setupCameraHandlers();
    this.#pendingListElement = document.getElementById('pending-list');
    await this._renderPendingStories();
    window.addEventListener('online', () => {
      this._renderPendingStories();
    });
  }

  async _initMap() {
    const L = window.L;
    const mapContainer = document.getElementById('map-container');

    if (this.#map) {
      this.#map.remove();
    }

    this.#map = L.map(mapContainer).setView([CONFIG.DEFAULT_LOCATION.lat, CONFIG.DEFAULT_LOCATION.lng], 13);

    const streetLayer = L.tileLayer(CONFIG.MAP_TILE_LAYERS.street.url, { attribution: CONFIG.MAP_TILE_LAYERS.street.attribution });

    const satelliteLayer = L.tileLayer(CONFIG.MAP_TILE_LAYERS.satellite.url, { attribution: CONFIG.MAP_TILE_LAYERS.satellite.attribution });

    streetLayer.addTo(this.#map);

    L.control
      .layers({
        'Peta Jalan': streetLayer,
        'Peta Satelit': satelliteLayer,
      })
      .addTo(this.#map);

    this.#map.on('click', (e) => {
      this._handleMapClick(e);
    });

    setTimeout(() => {
      this.#map.invalidateSize();
    }, 100);
  }

  _handleMapClick(e) {
    const L = window.L;
    const { lat, lng } = e.latlng;

    if (this.#marker) {
      this.#map.removeLayer(this.#marker);
    }

    const icon = L.divIcon({
      className: 'custom-marker',
      html: '<div class="marker-pin"></div>',
      iconSize: [30, 42],
      iconAnchor: [15, 42],
    });

    this.#marker = L.marker([lat, lng], { icon }).addTo(this.#map);
    this.#selectedLat = lat;
    this.#selectedLng = lng;

    const locationInfo = document.getElementById('location-info');
    locationInfo.innerHTML = `Lokasi terpilih: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  _setupForm() {
    const form = document.getElementById('story-form');
    this.resetSubmitState();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._handleSubmit();
    });
  }

  resetSubmitState() {
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Kirim Cerita';
    }
  }

  _setupPhotoHandlers() {
    const photoInput = document.getElementById('photo');
    const previewContainer = document.getElementById('preview-container');
    const preview = document.getElementById('photo-preview');
    const removeBtn = document.getElementById('remove-photo-btn');

    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > CONFIG.MAX_FILE_SIZE) {
          this._showError('photo-error', 'Ukuran file maksimal 1MB');
          photoInput.value = '';
          return;
        }

        if (!file.type.startsWith('image/')) {
          this._showError('photo-error', 'File harus berupa gambar');
          photoInput.value = '';
          return;
        }

        this._showError('photo-error', '');
        const reader = new FileReader();
        reader.onload = (event) => {
          preview.src = event.target.result;
          previewContainer.hidden = false;
          this.#capturedPhoto = null;
        };
        reader.readAsDataURL(file);
      }
    });

    removeBtn.addEventListener('click', () => {
      photoInput.value = '';
      preview.src = '';
      previewContainer.hidden = true;
      this.#capturedPhoto = null;
      this._showError('photo-error', '');
    });
  }

  _setupCameraHandlers() {
    const cameraBtn = document.getElementById('camera-btn');
    const captureBtn = document.getElementById('capture-btn');
    const closeCameraBtn = document.getElementById('close-camera-btn');
    const cameraContainer = document.getElementById('camera-container');
    const video = document.getElementById('camera-preview');

    cameraBtn.addEventListener('click', async () => {
      try {
        this.#mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        video.srcObject = this.#mediaStream;
        cameraContainer.hidden = false;
        cameraBtn.style.display = 'none';
      } catch (err) {
        showNotification('Gagal mengakses kamera: ' + err.message, 'error');
      }
    });

    captureBtn.addEventListener('click', () => {
      this._capturePhoto();
    });

    closeCameraBtn.addEventListener('click', () => {
      this._closeCamera();
    });
  }

  _capturePhoto() {
    const video = document.getElementById('camera-preview');
    const preview = document.getElementById('photo-preview');
    const previewContainer = document.getElementById('preview-container');
    const photoInput = document.getElementById('photo');

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob.size > CONFIG.MAX_FILE_SIZE) {
          showNotification('Ukuran foto terlalu besar, maksimal 1MB', 'error');
          return;
        }

        this.#capturedPhoto = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
        preview.src = canvas.toDataURL('image/jpeg');
        previewContainer.hidden = false;

        if (photoInput) {
          photoInput.value = '';
        }

        this._closeCamera();
      },
      'image/jpeg',
      0.8
    );
  }

  _closeCamera() {
    const cameraContainer = document.getElementById('camera-container');
    const cameraBtn = document.getElementById('camera-btn');
    const video = document.getElementById('camera-preview');

    if (this.#mediaStream) {
      this.#mediaStream.getTracks().forEach((track) => track.stop());
      this.#mediaStream = null;
    }

    video.srcObject = null;
    cameraContainer.hidden = true;
    cameraBtn.style.display = 'inline-block';
  }

  _showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
      errorElement.textContent = message;
    }
  }

  showSubmitting() {
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';
  }

  showSuccess(message) {
    this.resetSubmitState();
    showNotification(message, 'success');
    setTimeout(() => {
      window.location.hash = '#/';
    }, 1500);
  }

  showError(message) {
    this.resetSubmitState();
    showNotification(message, 'error');
  }

  async _handleSubmit() {
    const descField = document.getElementById('description');
    const photoInput = document.getElementById('photo');

    const photoFile = this.#capturedPhoto || photoInput.files[0];

    const descValidation = this.#presenter.validateDescription(descField.value);
    const photoValidation = this.#presenter.validatePhoto(photoFile);
    const locationValidation = this.#presenter.validateLocation(this.#selectedLat, this.#selectedLng);

    let isValid = true;

    if (!descValidation.valid) {
      this._showError('description-error', descValidation.error);
      isValid = false;
    } else {
      this._showError('description-error', '');
    }

    if (!photoValidation.valid) {
      this._showError('photo-error', photoValidation.error);
      isValid = false;
    } else {
      this._showError('photo-error', '');
    }

    if (!locationValidation.valid) {
      showNotification(locationValidation.error, 'error');
      isValid = false;
    }

    if (!isValid) {
      this.resetSubmitState();
      return;
    }

    const payload = {
      description: descField.value.trim(),
      photo: photoFile,
      photoName: photoFile ? photoFile.name : null,
      lat: this.#selectedLat,
      lon: this.#selectedLng,
      createdAt: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      await this._storePendingStory(payload);
      this._resetForm();
      await this._renderPendingStories();
      this.resetSubmitState();
      showNotification('Cerita disimpan offline dan akan dikirim otomatis saat koneksi kembali', 'info');
      return;
    }

    try {
      const formData = this._buildFormData(payload);
      await this.#presenter.submitStory(formData);
      this._resetForm();
      await this._renderPendingStories();
      setTimeout(() => {
        window.location.hash = '#/';
      }, 800);
    } catch (err) {
      if (this._isNetworkError(err)) {
        await this._storePendingStory(payload);
        this._resetForm();
        await this._renderPendingStories();
        showNotification('Koneksi tidak stabil, cerita disimpan offline', 'info');
      } else {
        this.showError(err.message || 'Gagal mengirim cerita');
        return;
      }
    } finally {
      this.resetSubmitState();
    }
  }

  _buildFormData(payload) {
    const formData = new FormData();
    formData.append('description', payload.description);
    if (payload.photo) {
      const fileName = payload.photoName || (payload.photo && payload.photo.name) || 'photo.jpg';
      formData.append('photo', payload.photo, fileName);
    }
    formData.append('lat', payload.lat);
    formData.append('lon', payload.lon);
    return formData;
  }

  async _storePendingStory(payload) {
    const entry = {
      ...payload,
    };
    await this.#presenter.storePendingStory(entry);
  }

  async _renderPendingStories() {
    if (!this.#pendingListElement) {
      return;
    }

    try {
      this.#pendingStories = await this.#presenter.fetchPendingStories();
    } catch (error) {
      this.#pendingStories = [];
    }

    if (!this.#pendingStories.length) {
      this.#pendingListElement.innerHTML = '<div class="empty-pending">Belum ada draft offline.</div>';
      return;
    }

    const formatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

    this.#pendingListElement.innerHTML = this.#pendingStories
      .map((item) => {
        const createdLabel = item.createdAt ? formatter.format(new Date(item.createdAt)) : 'Waktu tidak diketahui';
        const coords = item.lat && item.lon ? `${Number(item.lat).toFixed(4)}, ${Number(item.lon).toFixed(4)}` : '-';

        return `
          <article class="pending-item" data-id="${item.id}" role="listitem" tabindex="0">
            <div class="pending-body">
              <h3>${createdLabel}</h3>
              <p>${this._truncateText(item.description || '', 140)}</p>
              <span class="pending-location">${coords}</span>
            </div>
            <div class="pending-actions">
              <button type="button" class="pending-sync" data-id="${item.id}">Kirim</button>
              <button type="button" class="pending-remove" data-id="${item.id}">Hapus</button>
            </div>
          </article>
        `;
      })
      .join('');

    this._bindPendingDraftActions();
  }

  _bindPendingDraftActions() {
    if (!this.#pendingListElement) {
      return;
    }

    const removeButtons = this.#pendingListElement.querySelectorAll('.pending-remove');
    removeButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        const draftId = button.dataset.id;
        await this.#presenter.removePendingStory(draftId);
        await this._renderPendingStories();
        showNotification('Draft offline dihapus', 'info');
      });
    });

    const syncButtons = this.#pendingListElement.querySelectorAll('.pending-sync');
    syncButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        await this._syncPendingDraft(button.dataset.id);
      });
    });
  }

  async _syncPendingDraft(id) {
    const draft = this.#pendingStories.find((item) => item.id === id);
    if (!draft) {
      return;
    }

    if (!navigator.onLine) {
      showNotification('Sambungkan internet untuk mengirim draft', 'error');
      return;
    }

    try {
      const formData = this._buildFormData(draft);
      await this.#presenter.submitStory(formData, { silent: true });
      await this.#presenter.removePendingStory(id);
      await this._renderPendingStories();
      showNotification('Draft offline berhasil dikirim', 'success');
    } catch (error) {
      showNotification(error.message || 'Gagal mengirim draft offline', 'error');
    }
  }

  _resetForm() {
    const descField = document.getElementById('description');
    const photoInput = document.getElementById('photo');
    const previewContainer = document.getElementById('preview-container');
    const preview = document.getElementById('photo-preview');
    const locationInfo = document.getElementById('location-info');

    if (descField) {
      descField.value = '';
    }

    if (photoInput) {
      photoInput.value = '';
    }

    if (preview) {
      preview.src = '';
    }

    if (previewContainer) {
      previewContainer.hidden = true;
    }

    this.#capturedPhoto = null;
    this.#selectedLat = null;
    this.#selectedLng = null;

    if (locationInfo) {
      locationInfo.textContent = '';
    }

    if (this.#marker && this.#map) {
      this.#map.removeLayer(this.#marker);
      this.#marker = null;
    }

    this._closeCamera();
  }

  _isNetworkError(error) {
    if (!error) {
      return false;
    }

    if (!navigator.onLine) {
      return true;
    }

    const message = String(error.message || '');
    return message.includes('Failed to fetch') || message.includes('NetworkError');
  }

  _truncateText(text, limit = 100) {
    if (!text || text.length <= limit) {
      return text;
    }
    return `${text.substring(0, limit)}...`;
  }
}

export default StoryCreatePage;
