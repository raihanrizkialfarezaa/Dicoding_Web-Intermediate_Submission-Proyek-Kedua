import { savePendingDraft, getPendingDrafts, deletePendingDraft } from '../data/indexed-db';
import Auth from '../utils/auth';
import { cacheStoriesToDb, readStoriesFromDb } from '../data/indexed-db';
class StoryCreatePresenter {
  constructor(view, api) {
    this._view = view;
    this._api = api;
  }

  validateDescription(description) {
    if (!description || description.trim() === '') {
      return { valid: false, error: 'Deskripsi wajib diisi' };
    }
    return { valid: true };
  }

  validatePhoto(photo) {
    if (!photo) {
      return { valid: false, error: 'Foto wajib dipilih' };
    }

    if (photo.size > 1048576) {
      return { valid: false, error: 'Ukuran file maksimal 1MB' };
    }

    if (!photo.type.startsWith('image/')) {
      return { valid: false, error: 'File harus berupa gambar' };
    }

    return { valid: true };
  }

  validateLocation(lat, lng) {
    if (!lat || !lng) {
      return { valid: false, error: 'Silakan pilih lokasi di peta' };
    }
    return { valid: true };
  }

  async submitStory(formData, options = {}) {
    const { silent = false } = options;
    try {
      if (!silent) {
        this._view.showSubmitting();
      }
      const result = await this._api.postStory(formData);

      if (!Auth.isLoggedIn()) {
        const description = formData.get('description');
        const photo = formData.get('photo');
        const lat = parseFloat(formData.get('lat'));
        const lon = parseFloat(formData.get('lon'));

        let photoUrl = 'https://picsum.photos/400/300?random=guest';
        if (photo) {
          photoUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(photo);
          });
        }

        const guestStory = {
          id: `guest-${Date.now()}`,
          name: 'Guest User',
          description,
          photoUrl,
          createdAt: new Date().toISOString(),
          lat: Number.isFinite(lat) ? lat : -6.2088,
          lon: Number.isFinite(lon) ? lon : 106.8456,
        };

        const cachedStories = await readStoriesFromDb();
        const updatedStories = [guestStory, ...cachedStories];
        await cacheStoriesToDb(updatedStories);
      }

      if (!silent) {
        this._view.showSuccess('Cerita berhasil dikirim!');
      }
      return result;
    } catch (error) {
      if (!silent) {
        this._view.showError(error.message);
      }
      throw error;
    }
  }

  async storePendingStory(story) {
    return savePendingDraft(story);
  }

  async fetchPendingStories() {
    return getPendingDrafts();
  }

  async removePendingStory(id) {
    return deletePendingDraft(id);
  }
}
export default StoryCreatePresenter;
