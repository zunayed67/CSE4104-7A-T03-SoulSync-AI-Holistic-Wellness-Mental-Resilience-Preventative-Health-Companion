import { contentReportRepository } from '../repositories/contentReport.repository.js';
import { resourceRepository } from '../repositories/resource.repository.js';
import { AppError } from '../utils/AppError.js';
import { serialize } from '../utils/serialize.js';

/** A user reports a published resource (FR-19, UC-09). One open report per user and resource. */
export async function createReport(user, { resourceId, reason }) {
  const resource = await resourceRepository.findPublishedById(resourceId);
  if (!resource) throw AppError.notFound('Resource not found', 'RESOURCE_NOT_FOUND');
  try {
    const report = await contentReportRepository.create({
      reporterId: user.id,
      resourceId,
      reason,
    });
    return serialize({ ...report, userId: undefined });
  } catch (err) {
    if (err?.code === 11000) {
      throw AppError.conflict('You have already reported this resource.', 'ALREADY_REPORTED');
    }
    throw err;
  }
}

/* ---- Admin review queue (FR-49, UC-20) ---- */

export async function adminList({ status, skip, limit }) {
  const { items, total } = await contentReportRepository.list({ status, skip, limit });
  return {
    items: items.map(({ resourceId, reporterId, ...rest }) => ({
      ...serialize(rest),
      reporterId: String(reporterId),
      resource: resourceId ? serialize(resourceId) : null,
    })),
    total,
  };
}

/**
 * Review a report: `dismiss` closes it; `unpublish` hides the resource and closes every open
 * report about it.
 * @param {string} adminId
 * @param {string} reportId
 * @param {'dismiss' | 'unpublish'} action
 */
export async function adminReview(adminId, reportId, action) {
  const report = await contentReportRepository.findById(reportId);
  if (!report) throw AppError.notFound('Report not found', 'REPORT_NOT_FOUND');
  if (report.status !== 'open') {
    throw AppError.conflict('This report has already been reviewed.', 'REPORT_ALREADY_REVIEWED');
  }

  if (action === 'unpublish') {
    await resourceRepository.update(report.resourceId, { $set: { isPublished: false } });
    await contentReportRepository.resolveOpenForResource(report.resourceId, {
      status: 'reviewed',
      reviewedBy: adminId,
    });
  } else {
    await contentReportRepository.update(reportId, {
      $set: { status: 'dismissed', reviewedBy: adminId, reviewedAt: new Date() },
    });
  }
  return serialize(await contentReportRepository.findById(reportId));
}
