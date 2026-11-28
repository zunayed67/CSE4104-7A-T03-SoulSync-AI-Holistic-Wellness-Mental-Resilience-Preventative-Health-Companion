import { journalEntryRepository } from '../repositories/journalEntry.repository.js';
import { AppError } from '../utils/AppError.js';
import { getDayBounds } from '../utils/date.js';
import { serialize } from '../utils/serialize.js';

const NOT_FOUND = () => AppError.notFound('Journal entry not found', 'JOURNAL_ENTRY_NOT_FOUND');

/** Private journal (FR-15/16). Every query is owner-scoped; the text never goes to the AI provider or the logs. */
export async function createEntry(user, input) {
  const entry = await journalEntryRepository.create({ userId: user.id, ...input });
  return serialize(entry);
}

export async function listEntries(user, { type, tag, from, to, skip, limit }) {
  const filter = {};
  if (type) filter.type = type;
  if (tag) filter.tags = tag.toLowerCase();
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = getDayBounds(from, user.timezone).start;
    if (to) filter.createdAt.$lt = getDayBounds(to, user.timezone).end;
  }
  const { items, total } = await journalEntryRepository.listOwned(user.id, { filter, skip, limit });
  return { items: serialize(items), total };
}

export async function getEntry(user, id) {
  const entry = await journalEntryRepository.findOwned(user.id, id);
  if (!entry) throw NOT_FOUND();
  return serialize(entry);
}

export async function updateEntry(user, id, patch) {
  const entry = await journalEntryRepository.updateOwned(user.id, id, { $set: patch });
  if (!entry) throw NOT_FOUND();
  return serialize(entry);
}

export async function deleteEntry(user, id) {
  if (!(await journalEntryRepository.deleteOwned(user.id, id))) throw NOT_FOUND();
}
