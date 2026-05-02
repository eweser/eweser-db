/**
 * Purpose: Browser route table for redesigned Ewe Note screens.
 * Exports: router.
 * Touches: Home, editor, and settings navigation.
 * Read before editing: packages/ewe-note/src/INDEX.md.
 */
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
