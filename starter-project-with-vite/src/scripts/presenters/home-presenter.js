class StoriesPresenter {
  constructor(view, api) {
    this._view = view;
    this._api = api;
  }

  async loadStories() {
    try {
      this._view.showLoading();
      const result = await this._api.fetchStories(1);
      this._view.displayStories(result.stories, result.meta || {});
      return result;
    } catch (error) {
      this._view.showError(error.message);
      throw error;
    }
  }

  filterStories(stories, searchTerm) {
    if (!searchTerm) {
      return stories;
    }

    const lowerKeyword = searchTerm.toLowerCase();

    return stories.filter((story) => {
      return story.name.toLowerCase().includes(lowerKeyword) || story.description.toLowerCase().includes(lowerKeyword);
    });
  }

  sortStories(stories, mode) {
    const sorted = [...stories];
    switch (mode) {
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name, 'id-ID'));
      case 'newest':
      default:
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  }

  selectStory(storyId, stories) {
    const story = stories.find((s) => s.id === storyId);
    if (story) {
      this._view.highlightStory(storyId);
      this._view.focusMapOnLocation(story.lat, story.lon);
    }
  }
}

export default StoriesPresenter;
