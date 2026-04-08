import { ChevronRight, FolderPlus, SquarePen, Share2 } from 'lucide-react';

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
import { useFolders } from '@/notes-room';
import { FolderDialog } from '@/components/folder-dialog';

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

  // Canonical room = Notes room (created at signup). Shared rooms = everything else.
  const canonicalRoom =
    allRooms.find((r) => r.name === 'Notes') ?? allRooms[0] ?? null;
  const sharedRooms = allRooms.filter((r) => r !== canonicalRoom);

  const { folders, createFolder } = useFolders(canonicalRoom ?? null);

  const [creatingSpace, setCreatingSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [notesByRoomId, setNotesByRoomId] = useState<Record<string, Note[]>>(
    {}
  );
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());

  // Open the current room's collapsible when selectedRoom changes.
  useEffect(() => {
    if (selectedRoom?.id) {
      setOpenKeys((prev) => {
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
        handler();
      } catch {
        // ydoc not yet available
      }
    });

    return () => {
      handlers.forEach(({ room, handler }) => {
        try {
          room.getDocuments().documents.unobserve(handler);
        } catch {
          // ignore
        }
      });
    };
  }, [allRooms]);

  const handleCreateSpace = async () => {
    try {
      setCreatingSpace(true);
      const newRoom = db.newRoom<Note>({
        collectionKey: 'notes',
        name: newSpaceName,
      });
      await newRoom.load();
      setSelectedRoom(newRoom);
      const newNote = newRoom.getDocuments().new({ text: '# New Note' });
      setSelectedNoteId(newNote._id);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create space');
    } finally {
      setCreatingSpace(false);
      setNewSpaceName('');
    }
  };

  const handleCreateNote = () => {
    const room = selectedRoom ?? canonicalRoom;
    if (!room) throw new Error('No room selected');
    const docs = room.getDocuments();
    const newNote = docs.new({
      text: '# New Note',
      ...(selectedFolderId ? { folderIds: [selectedFolderId] } : {}),
    });
    setSelectedNoteId(newNote._id);
    setNotesByRoomId((prev) => {
      const existing = prev[room.id] ?? [];
      if (existing.some((n) => n._id === newNote._id)) return prev;
      return { ...prev, [room.id]: [newNote, ...existing] };
    });
  };

  // Notes in canonical room, grouped by folder
  const canonicalNotes = canonicalRoom
    ? (notesByRoomId[canonicalRoom.id] ?? [])
    : [];
  const notesByFolder: Record<string, Note[]> = {};
  const unfiledNotes: Note[] = [];
  canonicalNotes.forEach((note) => {
    if (note.folderIds && note.folderIds.length > 0) {
      note.folderIds.forEach((fid) => {
        notesByFolder[fid] = notesByFolder[fid] ?? [];
        notesByFolder[fid].push(note);
      });
    } else {
      unfiledNotes.push(note);
    }
  });

  const renderNoteItem = (
    note: Note,
    room: (typeof allRooms)[number],
    folderId?: string
  ) => (
    <SidebarMenuItem key={note._id}>
      <SidebarMenuButton
        data-cy={`ewe-note-note-item-${note._id}`}
        onClick={() => {
          setSelectedNoteId(note._id);
          setSelectedRoom(room);
          setSelectedFolderId(folderId ?? null);
        }}
        className="w-full min-w-0 overflow-hidden"
        isActive={selectedNoteId === note._id}
      >
        <span className="block truncate">{removeMarkdown(note.text)}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar data-cy="ewe-note-sidebar" {...props}>
      <SidebarHeader>
        <SearchForm />
      </SidebarHeader>
      <SidebarContent className="gap-0">
        {/* Toolbar */}
        <div className="flex align-middle justify-center">
          <Button
            data-cy="ewe-note-new-note"
            variant="ghost"
            title="New Note"
            onClick={handleCreateNote}
          >
            <SquarePen />
          </Button>
          {/* New Folder: creates metadata, NOT a new room */}
          <Button
            data-cy="ewe-note-new-folder-trigger"
            variant="ghost"
            title="New Folder"
            onClick={() => setFolderDialogOpen(true)}
          >
            <FolderPlus />
          </Button>
          {/* New Space: creates a real collaborative room */}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                data-cy="ewe-note-new-space-trigger"
                variant="ghost"
                title="New Shared Space"
              >
                <Share2 />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Shared Space</DialogTitle>
                <DialogDescription>
                  A shared space is a real sync boundary for collaboration.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1">
                <Label htmlFor="new-space-name">Space Name</Label>
                <Input
                  id="new-space-name"
                  data-cy="ewe-note-new-space-input"
                  type="text"
                  placeholder="Enter space name"
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  disabled={creatingSpace}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary" disabled={creatingSpace}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  data-cy="ewe-note-create-space-submit"
                  onClick={handleCreateSpace}
                  disabled={creatingSpace}
                >
                  {creatingSpace ? (
                    <Icons.Spinner className="mr-2" />
                  ) : (
                    'Create Space'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* My Notes — canonical room with folders */}
        {canonicalRoom && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>My Notes</SidebarGroupLabel>
            </SidebarGroup>
            {/* Folders */}
            {folders.map((folder) => {
              const folderNotes = notesByFolder[folder.id] ?? [];
              return (
                <Collapsible
                  key={folder.id}
                  open={openKeys.has(folder.id)}
                  onOpenChange={(isOpen) => {
                    setOpenKeys((prev) => {
                      const next = new Set(prev);
                      if (isOpen) next.add(folder.id);
                      else next.delete(folder.id);
                      return next;
                    });
                  }}
                  className="group/collapsible"
                >
                  <SidebarGroup>
                    <div
                      className={`flex w-full min-w-0 items-center rounded-md px-2 text-xs h-8 ${
                        selectedFolderId === folder.id
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      }`}
                    >
                      <button
                        type="button"
                        className="flex-1 text-left truncate py-1"
                        onClick={() => setSelectedFolderId(folder.id)}
                      >
                        {folder.name}
                      </button>
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="ml-auto flex-shrink-0 p-1 rounded"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {folderNotes.map((note) =>
                            renderNoteItem(note, canonicalRoom, folder.id)
                          )}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </SidebarGroup>
                </Collapsible>
              );
            })}
            {/* Unfiled notes */}
            {unfiledNotes.length > 0 && (
              <Collapsible
                open={openKeys.has('__unfiled__')}
                onOpenChange={(isOpen) =>
                  setOpenKeys((prev) => {
                    const next = new Set(prev);
                    if (isOpen) next.add('__unfiled__');
                    else next.delete('__unfiled__');
                    return next;
                  })
                }
                className="group/collapsible"
              >
                <SidebarGroup>
                  <div
                    className={`flex w-full min-w-0 items-center rounded-md px-2 text-xs h-8 ${
                      selectedFolderId === null
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }`}
                  >
                    <button
                      type="button"
                      className="flex-1 text-left truncate py-1"
                      onClick={() => setSelectedFolderId(null)}
                    >
                      Unfiled
                    </button>
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="ml-auto flex-shrink-0 p-1 rounded"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {unfiledNotes.map((note) =>
                          renderNoteItem(note, canonicalRoom)
                        )}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )}
          </>
        )}

        {/* Shared Spaces */}
        {sharedRooms.length > 0 && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Shared Spaces</SidebarGroupLabel>
            </SidebarGroup>
            {sharedRooms.map((room) => {
              const notes = notesByRoomId[room.id] ?? [];
              return (
                <Collapsible
                  key={room.id}
                  title={room.name}
                  data-note-count={notes.length}
                  open={openKeys.has(room.id)}
                  onOpenChange={(isOpen) =>
                    setOpenKeys((prev) => {
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
                        <span
                          title={room.id}
                          className="line-clamp-1 text-left"
                        >
                          {room.name}
                        </span>
                        <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {notes.map((note) => renderNoteItem(note, room))}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </SidebarGroup>
                </Collapsible>
              );
            })}
          </>
        )}
      </SidebarContent>

      {/* Folder creation dialog */}
      <FolderDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        mode="create"
        onSubmit={(name) => createFolder(name)}
      />

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
