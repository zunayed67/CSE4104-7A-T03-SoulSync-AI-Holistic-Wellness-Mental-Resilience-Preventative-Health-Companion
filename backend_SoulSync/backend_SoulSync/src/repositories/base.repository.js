/**
 * Generic data-access helpers. Every "owned" method filters on BOTH the record id and the owner,
 * so a user can never read or change another user's record, even with a guessed id. A miss is
 * reported as `null`/`false`, which controllers turn into 404 (never 403, so ids are not leaked).
 * All reads use `.lean()` and return plain objects.
 */
export class BaseRepository {
  /**
   * @param {import('mongoose').Model} model
   * @param {{ ownerField?: string }} [options]
   */
  constructor(model, { ownerField = 'userId' } = {}) {
    this.model = model;
    this.ownerField = ownerField;
  }

  ownedFilter(ownerId, id) {
    return { _id: id, [this.ownerField]: ownerId };
  }

  async create(data) {
    const doc = await this.model.create(data);
    return doc.toObject();
  }

  findOwned(ownerId, id, { select } = {}) {
    return this.model.findOne(this.ownedFilter(ownerId, id), select).lean();
  }

  /**
   * @returns {Promise<{ items: object[], total: number }>}
   */
  async listOwned(
    ownerId,
    { filter = {}, sort = { createdAt: -1 }, skip = 0, limit = 20, select } = {},
  ) {
    const query = { ...filter, [this.ownerField]: ownerId };
    const [items, total] = await Promise.all([
      this.model.find(query, select).sort(sort).skip(skip).limit(limit).lean(),
      this.model.countDocuments(query),
    ]);
    return { items, total };
  }

  countOwned(ownerId, filter = {}) {
    return this.model.countDocuments({ ...filter, [this.ownerField]: ownerId });
  }

  /** Update by id + owner and return the new document (validators run), or null. */
  updateOwned(ownerId, id, update) {
    return this.model
      .findOneAndUpdate(this.ownedFilter(ownerId, id), update, {
        returnDocument: 'after',
        runValidators: true,
      })
      .lean();
  }

  async deleteOwned(ownerId, id) {
    const result = await this.model.deleteOne(this.ownedFilter(ownerId, id));
    return result.deletedCount === 1;
  }

  async deleteAllForOwner(ownerId) {
    const result = await this.model.deleteMany({ [this.ownerField]: ownerId });
    return result.deletedCount;
  }
}
