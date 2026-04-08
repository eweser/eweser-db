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
} from '@/components/ui/sidebar';
import type { PropsWithChildren } from 'react';
import { useState, useEffect } from 'react';
import { ModeToggle } from './mode-toggle';
import { useDb } from '@/db';
import removeMarkdown from 'markdown-to-text';
import type { Note, Room } from '@eweser/db';

function NoteTitle({
  room,
  noteId,
}: {
  room: Room<Note>;
  noteId: string;
}) {
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
  const { selectedRoom, selectedNoteId } = useDb();
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-hidden w-full">
        <header
          data-cy="ewe-note-header"
          className="flex sticky top-0 bg-background h-16 shrink-0 items-center border-b px-4 justify-between w-full"
        >
          <div className="flex items-center gap-2 justify-between">
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
          <ModeToggle />
        </header>
        <div className="flex flex-1 flex-col p-4 overflow-auto w-full max-w-full">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
