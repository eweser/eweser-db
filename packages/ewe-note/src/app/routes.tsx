import { createBrowserRouter } from 'react-router';
import { EnhancedHome } from './pages/EnhancedHome';
import { EnhancedEditor } from './pages/EnhancedEditor';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: EnhancedHome,
  },
  {
    path: '/editor/:noteId',
    Component: EnhancedEditor,
  },
]);
