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
import { useState } from 'react';
import removeMarkdown from 'markdown-to-text';
import {
  Dialog,
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
  const [refreshKey, setRefreshKey] = useState(0);
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
    } catch (error: any) {
      alert(error.message);
    } finally {
      setCreatingRoom(false);
      setNewRoomName('');
    }
  };
  const handleCreateNote = () => {
    if (!selectedRoom) {
      throw new Error('No room selected');
    }
    const newNote = selectedRoom.getDocuments().new({ text: '# New Note' });
    setSelectedNoteId(newNote._id);
  };

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SearchForm />
      </SidebarHeader>
      <SidebarContent className="gap-0" key={refreshKey}>
        <div className="flex align-middle justify-center">
          <Button variant="ghost" onClick={handleCreateNote}>
            <SquarePen />
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost">
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
                  type="text"
                  placeholder="Enter folder name"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  disabled={creatingRoom}
                />
              </div>
              <DialogFooter>
                <Button variant="secondary" disabled={creatingRoom}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRoom} disabled={creatingRoom}>
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
          const docs = room.getDocuments();
          docs.onChange(() => setRefreshKey(refreshKey + 1));
          const notes = docs.toArray(docs.sortByRecent(docs.getUndeleted()));
          return (
            <Collapsible
              key={room.id}
              title={room.name}
              defaultOpen={selectedRoom?.id === room.id}
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
          <button onClick={signOut} className="flex items-center space-x-2">
            <Icons.Logo className="h-6 w-6" />
            <span className="inline-block font-bold">Logout</span>
          </button>
        ) : (
          <a href={loginUrl} className="flex items-center space-x-2">
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
