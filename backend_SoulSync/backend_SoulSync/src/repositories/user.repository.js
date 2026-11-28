import { User } from '../models/user.model.js';
import { ROLES, USER_STATUS } from '../config/constants.js';
import { escapeRegex } from '../utils/text.js';

/** Users are the one collection that is not owner-scoped, so it does not extend BaseRepository. */
export const userRepository = {
  async create(data) {
    const doc = await User.create(data);
    const { passwordHash: _hash, ...safe } = doc.toObject();
    return safe;
  },

  findById(id) {
    return User.findById(id).lean();
  },

  /** Minimal projection used by the authenticate middleware on every request. */
  findForAuth(id) {
    return User.findById(id)
      .select('name email role status timezone aiConsent passwordChangedAt emailVerifiedAt')
      .lean();
  },

  findByEmail(email) {
    return User.findOne({ email }).lean();
  },

  /** Includes the password hash; only for login and password changes. */
  findWithPassword(filter) {
    return User.findOne(filter).select('+passwordHash').lean();
  },

  updateById(id, update) {
    return User.findByIdAndUpdate(id, update, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
  },

  async list({ search, role, status, skip, limit }) {
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ name: pattern }, { email: pattern }];
    }
    const [items, total] = await Promise.all([
      User.find(filter)
        .select('name email role status createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);
    return { items, total };
  },

  countAdmins() {
    return User.countDocuments({ role: ROLES.ADMIN, status: USER_STATUS.ACTIVE });
  },

  count(filter = {}) {
    return User.countDocuments(filter);
  },

  async deleteById(id) {
    const result = await User.deleteOne({ _id: id });
    return result.deletedCount === 1;
  },

  /** Stream active users with the given preference enabled (jobs process them one at a time). */
  cursorActive(extraFilter = {}) {
    return User.find({ status: USER_STATUS.ACTIVE, ...extraFilter })
      .select('name email role status timezone aiConsent reminderPrefs createdAt')
      .lean()
      .cursor();
  },
};
