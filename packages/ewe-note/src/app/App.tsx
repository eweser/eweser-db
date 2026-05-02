/**
 * Purpose: Redesigned Ewe Note app shell root.
 * Exports: App default component.
 * Touches: Theme provider, notes context, and React Router mounting.
 * Read before editing: packages/ewe-note/src/INDEX.md.
 */
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { NotesProvider } from './contexts/NotesContext';
import { ThemeProvider } from './components/ThemeProvider';

function App() {
  return (
    <ThemeProvider>
      <NotesProvider>
        <RouterProvider router={router} />
      </NotesProvider>
    </ThemeProvider>
  );
}

export default App;
