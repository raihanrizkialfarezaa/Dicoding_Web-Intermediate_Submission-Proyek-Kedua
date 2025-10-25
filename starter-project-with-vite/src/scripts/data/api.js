import CONFIG from '../config';
import Auth from '../utils/auth';
import { cacheStoriesToDb, readStoriesFromDb } from './indexed-db';

const StoriesService = {
  async fetchStories(location = 1) {
    const deliverMock = () => ({ stories: this._getMockStories(), meta: { isMockData: true, source: 'mock' } });

    try {
      if (!Auth.isLoggedIn()) {
        const cachedStories = await readStoriesFromDb();
        if (cachedStories.length) {
          return { stories: this._sortStories(cachedStories), meta: { isMockData: false, source: 'cache' } };
        }
        return deliverMock();
      }

      const response = await fetch(`${CONFIG.API_ENDPOINT}/stories?location=${location}`, {
        headers: Auth.getAuthHeaders(),
      });

      if (response.status === 401) {
        return deliverMock();
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.message);
      }

      const normalizedStories = this._normalizeStories(data.listStory || []);
      await cacheStoriesToDb(normalizedStories);

      return {
        stories: normalizedStories,
        meta: { isMockData: false, source: 'network' },
      };
    } catch (err) {
      const cachedStories = await readStoriesFromDb();
      if (cachedStories.length) {
        return { stories: this._sortStories(cachedStories), meta: { isMockData: false, source: 'cache', offline: true } };
      }
      return deliverMock();
    }
  },

  async postStory(formData) {
    try {
      const isAuth = Auth.isLoggedIn();
      const endpoint = isAuth ? `${CONFIG.API_ENDPOINT}/stories` : `${CONFIG.API_ENDPOINT}/stories/guest`;
      const headers = isAuth ? Auth.getAuthHeaders() : {};

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (response.status === 401) {
        throw new Error('Unauthorized: Token tidak valid atau telah kedaluwarsa. Silakan login kembali.');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.message);
      }

      return data;
    } catch (err) {
      throw new Error(`Gagal mengirim story: ${err.message}`);
    }
  },

  async fetchStoryDetail(id) {
    try {
      if (!id) {
        throw new Error('ID cerita tidak valid');
      }

      if (id.startsWith('guest-')) {
        const cachedStories = await readStoriesFromDb();
        const story = cachedStories.find((s) => s.id === id);
        if (story) {
          return story;
        }
        throw new Error('Terjadi error, cerita guest tidak ditemukan');
      }

      const response = await fetch(`${CONFIG.API_ENDPOINT}/stories/${id}`, {
        headers: Auth.getAuthHeaders(),
      });

      if (response.status === 401) {
        throw new Error('Unauthorized: Silakan login kembali untuk melihat detail cerita.');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.message);
      }

      const detail = this._normalizeStory(data.story);
      const cachedStories = await readStoriesFromDb();
      const updatedStories = this._mergeStoryRecord(cachedStories, detail);
      await cacheStoriesToDb(updatedStories);

      return detail;
    } catch (error) {
      const cachedStories = await readStoriesFromDb();
      const fallback = cachedStories.find((story) => story.id === id);
      if (fallback) {
        return fallback;
      }
      throw error;
    }
  },

  _normalizeStories(list) {
    return this._sortStories(list.map((story) => this._normalizeStory(story)).filter((story) => typeof story.lat === 'number' && typeof story.lon === 'number'));
  },

  _normalizeStory(story) {
    if (!story) {
      return null;
    }

    const parsedLat = Number(story.lat);
    const parsedLon = Number(story.lon);

    return {
      id: story.id,
      name: story.name,
      description: story.description,
      photoUrl: story.photoUrl,
      createdAt: story.createdAt,
      lat: Number.isFinite(parsedLat) ? parsedLat : null,
      lon: Number.isFinite(parsedLon) ? parsedLon : null,
    };
  },

  _sortStories(stories) {
    return [...stories].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  _mergeStoryRecord(stories, story) {
    if (!story || !story.id) {
      return stories;
    }

    const existingIndex = stories.findIndex((item) => item.id === story.id);
    if (existingIndex >= 0) {
      const clone = [...stories];
      clone[existingIndex] = { ...clone[existingIndex], ...story };
      return this._sortStories(clone);
    }

    return this._sortStories([...stories, story]);
  },

  _getMockStories() {
    return [
      {
        id: 'story-1',
        name: 'Ahmad Fauzi',
        description: 'Baru saja menyelesaikan kelas Belajar Dasar Pemrograman Web! Sangat menyenangkan belajar HTML, CSS, dan JavaScript di Dicoding.',
        photoUrl: 'https://picsum.photos/400/300?random=1',
        createdAt: '2024-01-15T10:00:00.000Z',
        lat: -6.2088,
        lon: 106.8456,
      },
      {
        id: 'story-2',
        name: 'Sari Dewi',
        description: 'Menyelesaikan submission kelas Machine Learning untuk Pemula. Kelasnya seru sekali!',
        photoUrl: 'https://picsum.photos/400/300?random=2',
        createdAt: '2024-01-14T15:30:00.000Z',
        lat: -7.7956,
        lon: 110.3695,
      },
      {
        id: 'story-3',
        name: 'Budi Santoso',
        description: 'Hari ini berhasil deploy aplikasi React pertama saya ke Vercel. Materinya Daging Banget.',
        photoUrl: 'https://picsum.photos/400/300?random=3',
        createdAt: '2024-01-13T09:15:00.000Z',
        lat: -6.9175,
        lon: 107.6191,
      },
    ];
  },
};

export default StoriesService;
