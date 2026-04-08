import { AppSidebar } from '@/components/app-sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import type { PropsWithChildren } from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { ModeToggle } from './mode-toggle';
import { useDb } from '@/db';
import removeMarkdown from 'markdown-to-text';
import type { Note, Room } from '@eweser/db';
import {
  DEFAULT_LAYOUT_CHROME,
  getLayoutHotkeyAction,
  getNextLayoutChromeState,
  isPureFocusLayout,
  LAYOUT_SHORTCUT_LABELS,
} from './layout-shortcuts';

function NoteTitle({ room, noteId }: { room: Room<Note>; noteId: string }) {
  const [text, setText] = useState(
    () => room.getDocuments().get(noteId)?.text ?? ''
  );
  useEffect(() => {
    const docs = room.getDocuments();
    const update = () => setText(docs.get(noteId)?.text ?? '');
    docs.documents.observe(update);
    return () => {
      docs.documents.unobserve(update);
    };
  }, [room, noteId]);
  return <>{removeMarkdown(text)}</>;
}

export function Layout({ children }: Readonly<PropsWithChildren>) {
  return (
    <SidebarProvider>
      <LayoutInner>{children}</LayoutInner>
    </SidebarProvider>
  );
}

function LayoutInner({ children }: Readonly<PropsWithChildren>) {
  const { selectedRoom, selectedNoteId } = useDb();
  const { isMobile, open, openMobile, setOpen, setOpenMobile } = useSidebar();
  const [topbarVisible, setTopbarVisible] = useState(true);
  const [focusHintVisible, setFocusHintVisible] = useState(false);
  const lastNonFocusRef = useRef(DEFAULT_LAYOUT_CHROME);

  const currentChrome = useMemo(
    () => ({
      sidebarVisible: isMobile ? openMobile : open,
      topbarVisible,
    }),
    [isMobile, open, openMobile, topbarVisible]
  );
  const isPureFocus = isPureFocusLayout(currentChrome);

  useEffect(() => {
    if (!isPureFocus) {
      lastNonFocusRef.current = currentChrome;
    }
  }, [currentChrome, isPureFocus]);

  useEffect(() => {
    if (!isPureFocus) {
      setFocusHintVisible(false);
      return;
    }

    setFocusHintVisible(true);
    const timeoutId = window.setTimeout(() => {
      setFocusHintVisible(false);
    }, 2400);

    return () => window.clearTimeout(timeoutId);
  }, [isPureFocus]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const action = getLayoutHotkeyAction(event, isPureFocus);
      if (!action || action === 'toggle-sidebar') {
        return;
      }

      event.preventDefault();

      const nextState = getNextLayoutChromeState({
        action,
        current: currentChrome,
        lastNonFocus: lastNonFocusRef.current,
      });

      lastNonFocusRef.current = nextState.lastNonFocus;
      setOpen(nextState.current.sidebarVisible);
      setOpenMobile(nextState.current.sidebarVisible);
      setTopbarVisible(nextState.current.topbarVisible);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentChrome, isPureFocus, setOpen, setOpenMobile]);

  return (
    <>
      <AppSidebar />
      <SidebarInset className="overflow-hidden w-full">
        {topbarVisible ? (
          <header
            data-cy="ewe-note-header"
            className="flex sticky top-0 z-20 bg-background/95 backdrop-blur h-16 shrink-0 items-center border-b px-4 justify-between w-full"
          >
            <div className="flex min-w-0 items-center gap-2 justify-between">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink>{selectedRoom?.name}</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="truncate max-w-[200px]">
                      {selectedRoom ? (
                        <NoteTitle
                          room={selectedRoom as Room<Note>}
                          noteId={selectedNoteId}
                        />
                      ) : null}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-muted-foreground lg:inline">
                Topbar {LAYOUT_SHORTCUT_LABELS.topbar}
              </span>
              <ModeToggle />
            </div>
          </header>
        ) : null}
        <div className="flex flex-1 flex-col p-4 overflow-auto w-full max-w-full">
          {children}
        </div>
      </SidebarInset>
      {focusHintVisible ? (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div className="rounded-full border bg-background/95 px-3 py-1.5 text-xs text-foreground shadow-lg backdrop-blur">
            Focus mode. {LAYOUT_SHORTCUT_LABELS.exitFocus} exits.{' '}
            {LAYOUT_SHORTCUT_LABELS.pureFocus} toggles.
          </div>
        </div>
      ) : null}
    </>
  );
}
