export type AtlasDocStatus = 'draft' | 'published' | 'archived';
export type AtlasVisibilityType = 'members' | 'rank' | 'roster' | 'officers';
export type AtlasStatusFilter = 'active' | 'all' | AtlasDocStatus;

export interface AtlasDocumentLike {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  collection: string | null;
  tags: string[];
  status: AtlasDocStatus;
  visibility_type: AtlasVisibilityType;
  updated_at: string;
}

export interface AtlasFilters {
  query: string;
  collection: string;
  status: AtlasStatusFilter;
  visibility: string;
}

export const UNCATEGORIZED_COLLECTION = '__uncategorized__';

export const normalizeAtlasTags = (value: string | string[]) => {
  const source = Array.isArray(value) ? value : value.split(',');

  return Array.from(
    new Set(
      source
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 12);
};

export const normalizeAtlasCollection = (value: string | null | undefined) => {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 80) : null;
};

export const buildAtlasCollections = <T extends AtlasDocumentLike>(documents: T[]) =>
  Array.from(
    new Set(
      documents
        .map((doc) => normalizeAtlasCollection(doc.collection))
        .filter((collection): collection is string => Boolean(collection)),
    ),
  ).sort((a, b) => a.localeCompare(b));

export const filterAtlasDocuments = <T extends AtlasDocumentLike>(
  documents: T[],
  filters: AtlasFilters,
) => {
  const query = filters.query.trim().toLowerCase();

  return documents.filter((doc) => {
    if (filters.collection === UNCATEGORIZED_COLLECTION && normalizeAtlasCollection(doc.collection)) return false;
    if (
      filters.collection !== 'all'
      && filters.collection !== UNCATEGORIZED_COLLECTION
      && normalizeAtlasCollection(doc.collection) !== filters.collection
    ) {
      return false;
    }

    if (filters.status === 'active' && doc.status === 'archived') return false;
    if (filters.status !== 'active' && filters.status !== 'all' && doc.status !== filters.status) return false;
    if (filters.visibility !== 'all' && doc.visibility_type !== filters.visibility) return false;

    if (!query) return true;

    const haystack = [
      doc.title,
      doc.summary || '',
      doc.content,
      doc.collection || '',
      doc.tags.join(' '),
    ].join(' ').toLowerCase();

    return haystack.includes(query);
  });
};
