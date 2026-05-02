/**
 * FrontmatterEditor — editable property panel for Obsidian YAML frontmatter.
 *
 * Shows above the editor for vault-synced notes.
 * Renders frontmatter as typed key-value rows (text, number, boolean, list, date).
 */

import { useState } from 'react';
import type { Note } from '@eweser/db';

interface FrontmatterEditorProps {
  note: Note;
  onUpdate: (frontmatter: Record<string, unknown>) => void;
}

type FieldType = 'text' | 'number' | 'boolean' | 'date' | 'list';

function inferFieldType(value: unknown): FieldType {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value)) return 'list';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value))
    return 'date';
  return 'text';
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function parseInputValue(raw: string, type: FieldType): unknown {
  switch (type) {
    case 'number':
      return raw === '' ? null : Number(raw);
    case 'boolean':
      return raw === 'true';
    case 'list':
      return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    default:
      return raw || null;
  }
}

export default function FrontmatterEditor({
  note,
  onUpdate,
}: FrontmatterEditorProps) {
  const frontmatter = note.frontmatter ?? {};
  const [expanded, setExpanded] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newType, setNewType] = useState<FieldType>('text');
  const [newValue, setNewValue] = useState('');

  const entries = Object.entries(frontmatter);

  const handleChange = (key: string, raw: string, type: FieldType) => {
    onUpdate({
      ...frontmatter,
      [key]: parseInputValue(raw, type),
    });
  };

  const handleDelete = (key: string) => {
    const { [key]: _removed, ...updated } = frontmatter;
    onUpdate(updated);
  };

  const handleAddField = () => {
    const key = newKey.trim();
    if (!key) return;
    onUpdate({ ...frontmatter, [key]: parseInputValue(newValue, newType) });
    setNewKey('');
    setNewValue('');
    setNewType('text');
  };

  return (
    <div className="frontmatter-editor border-b border-border mb-4">
      <button
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-4 py-2 w-full text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="font-mono text-xs">⚙</span>
        <span>
          {expanded ? 'Hide' : 'Show'} properties ({entries.length})
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {entries.map(([key, value]) => {
            const type = inferFieldType(value);
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground w-32 shrink-0 truncate">
                  {key}
                </span>
                {type === 'boolean' ? (
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) =>
                      handleChange(key, String(e.target.checked), type)
                    }
                    className="h-4 w-4"
                  />
                ) : (
                  <input
                    type={
                      type === 'number'
                        ? 'number'
                        : type === 'date'
                          ? 'date'
                          : 'text'
                    }
                    value={renderValue(value)}
                    onChange={(e) => handleChange(key, e.target.value, type)}
                    placeholder={type === 'list' ? 'item1, item2, ...' : ''}
                    className="flex-1 text-sm border border-input rounded px-2 py-1 bg-background"
                  />
                )}
                <button
                  onClick={() => handleDelete(key)}
                  className="text-muted-foreground hover:text-destructive text-xs shrink-0"
                  title={`Delete ${key}`}
                >
                  ✕
                </button>
              </div>
            );
          })}
          <div className="grid gap-2 rounded-lg border border-border/70 bg-background/60 p-3 md:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)_auto]">
            <input
              aria-label="New property name"
              value={newKey}
              onChange={(event) => setNewKey(event.target.value)}
              placeholder="Property"
              className="min-w-0 rounded border border-input bg-background px-2 py-1 text-sm"
            />
            <select
              aria-label="New property type"
              value={newType}
              onChange={(event) => setNewType(event.target.value as FieldType)}
              className="rounded border border-input bg-background px-2 py-1 text-sm"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="date">Date</option>
              <option value="list">List</option>
            </select>
            <input
              aria-label="New property value"
              value={newValue}
              onChange={(event) => setNewValue(event.target.value)}
              placeholder={newType === 'list' ? 'item1, item2' : 'Value'}
              className="min-w-0 rounded border border-input bg-background px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={handleAddField}
              className="rounded border border-border px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
