import StoriesService from '../../data/api';
import CONFIG from '../../config';
import { showNotification, showFormattedDate } from '../../utils/index';
import { parseActivePathname } from '../../routes/url-parser';

export default class StoryDetailPage {
  #story = null;

  async render() {
    return `
      <section class="story-detail-section">
        <div class="container">
          <div id="story-detail" class="story-detail">
            <div class="loading">Memuat detail cerita...</div>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    const { id } = parseActivePathname();
    if (!id) {
      this._renderError('Cerita tidak ditemukan');
      return;
    }

    try {
      const story = await StoriesService.fetchStoryDetail(id);
      this.#story = story;
      this._renderStory(story);
      this._initMap(story);
    } catch (error) {
      this._renderError(error.message || 'Gagal memuat detail cerita');
      showNotification(error.message || 'Gagal memuat detail cerita', 'error');
    }
  }

  _renderStory(story) {
    const container = document.getElementById('story-detail');
    if (!container) {
      return;
    }

    const formattedDate = showFormattedDate(story.createdAt, 'id-ID', { hour: '2-digit', minute: '2-digit' });
    const coords = story.lat && story.lon ? `${Number(story.lat).toFixed(4)}, ${Number(story.lon).toFixed(4)}` : 'Tidak tersedia';

    container.innerHTML = `
      <article class="story-detail-card">
        <div class="story-detail-header">
          <h1>${story.name}</h1>
          <time datetime="${story.createdAt}">${formattedDate}</time>
        </div>
        <div class="story-detail-image">
          <img src="${story.photoUrl}" alt="${story.description}" />
        </div>
        <p class="story-detail-description">${story.description}</p>
        <div class="story-detail-meta">
          <div>
            <span class="meta-label">Lokasi</span>
            <span>${coords}</span>
          </div>
          <div>
            <span class="meta-label">Status Data</span>
            <span>${navigator.onLine ? 'Online' : 'Offline'}</span>
          </div>
        </div>
        <div id="story-detail-map" class="story-detail-map" role="application" aria-label="Peta lokasi cerita"></div>
        <div class="story-detail-actions">
          <a class="btn btn-primary" href="#/">Kembali ke Beranda</a>
          <a class="btn btn-outline" href="#/add">Bagikan Cerita</a>
        </div>
      </article>
    `;
  }

  _renderError(message) {
    const container = document.getElementById('story-detail');
    if (!container) {
      return;
    }

    container.innerHTML = `
      <div class="error-state">
        <h2>${message}</h2>
        <p>Silakan kembali ke beranda dan coba lagi.</p>
  <a class="btn btn-primary" href="#/">Kembali</a>
      </div>
    `;
  }

  _initMap(story) {
    if (!story || !story.lat || !story.lon) {
      const mapContainer = document.getElementById('story-detail-map');
      if (mapContainer) {
        mapContainer.innerHTML = '<p class="map-empty">Lokasi tidak tersedia untuk cerita ini.</p>';
      }
      return;
    }

    const mapContainer = document.getElementById('story-detail-map');
    if (!mapContainer) {
      return;
    }

    const L = window.L;
    const map = L.map(mapContainer).setView([story.lat, story.lon], 14);

    const streetLayer = L.tileLayer(CONFIG.MAP_TILE_LAYERS.street.url, { attribution: CONFIG.MAP_TILE_LAYERS.street.attribution });
    streetLayer.addTo(map);

    L.marker([story.lat, story.lon]).addTo(map).bindPopup(`
      <strong>${story.name}</strong><br />
      <span>${story.description}</span>
    `);

    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }
}
