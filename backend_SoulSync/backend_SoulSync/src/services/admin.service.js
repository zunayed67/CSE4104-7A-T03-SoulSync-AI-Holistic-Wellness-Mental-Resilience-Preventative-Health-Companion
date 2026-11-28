import { ROLES, USER_STATUS } from '../config/constants.js';
import { contentReportRepository } from '../repositories/contentReport.repository.js';
import { resourceRepository } from '../repositories/resource.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { AppError } from '../utils/AppError.js';
import { serialize } from '../utils/serialize.js';
import { deleteUserAndData } from './user.service.js';

/**
 * Administration (FR-47, FR-50). Admins see only non-sensitive account fields (name, email, role,
 * status, join date). Nothing in this module touches wellness logs, journals or conversations,
 * and the routes that call it are role-guarded.
 */

/** Resolve the target and refuse self-targeting or acting on other administrators. */
async function loadManageableUser(adminId, targetId) {
  if (String(adminId) === String(targetId)) {
    throw AppError.badRequest(
      'You cannot perform this action on your own account.',
      'CANNOT_TARGET_SELF',
    );
  }
  const target = await userRepository.findById(targetId);
  if (!target) throw AppError.notFound('User not found', 'USER_NOT_FOUND');
  if (target.role === ROLES.ADMIN) {
    throw AppError.forbidden(
      'Administrator accounts cannot be modified here.',
      'CANNOT_MODIFY_ADMIN',
    );
  }
  return target;
}

export async function listUsers({ search, role, status, skip, limit }) {
  const { items, total } = await userRepository.list({ search, role, status, skip, limit });
  return { items: serialize(items), total };
}

export async function setUserStatus(adminId, targetId, status) {
  await loadManageableUser(adminId, targetId);
  const updated = await userRepository.updateById(targetId, { $set: { status } });
  const { name, email, role, status: newStatus, createdAt } = updated;
  return { id: String(updated._id), name, email, role, status: newStatus, createdAt };
}

export async function deleteUser(adminId, targetId) {
  const target = await loadManageableUser(adminId, targetId);
  await deleteUserAndData(target);
}

/** Basic platform activity: counts only (UC-18 "monitor basic platform activity"). */
export async function getStats() {
  const [users, active, suspended, admins, resources, published, openReports] = await Promise.all([
    userRepository.count(),
    userRepository.count({ status: USER_STATUS.ACTIVE }),
    userRepository.count({ status: USER_STATUS.SUSPENDED }),
    userRepository.count({ role: ROLES.ADMIN }),
    resourceRepository.count(),
    resourceRepository.count({ isPublished: true }),
    contentReportRepository.count({ status: 'open' }),
  ]);
  return {
    users: { total: users, active, suspended, admins },
    resources: { total: resources, published },
    contentReports: { open: openReports },
  };
}
