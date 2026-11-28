import { resourceRepository } from '../repositories/resource.repository.js';
import { AppError } from '../utils/AppError.js';
import { serialize } from '../utils/serialize.js';

const NOT_FOUND = () => AppError.notFound('Resource not found', 'RESOURCE_NOT_FOUND');

/** What a regular user may see: no author id, no publish flag. */
function presentPublic(resource) {
  const { createdBy: _createdBy, isPublished: _isPublished, ...rest } = serialize(resource);
  return rest;
}

/** Library browsing (FR-18): published items only; list entries omit the long content body. */
export async function listPublished(_user, { search, type, category, skip, limit }) {
  const { items, total } = await resourceRepository.search({
    search,
    type,
    category,
    publishedOnly: true,
    select: '-content',
    skip,
    limit,
  });
  return { items: items.map(presentPublic), total };
}

export async function getPublished(_user, id) {
  const resource = await resourceRepository.findPublishedById(id);
  if (!resource) throw NOT_FOUND();
  return presentPublic(resource);
}

export async function listCategories() {
  return (await resourceRepository.distinctCategories()).sort();
}

/* ---- Admin content management (FR-48): reached only through admin-guarded routes ---- */

export async function adminList(query) {
  const { items, total } = await resourceRepository.search({
    ...query,
    publishedOnly: false,
    select: '-content',
  });
  return { items: serialize(items), total };
}

export async function adminGet(id) {
  const resource = await resourceRepository.findById(id);
  if (!resource) throw NOT_FOUND();
  return serialize(resource);
}

export async function adminCreate(adminId, input) {
  return serialize(await resourceRepository.create({ ...input, createdBy: adminId }));
}

export async function adminUpdate(id, patch) {
  const resource = await resourceRepository.update(id, { $set: patch });
  if (!resource) throw NOT_FOUND();
  return serialize(resource);
}

export async function adminSetPublished(id, isPublished) {
  return adminUpdate(id, { isPublished });
}

export async function adminDelete(id) {
  if (!(await resourceRepository.delete(id))) throw NOT_FOUND();
}
