import { useState } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Icons } from '@/lib/icons';

export type FolderDialogMode = 'create' | 'rename';

export type FolderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: FolderDialogMode;
  initialName?: string;
  onSubmit: (name: string) => void;
};

export function FolderDialog({
  open,
  onOpenChange,
  mode,
  initialName = '',
  onSubmit,
}: FolderDialogProps) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  const handleSubmit = () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      onSubmit(name.trim());
      onOpenChange(false);
      setName('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'New Folder' : 'Rename Folder'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Give this folder a name.'
              : 'Enter a new name for the folder.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label htmlFor="folder-name-input">Folder Name</Label>
          <Input
            id="folder-name-input"
            data-cy="ewe-note-folder-name-input"
            type="text"
            placeholder="Enter folder name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            disabled={saving}
            autoFocus
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={saving}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            data-cy="ewe-note-folder-submit"
            onClick={handleSubmit}
            disabled={saving || !name.trim()}
          >
            {saving ? <Icons.Spinner className="mr-2" /> : null}
            {mode === 'create' ? 'Create Folder' : 'Rename'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
