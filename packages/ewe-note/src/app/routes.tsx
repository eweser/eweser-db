/**
 * Purpose: Browser route table for redesigned Ewe Note screens.
 * Exports: routes, createEweNoteRouter, router.
 * Touches: Home, editor, and settings navigation.
 * Read before editing: packages/ewe-note/src/INDEX.md.
 */
import { createBrowserRouter, type RouteObject } from 'react-router';
import { routerBase } from '@/config';
import { EnhancedHome } from './pages/EnhancedHome';
import { EnhancedEditor } from './pages/EnhancedEditor';
import { Settings } from './pages/Settings';

export const routes: RouteObject[] = [
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
];

export function createEweNoteRouter(base = routerBase) {
  return createBrowserRouter(routes, {
    basename: base,
  });
}

export const router = createEweNoteRouter();
