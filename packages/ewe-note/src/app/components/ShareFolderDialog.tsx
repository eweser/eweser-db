import { useState } from 'react';
import { Users, Copy, Check } from 'lucide-react';
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

interface ShareFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderName: string;
  folderId: string;
}

export function ShareFolderDialog({
  open,
  onOpenChange,
  folderName,
  folderId,
}: ShareFolderDialogProps) {
  const [copied, setCopied] = useState(false);
  const shareLink = `${window.location.origin}/?folder=${encodeURIComponent(folderId)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-cy="ewe-note-share-dialog" className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Share "{folderName}"</DialogTitle>
          <DialogDescription>
            This copies a local navigation link. It does not grant another user
            access to the folder or its notes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Share Link */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Local folder link
            </Label>
            <div className="flex gap-2">
              <Input
                data-cy="ewe-note-share-link-input"
                value={shareLink}
                readOnly
                className="flex-1 font-mono text-sm"
              />
              <Button
                data-cy="ewe-note-share-copy-btn"
                onClick={handleCopyLink}
                variant="outline"
                size="sm"
              >
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
          </div>

          {/* Info */}
          <div className="bg-accent/50 border border-border rounded-lg p-4">
            <div className="flex gap-3">
              <Users className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Access grants not included</p>
                <p className="text-muted-foreground">
                  Real collaboration will use EweserDB shared rooms and
                  auditable grants. Until that exists here, this link is only a
                  shortcut for this browser profile.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
