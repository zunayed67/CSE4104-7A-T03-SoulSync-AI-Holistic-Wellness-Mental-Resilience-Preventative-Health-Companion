import { Routine } from '../models/routine.model.js';
import { BaseRepository } from './base.repository.js';

class RoutineRepository extends BaseRepository {
  constructor() {
    super(Routine);
  }

  /** Only one routine can be active at a time. */
  deactivateOthers(userId, exceptId) {
    return this.model.updateMany(
      { userId, _id: { $ne: exceptId }, isActive: true },
      { $set: { isActive: false } },
    );
  }
}

export const routineRepository = new RoutineRepository();
