import { useEffect, useMemo, useState } from 'react';
import type { EditorCommandId } from '@/editor/commands';
import { getSlashMatchCommands } from '@/editor/commands';
import { type SlashMenuState } from '@/editor/slash-commands';

interface EditorSlashMenuProps {
  commandsOpenState: SlashMenuState | null;
  onSelect: (commandId: EditorCommandId) => void;
  onClose: () => void;
}

export function EditorSlashMenu({
  commandsOpenState,
  onSelect,
  onClose,
}: EditorSlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const matches = useMemo(() => {
    if (!commandsOpenState) return [];
    return getSlashMatchCommands(commandsOpenState.query, 10);
  }, [commandsOpenState]);

  useEffect(() => {
    if (!commandsOpenState) return;
    setSelectedIndex(0);
  }, [commandsOpenState]);

  useEffect(() => {
    if (!commandsOpenState) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!commandsOpenState) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % matches.length);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) =>
          prev === 0 ? Math.max(matches.length - 1, 0) : prev - 1
        );
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === 'Enter' && matches[selectedIndex]) {
        event.preventDefault();
        onSelect(matches[selectedIndex].id);
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [commandsOpenState, matches, onClose, onSelect, selectedIndex]);

  if (!commandsOpenState || matches.length === 0) {
    return null;
  }

  return (
    <div
      className="editor-slash-menu fixed z-30 w-72 rounded-md border border-border bg-card shadow-lg shadow-black/20 px-2 py-2"
      style={{
        left: commandsOpenState.x,
        top: commandsOpenState.y,
        transform: 'translateX(-2px) translateY(-100%)',
      }}
    >
      <div className="max-h-64 overflow-auto">
        {matches.map((command, index) => (
          <button
            key={command.id}
            type="button"
            className={`w-full flex items-center gap-2 rounded px-2 py-2 text-left text-sm transition-colors ${
              index === selectedIndex
                ? 'bg-accent text-foreground'
                : 'hover:bg-accent/50 text-muted-foreground'
            }`}
            onMouseEnter={() => setSelectedIndex(index)}
            onClick={() => onSelect(command.id)}
          >
            <command.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{command.label}</span>
            {command.shortcut ? (
              <span className="text-xs text-muted-foreground">
                {command.shortcut}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
