import { createBrowserRouter } from 'react-router';
import { EnhancedHome } from './pages/EnhancedHome';
import { EnhancedEditor } from './pages/EnhancedEditor';
import { Settings } from './pages/Settings';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: EnhancedHome,
  },
  {
    path: '/editor/:noteId',
    Component: EnhancedEditor,
  },
  {
    path: '/settings',
    Component: Settings,
  },
]);
