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
