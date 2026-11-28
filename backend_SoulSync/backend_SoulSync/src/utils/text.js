/** Escape user input before embedding it in a RegExp (prevents regex injection / ReDoS). */
export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Shorten `value` to at most `max` characters, adding an ellipsis when cut. */
export function truncate(value, max) {
  const text = String(value ?? '');
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`;
}
