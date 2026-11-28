import { routineRepository } from '../repositories/routine.repository.js';
import { AppError } from '../utils/AppError.js';
import { serialize } from '../utils/serialize.js';

const NOT_FOUND = () => AppError.notFound('Routine not found', 'ROUTINE_NOT_FOUND');

/** Saved, user-reviewed routines (FR-33). At most one routine is active at a time. */
export async function createRoutine(user, input) {
  const routine = await routineRepository.create({ userId: user.id, ...input });
  if (routine.isActive) await routineRepository.deactivateOthers(user.id, routine._id);
  return serialize(routine);
}

export async function listRoutines(user, { skip, limit }) {
  const { items, total } = await routineRepository.listOwned(user.id, {
    sort: { savedAt: -1 },
    skip,
    limit,
  });
  return { items: serialize(items), total };
}

export async function getRoutine(user, id) {
  const routine = await routineRepository.findOwned(user.id, id);
  if (!routine) throw NOT_FOUND();
  return serialize(routine);
}

export async function updateRoutine(user, id, patch) {
  const routine = await routineRepository.updateOwned(user.id, id, { $set: patch });
  if (!routine) throw NOT_FOUND();
  if (patch.isActive) await routineRepository.deactivateOthers(user.id, routine._id);
  return serialize(routine);
}

export async function deleteRoutine(user, id) {
  if (!(await routineRepository.deleteOwned(user.id, id))) throw NOT_FOUND();
}
