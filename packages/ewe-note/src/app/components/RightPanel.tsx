import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Link2,
  List,
  Tag,
  X,
  ChevronRight,
  Hash,
  FileText,
  Plus,
} from 'lucide-react';
import { useNotes } from '../contexts/NotesContext';
import { extractMarkdownOutline } from './right-panel-outline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Input } from './ui/input';

interface RightPanelProps {
  noteId: string;
  onClose?: () => void;
}

export function RightPanel({ noteId, onClose }: RightPanelProps) {
  const navigate = useNavigate();
  const { notes, updateNote, convertUnlinkedMentionToLink } = useNotes();
  const [newTag, setNewTag] = useState('');
  const [newPropertyKey, setNewPropertyKey] = useState('');
  const [newPropertyValue, setNewPropertyValue] = useState('');

  const note = notes.find((n) => n.id === noteId);
  if (!note) return null;

  const backlinks = notes.filter((n) => n.links.includes(noteId));
  const outgoingLinks =
    note.outgoingLinks.length > 0
      ? note.outgoingLinks
      : note.links.map((linkId) => ({
          target: notes.find((n) => n.id === linkId)?.title ?? linkId,
          noteId: linkId,
          display: '',
          raw: '',
          alias: undefined,
          heading: undefined,
          blockRef: undefined,
        }));
  const unresolvedOutgoingLinks = outgoingLinks.filter((link) => !link.noteId);
  const resolvedOutgoingLinks = outgoingLinks.filter((link) => !!link.noteId);
  const unlinkedMentions = note.unlinkedMentions.map((mention) => {
    const targetNote = notes.find((n) => n.id === mention.noteId);
    return {
      ...mention,
      title: targetNote?.title,
    };
  });

  const headings = extractMarkdownOutline(note.content);

  const handleAddTag = () => {
    if (newTag && !note.tags.includes(newTag)) {
      updateNote(noteId, {
        tags: [...note.tags, newTag],
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    updateNote(noteId, {
      tags: note.tags.filter((t) => t !== tag),
    });
  };

  const handleAddProperty = () => {
    if (newPropertyKey && newPropertyValue) {
      updateNote(noteId, {
        properties: {
          ...note.properties,
          [newPropertyKey]: newPropertyValue,
        },
      });
      setNewPropertyKey('');
      setNewPropertyValue('');
    }
  };

  const handleRemoveProperty = (key: string) => {
    const { [key]: _, ...rest } = note.properties;
    updateNote(noteId, { properties: rest });
  };

  return (
    <aside
      data-cy="ewe-note-right-panel"
      className="flex h-full w-full shrink-0 flex-col overflow-hidden border-l border-border bg-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <h2 className="text-sm font-medium text-foreground">Note Info</h2>
        {onClose && (
          <button
            type="button"
            aria-label="Close note info"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        defaultValue="outline"
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="mx-4 mt-3 grid w-auto grid-cols-3 bg-muted/60">
          <TabsTrigger value="outline" className="text-xs">
            <List className="w-3.5 h-3.5 mr-1.5" />
            Outline
          </TabsTrigger>
          <TabsTrigger value="backlinks" className="text-xs">
            <Link2 className="w-3.5 h-3.5 mr-1.5" />
            Links
          </TabsTrigger>
          <TabsTrigger value="properties" className="text-xs">
            <Tag className="w-3.5 h-3.5 mr-1.5" />
            Meta
          </TabsTrigger>
        </TabsList>

        {/* Outline Tab */}
        <TabsContent
          value="outline"
          className="flex-1 overflow-y-auto px-4 pb-4 mt-4"
        >
          {headings.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No headings found in this note
            </div>
          ) : (
            <div className="space-y-1">
              {headings.map((heading, index) => (
                <button
                  key={index}
                  onClick={() => {
                    document
                      .querySelector(`[data-heading-anchor="${heading.id}"]`)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-accent transition-colors text-sm group"
                  style={{ paddingLeft: `${(heading.level - 1) * 12 + 8}px` }}
                >
                  <ChevronRight className="w-3 h-3 inline-block mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {heading.text}
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Backlinks Tab */}
        <TabsContent
          value="backlinks"
          className="flex-1 overflow-y-auto px-4 pb-4 mt-4"
        >
          <div className="space-y-4">
            {/* Outgoing Links */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">
                Outgoing Links ({outgoingLinks.length})
              </h3>
              {outgoingLinks.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No outgoing links
                </div>
              ) : (
                <div className="space-y-1">
                  {resolvedOutgoingLinks.map((link) => {
                    const linkedNote = link.noteId
                      ? notes.find((n) => n.id === link.noteId)
                      : null;
                    const content = (
                      <>
                        <FileText className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {linkedNote?.title ?? link.target}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {linkedNote
                              ? `${linkedNote.content.substring(0, 100)}...`
                              : 'Unresolved wiki link'}
                          </div>
                        </div>
                      </>
                    );

                    return linkedNote && link.noteId ? (
                      <button
                        key={`${link.target}:${link.noteId}`}
                        onClick={() => navigate(`/editor/${link.noteId}`)}
                        className="w-full flex items-start gap-2 px-2 py-2 rounded hover:bg-accent transition-colors text-left group"
                      >
                        {content}
                      </button>
                    ) : (
                      <div
                        key={link.target}
                        className="w-full flex items-start gap-2 px-2 py-2 rounded text-left"
                      >
                        {content}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Unresolved Outgoing Links */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">
                Unresolved Links ({unresolvedOutgoingLinks.length})
              </h3>
              {unresolvedOutgoingLinks.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No unresolved links
                </div>
              ) : (
                <div className="space-y-1">
                  {unresolvedOutgoingLinks.map((link) => {
                    const context = [
                      link.heading ? `#${link.heading}` : '',
                      link.blockRef ? `#^${link.blockRef}` : '',
                      link.alias ? ` (${link.alias})` : '',
                    ]
                      .join('')
                      .trim();
                    return (
                      <div
                        key={
                          link.raw ||
                          `${link.target}:${link.noteId ?? link.alias}`
                        }
                        role="status"
                        aria-label={`Unresolved wiki link: ${link.target}`}
                        data-cy="ewe-note-unresolved-wiki-link"
                        className="w-full flex items-start gap-2 px-2 py-2 rounded bg-muted/30"
                      >
                        <FileText className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {link.target}
                            {context ? ` ${context}` : ''}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Unresolved wiki link
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Backlinks */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">
                Backlinks ({backlinks.length})
              </h3>
              {backlinks.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No backlinks
                </div>
              ) : (
                <div className="space-y-1">
                  {backlinks.map((backlink) => (
                    <button
                      key={backlink.id}
                      onClick={() => navigate(`/editor/${backlink.id}`)}
                      className="w-full flex items-start gap-2 px-2 py-2 rounded hover:bg-accent transition-colors text-left group"
                    >
                      <Link2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {backlink.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {backlink.content.substring(0, 100)}...
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Unlinked Mentions */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">
                Unlinked Mentions ({unlinkedMentions.length})
              </h3>
              {unlinkedMentions.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No unlinked mentions
                </div>
              ) : (
                <div className="space-y-1">
                  {unlinkedMentions.map((mention) => (
                    <div
                      key={mention.noteId}
                      className="flex items-start gap-2 px-2 py-2 rounded border border-dashed border-border text-sm"
                    >
                      <FileText className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {mention.title ?? mention.noteId}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {mention.mention}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20"
                        onClick={() =>
                          convertUnlinkedMentionToLink(
                            note.id,
                            mention.noteId,
                            mention.mention
                          )
                        }
                      >
                        Convert
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Properties Tab */}
        <TabsContent
          value="properties"
          className="flex-1 overflow-y-auto px-4 pb-4 mt-4"
        >
          <div className="space-y-4">
            {/* Tags */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">
                Tags
              </h3>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {note.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs pr-1 group cursor-pointer"
                  >
                    <Hash className="w-3 h-3 mr-0.5" />
                    {tag}
                    <button
                      type="button"
                      aria-label={`Remove tag ${tag}`}
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 p-0.5 rounded hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  data-cy="ewe-note-add-tag-input"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddTag();
                    }
                  }}
                  placeholder="Add tag..."
                  className="h-8 text-sm"
                />
                <button
                  type="button"
                  aria-label="Add tag"
                  data-cy="ewe-note-add-tag-btn"
                  onClick={handleAddTag}
                  className="px-3 h-8 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-1 text-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Properties */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">
                Properties
              </h3>
              <div className="space-y-2 mb-3">
                {Object.entries(note.properties).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between px-2 py-1.5 bg-muted/50 rounded group"
                  >
                    <div className="flex-1">
                      <div className="text-xs font-medium">{key}</div>
                      <div className="text-xs text-muted-foreground">
                        {value}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove property ${key}`}
                      onClick={() => handleRemoveProperty(key)}
                      className="p-1 rounded hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Input
                  data-cy="ewe-note-add-property-key"
                  value={newPropertyKey}
                  onChange={(e) => setNewPropertyKey(e.target.value)}
                  placeholder="Property name..."
                  className="h-8 text-sm"
                />
                <div className="flex gap-2">
                  <Input
                    data-cy="ewe-note-add-property-value"
                    value={newPropertyValue}
                    onChange={(e) => setNewPropertyValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddProperty();
                      }
                    }}
                    placeholder="Property value..."
                    className="h-8 text-sm"
                  />
                  <button
                    type="button"
                    aria-label="Add property"
                    data-cy="ewe-note-add-property-btn"
                    onClick={handleAddProperty}
                    className="px-3 h-8 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-1 text-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">
                Metadata
              </h3>
              <div className="space-y-2 text-xs">
                {note.sourcePath ? (
                  <div className="flex justify-between gap-3">
                    <span className="shrink-0 text-muted-foreground">
                      Source path
                    </span>
                    <span className="min-w-0 text-right [overflow-wrap:anywhere]">
                      {note.sourcePath}
                    </span>
                  </div>
                ) : null}
                {note.sourceVault ? (
                  <div className="flex justify-between gap-3">
                    <span className="shrink-0 text-muted-foreground">
                      Source vault
                    </span>
                    <span className="min-w-0 text-right [overflow-wrap:anywhere]">
                      {note.sourceVault}
                    </span>
                  </div>
                ) : null}
                {note.sourceDirectory ? (
                  <div className="flex justify-between gap-3">
                    <span className="shrink-0 text-muted-foreground">
                      Directory
                    </span>
                    <span className="min-w-0 text-right [overflow-wrap:anywhere]">
                      {note.sourceDirectory}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Words</span>
                  <span>{note.content.split(/\s+/).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Characters</span>
                  <span>{note.content.length}</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
