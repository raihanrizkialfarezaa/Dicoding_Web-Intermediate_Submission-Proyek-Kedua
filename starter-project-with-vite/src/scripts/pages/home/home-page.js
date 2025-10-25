import StoriesService from '../../data/api';
import CONFIG from '../../config';
import { showNotification } from '../../utils/index';
import StoriesPresenter from '../../presenters/home-presenter';

export default class StoriesListPage {
  #map = null;
  #markers = [];
  #allStories = [];
  #filteredStories = [];
  #presenter = null;
  #meta = {};
  #searchInput = null;
  #sortSelect = null;
  #resetFilterButton = null;

  constructor() {
    this.#presenter = new StoriesPresenter(this, StoriesService);
  }

  async render() {
    return `
      <section class="hero-section">
        <div class="container">
          <h1>Jelajahi Stories Programmer dari Seluruh Indonesia</h1>
          <p>Temukan dan bagikan pengalaman belajar di Dicoding</p>
        </div>
      </section>

      <section class="stories-section">
        <div class="container">
          <div class="content-layout">
            <aside class="stories-sidebar">
              <div class="filter-controls">
                <h2>Daftar Cerita</h2>
                <div class="filter-group">
                  <label for="story-search" class="sr-only">Cari cerita</label>
                  <input id="story-search" type="search" placeholder="Cari nama atau cerita" autocomplete="off" />
                </div>
                <div class="filter-group">
                  <label for="story-sort" class="sr-only">Urutkan cerita</label>
                  <select id="story-sort">
                    <option value="newest">Terbaru</option>
                    <option value="oldest">Terlama</option>
                    <option value="name">Nama</option>
                  </select>
                  <button type="button" id="reset-filter" class="filter-reset">Reset</button>
                </div>
              </div>
              <div id="stories-list" class="stories-list" role="list">
                <div class="loading">Memuat cerita...</div>
              </div>
            </aside>

            <div class="map-section">
              <div id="map-display" class="map-display" role="application" aria-label="Peta lokasi cerita"></div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    await this._loadStories();
    await this._initMap();
    this.#searchInput = document.getElementById('story-search');
    this.#sortSelect = document.getElementById('story-sort');
    this.#resetFilterButton = document.getElementById('reset-filter');
    this._setupFilters();

    window.addEventListener('online', () => {
      this._loadStories();
    });
  }

  async _loadStories() {
    try {
      this.showLoading();
      const result = await this.#presenter.loadStories();
      this.#meta = result.meta || {};
      this.#allStories = result.stories || [];
      this.#filteredStories = this.#allStories;
    } catch (err) {}
  }

  showLoading() {
    const listContainer = document.getElementById('stories-list');
    listContainer.innerHTML = '<div class="loading">Memuat cerita...</div>';
  }

  displayStories(stories, meta = {}) {
    this.#allStories = stories;
    this.#filteredStories = stories;
    this.#meta = meta;
    this._renderStoryList(stories, meta);
  }

  showError(message) {
    const listContainer = document.getElementById('stories-list');
    listContainer.innerHTML = `<div class="error-state">${message}</div>`;
    showNotification(message, 'error');
  }

  _renderStoryList(stories, meta = {}) {
    const listContainer = document.getElementById('stories-list');

    if (stories.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <h3>Tidak ada cerita ditemukan</h3>
          <p>Coba ubah kata kunci pencarian atau jelajahi peta untuk menemukan cerita lainnya.</p>
        </div>
      `;
      return;
    }

    let authNotice = '';
    if (meta.isMockData) {
      authNotice = `
        <div class="auth-notice">
          <div class="auth-notice-content">
            <div class="auth-notice-text">
              <h4>Data Contoh Ditampilkan</h4>
              <p>Untuk melihat cerita dari komunitas Dicoding, silakan <a href="#/login">masuk</a> atau <a href="#/register">daftar</a> akun.</p>
            </div>
          </div>
        </div>
      `;
    }

    let offlineNotice = '';

    const html =
      authNotice +
      offlineNotice +
      stories
        .map((story) => {
          const truncatedDesc = this._truncateText(story.description, 120);
          const createdDate = new Date(story.createdAt).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

          return `
          <article class="story-card" data-id="${story.id}" data-lat="${story.lat}" data-lng="${story.lon}" role="listitem" tabindex="0">
            <div class="story-row">
              <div class="story-thumb">
                <img src="${story.photoUrl}" alt="${story.description}" loading="lazy" />
              </div>
              <div class="story-content">
                <div class="story-header">
                  <h3 class="story-title">${story.name}</h3>
                  <time class="story-date" datetime="${story.createdAt}">${createdDate}</time>
                </div>
                <p class="story-description">${truncatedDesc}</p>
                <div class="story-footer">
                  <div class="story-location">
                    <span class="location-coords">${story.lat.toFixed(4)}, ${story.lon.toFixed(4)}</span>
                  </div>
                  <div class="story-actions">
                    <a class="story-link" href="#/story/${story.id}">Lihat Detail</a>
                  </div>
                </div>
              </div>
            </div>
          </article>
        `;
        })
        .join('');

    listContainer.innerHTML = html;
    this._setupStoryCardHandlers();
    this._updateMapMarkers(stories);
  }

  _setupStoryCardHandlers() {
    const cards = document.querySelectorAll('.story-card');

    cards.forEach((card) => {
      const clickHandler = () => {
        const storyId = card.dataset.id;
        this.#presenter.selectStory(storyId, this.#allStories);
      };

      card.addEventListener('click', clickHandler);

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          clickHandler();
        }
      });
    });
  }

  highlightStory(storyId) {
    document.querySelectorAll('.story-card').forEach((c) => {
      c.classList.remove('active');
    });

    const card = document.querySelector(`.story-card[data-id="${storyId}"]`);
    if (card) {
      card.classList.add('active');
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    this._highlightMarker(storyId);
  }

  focusMapOnLocation(lat, lng) {
    if (this.#map) {
      this.#map.setView([lat, lng], 15);
    }
  }

  _highlightMarker(storyId) {
    const L = window.L;

    this.#markers.forEach(({ marker, story }) => {
      const icon = L.divIcon({
        className: story.id === storyId ? 'custom-marker active' : 'custom-marker',
        html: '<div class="marker-pin"></div>',
        iconSize: [30, 42],
        iconAnchor: [15, 42],
      });
      marker.setIcon(icon);
    });
  }

  async _initMap() {
    const L = window.L;
    const mapContainer = document.getElementById('map-display');

    if (this.#map) {
      this.#map.remove();
    }

    this.#map = L.map(mapContainer).setView([CONFIG.DEFAULT_LOCATION.lat, CONFIG.DEFAULT_LOCATION.lng], 5);

    const streetLayer = L.tileLayer(CONFIG.MAP_TILE_LAYERS.street.url, { attribution: CONFIG.MAP_TILE_LAYERS.street.attribution });

    const satelliteLayer = L.tileLayer(CONFIG.MAP_TILE_LAYERS.satellite.url, { attribution: CONFIG.MAP_TILE_LAYERS.satellite.attribution });

    streetLayer.addTo(this.#map);

    L.control
      .layers({
        'Peta Jalan': streetLayer,
        'Peta Satelit': satelliteLayer,
      })
      .addTo(this.#map);

    this._addMarkersToMap();

    setTimeout(() => {
      this.#map.invalidateSize();
    }, 100);
  }

  _addMarkersToMap() {
    this._updateMapMarkers(this.#filteredStories);
  }

  _updateMapMarkers(stories) {
    if (!this.#map) return;

    this.#markers.forEach(({ marker }) => {
      this.#map.removeLayer(marker);
    });
    this.#markers = [];

    const L = window.L;
    stories.forEach((story) => {
      if (story.lat && story.lon) {
        const icon = L.divIcon({
          className: 'custom-marker',
          html: '<div class="marker-pin"></div>',
          iconSize: [30, 42],
          iconAnchor: [15, 42],
        });

        const marker = L.marker([story.lat, story.lon], { icon }).addTo(this.#map).bindPopup(`
          <div class="marker-popup">
            <img src="${story.photoUrl}" alt="${story.description}" class="marker-image" />
            <h4 class="marker-title">${story.name}</h4>
            <p class="marker-description">${this._truncateText(story.description, 80)}</p>
            <small class="marker-date">${new Date(story.createdAt).toLocaleDateString('id-ID')}</small>
          </div>
        `);

        marker.on('click', () => {
          this.#presenter.selectStory(story.id, this.#allStories);
        });

        this.#markers.push({ marker, story });
      }
    });
  }

  _setupFilters() {
    if (this.#searchInput) {
      this.#searchInput.addEventListener('input', () => {
        this._applyFilters();
      });
    }

    if (this.#sortSelect) {
      this.#sortSelect.addEventListener('change', () => {
        this._applyFilters();
      });
    }

    if (this.#resetFilterButton) {
      this.#resetFilterButton.addEventListener('click', () => {
        if (this.#searchInput) {
          this.#searchInput.value = '';
        }
        if (this.#sortSelect) {
          this.#sortSelect.value = 'newest';
        }
        this._applyFilters();
      });
    }
  }

  _applyFilters() {
    const keyword = this.#searchInput ? this.#searchInput.value.trim() : '';
    const sortMode = this.#sortSelect ? this.#sortSelect.value : 'newest';
    const filtered = this.#presenter.filterStories(this.#allStories, keyword);
    const sorted = this.#presenter.sortStories(filtered, sortMode);
    this.#filteredStories = sorted;
    this._renderStoryList(sorted, this.#meta);
    this._updateMapMarkers(sorted);
  }

  _truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}
