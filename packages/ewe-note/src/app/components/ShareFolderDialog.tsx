import { useState } from 'react';
import { Users, Link2, Copy, Check, UserPlus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface ShareFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderName: string;
  folderId: string;
}

interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: 'editor' | 'viewer';
  avatarColor: string;
}

export function ShareFolderDialog({ open, onOpenChange, folderName, folderId }: ShareFolderDialogProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      role: 'editor',
      avatarColor: '#B85C4A',
    },
  ]);
  const [newEmail, setNewEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const shareLink = `https://ewenote.app/shared/${folderId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddCollaborator = () => {
    if (newEmail && newEmail.includes('@')) {
      const newCollab: Collaborator = {
        id: Date.now().toString(),
        name: newEmail.split('@')[0],
        email: newEmail,
        role: 'editor',
        avatarColor: '#D4907D',
      };
      setCollaborators([...collaborators, newCollab]);
      setNewEmail('');
    }
  };

  const handleRemoveCollaborator = (id: string) => {
    setCollaborators(collaborators.filter((c) => c.id !== id));
  };

  const handleRoleChange = (id: string, role: 'editor' | 'viewer') => {
    setCollaborators(
      collaborators.map((c) => (c.id === id ? { ...c, role } : c))
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Share "{folderName}"</DialogTitle>
          <DialogDescription>
            Share this folder and enable collaborative editing on all documents within it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Share Link */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Share Link</Label>
            <div className="flex gap-2">
              <Input
                value={shareLink}
                readOnly
                className="flex-1 font-mono text-sm"
              />
              <Button onClick={handleCopyLink} variant="outline" size="sm">
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Anyone with this link can access this folder based on their permission level
            </p>
          </div>

          {/* Add Collaborator */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Add People</Label>
            <div className="flex gap-2">
              <Input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCollaborator();
                  }
                }}
                placeholder="Enter email address..."
                className="flex-1"
              />
              <Button onClick={handleAddCollaborator} size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Collaborators List */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              People with Access ({collaborators.length})
            </Label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {collaborators.map((collab) => (
                <div
                  key={collab.id}
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg group"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0"
                    style={{ backgroundColor: collab.avatarColor }}
                  >
                    {collab.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{collab.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {collab.email}
                    </div>
                  </div>
                  <Select
                    value={collab.role}
                    onValueChange={(value: 'editor' | 'viewer') =>
                      handleRoleChange(collab.id, value)
                    }
                  >
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">
                        <div className="text-xs">
                          <div className="font-medium">Editor</div>
                          <div className="text-muted-foreground">Can edit</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="viewer">
                        <div className="text-xs">
                          <div className="font-medium">Viewer</div>
                          <div className="text-muted-foreground">View only</div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => handleRemoveCollaborator(collab.id)}
                    className="p-1.5 hover:bg-background rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ))}

              {collaborators.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No collaborators yet. Add people to start collaborating.
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="bg-accent/50 border border-border rounded-lg p-4">
            <div className="flex gap-3">
              <Users className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Collaborative Editing</p>
                <p className="text-muted-foreground">
                  All documents in this folder support real-time collaborative editing. Changes
                  are synced automatically when multiple people are editing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
