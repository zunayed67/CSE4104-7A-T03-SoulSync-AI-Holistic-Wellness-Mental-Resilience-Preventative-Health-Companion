import { Resource } from '../models/resource.model.js';
import { escapeRegex } from '../utils/text.js';

export const resourceRepository = {
  create(data) {
    return Resource.create(data).then((doc) => doc.toObject());
  },

  findById(id) {
    return Resource.findById(id).lean();
  },

  findPublishedById(id) {
    return Resource.findOne({ _id: id, isPublished: true }).lean();
  },

  /** Library search. `search` is matched case-insensitively against title, category and content. */
  async search({ search, type, category, publishedOnly = true, select, skip, limit }) {
    const filter = {};
    if (publishedOnly) filter.isPublished = true;
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ title: pattern }, { category: pattern }, { content: pattern }];
    }
    const [items, total] = await Promise.all([
      Resource.find(filter, select).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Resource.countDocuments(filter),
    ]);
    return { items, total };
  },

  distinctCategories() {
    return Resource.distinct('category', { isPublished: true });
  },

  update(id, update) {
    return Resource.findByIdAndUpdate(id, update, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
  },

  async delete(id) {
    const result = await Resource.deleteOne({ _id: id });
    return result.deletedCount === 1;
  },

  count(filter = {}) {
    return Resource.countDocuments(filter);
  },
};
