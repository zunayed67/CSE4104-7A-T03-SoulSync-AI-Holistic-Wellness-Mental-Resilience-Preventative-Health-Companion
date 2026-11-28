/**
 * Convert a lean Mongoose document (or array of them) to its API shape: `_id` becomes `id`,
 * and internals (`__v`, `passwordHash`, owner `userId`) are dropped so they can never leak.
 */
export function serialize(doc) {
  if (!doc) return doc;
  if (Array.isArray(doc)) return doc.map(serialize);
  const { _id, __v: _v, passwordHash: _hash, userId: _owner, ...rest } = doc;
  return { id: String(_id), ...rest };
}
