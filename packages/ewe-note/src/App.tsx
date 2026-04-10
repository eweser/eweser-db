import '@blocknote/core/fonts/inter.css';
import '@blocknote/shadcn/style.css';
import { ThemeProvider } from '@/components/theme-provider';
import { DbProvider, useDb } from './db';
import { Icons } from './lib/icons';
import { TooltipProvider } from './components/ui/tooltip';
import RedesignApp from './app/App';

function App() {
  const { loaded, selectedRoom, selectedNoteId } = useDb();

  return (
    <ThemeProvider
      defaultMode="dark"
      defaultLightThemeId="paper"
      defaultDarkThemeId="true-black"
    >
      {/* You can check that the ydoc exists to make sure the room is connected */}
      {loaded &&
      selectedRoom?.id &&
      selectedRoom.ydoc?.store &&
      selectedNoteId ? (
        <RedesignApp />
      ) : (
        // usually loads almost instantaneously, but we need to make sure a yDoc is ready before we can use it
        <div
          data-cy="ewe-note-loading"
          className="flex items-center justify-center h-screen"
        >
          <Icons.Spinner className="w-24 h-24 animate-spin" />
        </div>
      )}
    </ThemeProvider>
  );
}

const AppWithDbProvider = () => (
  <DbProvider>
    <TooltipProvider delayDuration={0}>
      <App />
    </TooltipProvider>
  </DbProvider>
);

export default AppWithDbProvider;
