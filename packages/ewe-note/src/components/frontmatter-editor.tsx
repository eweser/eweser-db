/**
 * FrontmatterEditor — editable property panel for Obsidian YAML frontmatter.
 *
 * Shows above the BlockNote editor for vault-synced notes.
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

  const entries = Object.entries(frontmatter);

  if (entries.length === 0) {
    return null;
  }

  const handleChange = (key: string, raw: string, type: FieldType) => {
    onUpdate({
      ...frontmatter,
      [key]: parseInputValue(raw, type),
    });
  };

  const handleDelete = (key: string) => {
    const updated = { ...frontmatter };
    delete updated[key];
    onUpdate(updated);
  };

  const handleAddField = () => {
    const key = prompt('Property name:');
    if (!key?.trim()) return;
    onUpdate({ ...frontmatter, [key.trim()]: '' });
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
          <button
            onClick={handleAddField}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            + Add property
          </button>
        </div>
      )}
    </div>
  );
}
