export function isSpaceToSpeakEvent(event: KeyboardEvent): boolean {
  if (
    event.code !== "Space" ||
    event.repeat ||
    event.defaultPrevented ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  ) {
    return false;
  }

  const target = event.target;
  if (!(target instanceof Element)) return true;
  return !target.closest(
    "input, textarea, select, button, a, [contenteditable='true'], [role='button']",
  );
}
