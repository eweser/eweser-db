import { useState } from 'react';
import { useNavigate } from 'react-router';
import { FileCode, Plus, X, Trash2 } from 'lucide-react';
import { useNotes } from '../contexts/NotesContext';
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
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';

interface TemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplatesDialog({ open, onOpenChange }: TemplatesDialogProps) {
  const navigate = useNavigate();
  const { templates, addTemplate, deleteTemplate, addNote } = useNotes();
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');

  const handleUseTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      const newNote = addNote({
        title: 'Untitled',
        content: template.content,
        properties: template.properties,
        tags: template.tags,
        folder: 'personal',
      });
      navigate(`/editor/${newNote.id}`);
      onOpenChange(false);
    }
  };

  const handleCreateTemplate = () => {
    if (newTemplateName && newTemplateContent) {
      addTemplate({
        name: newTemplateName,
        content: newTemplateContent,
      });
      setNewTemplateName('');
      setNewTemplateContent('');
      setShowNewTemplate(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Templates</DialogTitle>
          <DialogDescription>
            Create new notes from templates or manage your template library
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {!showNewTemplate && (
            <Button
              onClick={() => setShowNewTemplate(true)}
              variant="outline"
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Template
            </Button>
          )}

          {showNewTemplate && (
            <div className="p-4 border border-border rounded-lg space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">New Template</h3>
                <button
                  onClick={() => setShowNewTemplate(false)}
                  className="p-1 hover:bg-accent rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g., Weekly Review"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="template-content">Template Content</Label>
                <Textarea
                  id="template-content"
                  value={newTemplateContent}
                  onChange={(e) => setNewTemplateContent(e.target.value)}
                  placeholder="# Template Title&#10;&#10;Your template content here..."
                  className="mt-1 min-h-[200px] font-mono text-sm"
                />
              </div>
              <Button onClick={handleCreateTemplate} className="w-full">
                Create Template
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="p-4 border border-border rounded-lg hover:shadow-sm transition-shadow group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-primary" />
                    <h3 className="font-medium">{template.name}</h3>
                  </div>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `Are you sure you want to delete the "${template.name}" template?`
                        )
                      ) {
                        deleteTemplate(template.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3 font-mono">
                  {template.content.substring(0, 150)}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {template.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Button
                  onClick={() => handleUseTemplate(template.id)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Use Template
                </Button>
              </div>
            ))}
          </div>

          {templates.length === 0 && !showNewTemplate && (
            <div className="text-center py-12">
              <FileCode className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-medium mb-1">No templates yet</h3>
              <p className="text-sm text-muted-foreground">
                Create your first template to speed up note creation
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
