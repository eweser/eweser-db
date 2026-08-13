export const UNTITLED_TITLE = 'Untitled';

export function buildDefaultUntitledNoteTitle(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes} ${UNTITLED_TITLE}`;
}

export function isDefaultUntitledNoteTitle(title: string) {
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} Untitled$/.test(title);
}

export function getFirstHeading(text: string) {
  const headingMatch = text.match(/^#\s+(.+)$/m);
  return headingMatch?.[1]?.trim() || null;
}

export function getSyncedTitle(
  currentTitle: string,
  previousText: string,
  nextText: string
) {
  const nextHeading = getFirstHeading(nextText);
  if (!nextHeading) return null;

  return isDefaultUntitledNoteTitle(currentTitle) ||
    currentTitle === getFirstHeading(previousText)
    ? nextHeading
    : null;
}
