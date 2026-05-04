type FolderTreeNode = {
  id: string;
  parentId: string | null;
};

export function collectFolderTreeIds(
  folderId: string,
  folders: FolderTreeNode[]
) {
  const seen = new Set<string>();
  const pending = [folderId];

  while (pending.length > 0) {
    const currentId = pending.pop();
    if (!currentId || seen.has(currentId)) continue;

    seen.add(currentId);

    for (const folder of folders) {
      if (folder.parentId === currentId && !seen.has(folder.id)) {
        pending.push(folder.id);
      }
    }
  }

  return seen;
}
