import { getSavedStories, deleteSavedStory } from '../../data/indexed-db';
import { showNotification } from '../../utils/index';

export default class SavedStoriesPage {
  async render() {
    return `
      <section class="saved-section">
        <div class="container">
          <h1>Cerita Tersimpan</h1>
          <div id="saved-list" class="stories-list" role="list">
            <div class="loading">Memuat cerita tersimpan...</div>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    await this._loadSaved();
  }

  async _loadSaved() {
    try {
      const stories = await getSavedStories();
      this._renderList(stories || []);
    } catch (error) {
      const container = document.getElementById('saved-list');
      if (container) container.innerHTML = `<div class="error-state">Gagal memuat data tersimpan</div>`;
      showNotification('Gagal memuat data tersimpan', 'error');
    }
  }

  _renderList(stories) {
    const container = document.getElementById('saved-list');
    if (!container) return;

    if (!stories || stories.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>Belum ada cerita tersimpan</h3>
          <p>Simpan cerita dari detail untuk menampilkannya di sini.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = stories
      .map((story) => {
        const created = new Date(story.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
        return `
          <article class="story-card" data-id="${story.id}" role="listitem">
            <div class="story-row">
              <div class="story-thumb">
                <img src="${story.photoUrl}" alt="${story.description}" loading="lazy" />
              </div>
              <div class="story-content">
                <div class="story-header">
                  <h3 class="story-title">${story.name}</h3>
                  <time class="story-date" datetime="${story.createdAt}">${created}</time>
                </div>
                <p class="story-description">${story.description}</p>
                <div class="story-footer">
                  <div class="story-actions">
                    <a class="story-link" href="#/story/${story.id}">Lihat Detail</a>
                    <button class="btn btn-outline btn-delete-saved" data-id="${story.id}">Hapus</button>
                  </div>
                </div>
              </div>
            </div>
          </article>
        `;
      })
      .join('');

    this._attachDeleteHandlers();
  }

  _attachDeleteHandlers() {
    const buttons = document.querySelectorAll('.btn-delete-saved');
    buttons.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = btn.dataset.id;
        try {
          await deleteSavedStory(id);
          await this._loadSaved();
          showNotification('Cerita dihapus dari tersimpan', 'success');
        } catch (error) {
          showNotification('Gagal menghapus cerita', 'error');
        }
      });
    });
  }
}
