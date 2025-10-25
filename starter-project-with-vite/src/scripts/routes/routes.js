import StoriesListPage from '../pages/home/home-page';
import AboutPage from '../pages/about/about-page';
import StoryCreatePage from '../pages/add/add-page';
import AuthLoginPage from '../pages/auth/login-page';
import AuthRegisterPage from '../pages/auth/register-page';
import StoryDetailPage from '../pages/story/story-detail-page';

const routes = {
  '/': new StoriesListPage(),
  '/about': new AboutPage(),
  '/add': new StoryCreatePage(),
  '/login': new AuthLoginPage(),
  '/register': new AuthRegisterPage(),
  '/story/:id': new StoryDetailPage(),
};

export default routes;
