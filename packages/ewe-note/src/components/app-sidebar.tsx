import { ChevronRight, FolderPlus, SquarePen } from 'lucide-react';

import { SearchForm } from '@/components/search-form';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Icons } from '@/lib/icons';
import { SidebarUser } from './sidebar-user';
import { useDb } from '@/db';
import type { ComponentProps } from 'react';
import { useState, useEffect } from 'react';
import removeMarkdown from 'markdown-to-text';
import {
  Dialog,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Note } from '@eweser/db';
import { Button } from './ui/button';

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const {
    db,
    loggedIn,
    allRooms,
    loginUrl,
    selectedNoteId,
    selectedRoom,
    setSelectedNoteId,
    setSelectedRoom,
    user,
    signOut,
  } = useDb();
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [notesByRoomId, setNotesByRoomId] = useState<Record<string, Note[]>>(
    {}
  );
  const [openRoomIds, setOpenRoomIds] = useState<Set<string>>(new Set());

  // Open the current room's collapsible when selectedRoom changes.
  useEffect(() => {
    if (selectedRoom?.id) {
      setOpenRoomIds((prev) => {
        const next = new Set(prev);
        next.add(selectedRoom.id);
        return next;
      });
    }
  }, [selectedRoom?.id]);

  // Keep notesByRoomId in sync with allRooms and register onChange handlers.
  useEffect(() => {
    const getNotes = (room: (typeof allRooms)[number]) => {
      try {
        const docs = room.getDocuments();
        return docs.toArray(docs.sortByRecent(docs.getUndeleted()));
      } catch {
        return [];
      }
    };

    const handlers: Array<{
      room: (typeof allRooms)[number];
      handler: Parameters<
        ReturnType<(typeof allRooms)[number]['getDocuments']>['onChange']
      >[0];
    }> = [];

    allRooms.forEach((room) => {
      try {
        const docsObj = room.getDocuments();
        const handler = () => {
          const fresh = getNotes(room);
          setNotesByRoomId((prev) => {
            const existing = prev[room.id] ?? [];
            const freshIds = new Set(fresh.map((n) => n._id));
            // Merge: keep any existing undeleted notes not in the fresh snapshot
            // (guards against ydoc race where different ydocs may have different notes)
            const fromExisting = existing.filter(
              (n) => !n._deleted && !freshIds.has(n._id)
            );
            const merged = [...fresh, ...fromExisting].sort(
              (a, b) => b._updated - a._updated
            );
            return { ...prev, [room.id]: merged };
          });
        };
        docsObj.onChange(handler);
        handlers.push({ room, handler });
        // Initial snapshot
        handler();
      } catch {
        // ydoc not yet available
      }
    });

    return () => {
      // Cleanup: unobserve all handlers to prevent StrictMode double-registration
      handlers.forEach(({ room, handler }) => {
        try {
          room.getDocuments().documents.unobserve(handler);
        } catch {
          // ignore
        }
      });
    };
  }, [allRooms]);

  const handleCreateRoom = async () => {
    try {
      setCreatingRoom(true);
      const newRoom = db.newRoom<Note>({
        collectionKey: 'notes',
        name: newRoomName,
      });

      await newRoom.load();
      setSelectedRoom(newRoom);
      const newNote = newRoom.getDocuments().new({ text: '# New Note' });
      setSelectedNoteId(newNote._id);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create room');
    } finally {
      setCreatingRoom(false);
      setNewRoomName('');
    }
  };
  const handleCreateNote = () => {
    if (!selectedRoom) {
      throw new Error('No room selected');
    }
    const docs = selectedRoom.getDocuments();
    const newNote = docs.new({ text: '# New Note' });
    setSelectedNoteId(newNote._id);
    // Optimistically add the new note without replacing existing notes.
    // The onChange handler (fired synchronously by docs.new()) handles merging
    // Y.Map changes, but we also add directly here in case of ydoc race conditions.
    setNotesByRoomId((prev) => {
      const existing = prev[selectedRoom.id] ?? [];
      if (existing.some((n) => n._id === newNote._id)) return prev;
      return { ...prev, [selectedRoom.id]: [newNote, ...existing] };
    });
  };

  return (
    <Sidebar data-cy="ewe-note-sidebar" {...props}>
      <SidebarHeader>
        <SearchForm />
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <div className="flex align-middle justify-center">
          <Button
            data-cy="ewe-note-new-note"
            variant="ghost"
            onClick={handleCreateNote}
          >
            <SquarePen />
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button data-cy="ewe-note-new-folder-trigger" variant="ghost">
                <FolderPlus />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Folder</DialogTitle>
                <DialogDescription>
                  Give me a name that sparks joy.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1">
                <Label htmlFor="new-room-name">Folder Name</Label>
                <Input
                  id="new-room-name"
                  data-cy="ewe-note-new-folder-input"
                  type="text"
                  placeholder="Enter folder name"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  disabled={creatingRoom}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary" disabled={creatingRoom}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  data-cy="ewe-note-create-folder-submit"
                  onClick={handleCreateRoom}
                  disabled={creatingRoom}
                >
                  {creatingRoom ? (
                    <Icons.Spinner className="mr-2" />
                  ) : (
                    'Create Folder'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {/* We create a collapsible SidebarGroup for each parent. */}
        {allRooms.map((room) => {
          const notes = notesByRoomId[room.id] ?? [];
          return (
            <Collapsible
              key={room.id}
              title={room.name}
              data-note-count={notes.length}
              open={openRoomIds.has(room.id)}
              onOpenChange={(isOpen) =>
                setOpenRoomIds((prev) => {
                  const next = new Set(prev);
                  if (isOpen) next.add(room.id);
                  else next.delete(room.id);
                  return next;
                })
              }
              className="group/collapsible"
            >
              <SidebarGroup>
                <SidebarGroupLabel
                  asChild
                  className="group/label text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <CollapsibleTrigger>
                    <span title={room.id} className="line-clamp-1 text-left">
                      {room.name}
                    </span>

                    <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {notes.map((note) => (
                        <SidebarMenuItem key={note._id}>
                          <SidebarMenuButton
                            data-cy={`ewe-note-note-item-${note._id}`}
                            onClick={() => {
                              setSelectedNoteId(note._id);
                              setSelectedRoom(room);
                            }}
                            className="line-clamp-1"
                            isActive={selectedNoteId === note._id}
                          >
                            {/* {note._id} */}
                            {removeMarkdown(note.text)}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>
      <SidebarFooter>
        {loggedIn ? (
          <button
            data-cy="ewe-note-logout"
            onClick={signOut}
            className="flex items-center space-x-2"
          >
            <Icons.Logo className="h-6 w-6" />
            <span className="inline-block font-bold">Logout</span>
          </button>
        ) : (
          <a
            data-cy="ewe-note-login"
            href={loginUrl}
            className="flex items-center space-x-2"
          >
            <Icons.Logo className="h-6 w-6" />
            <span className="inline-block font-bold">Login</span>
          </a>
        )}

        <SidebarUser
          user={{
            name: `${user.firstName} ${user.lastName}`,
            avatar: user.avatar,
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
