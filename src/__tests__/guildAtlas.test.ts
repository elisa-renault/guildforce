import { describe, expect, it } from 'vitest';

import {
  UNCATEGORIZED_COLLECTION,
  buildAtlasCollections,
  filterAtlasDocuments,
  normalizeAtlasCollection,
  normalizeAtlasTags,
  type AtlasDocumentLike,
} from '@/lib/guildAtlas';

const doc = (overrides: Partial<AtlasDocumentLike>): AtlasDocumentLike => ({
  id: 'doc-1',
  title: 'Raid Rules',
  summary: 'Progression expectations',
  content: 'Bring consumables and be ready before invites.',
  collection: 'Raiding',
  tags: ['raid', 'rules'],
  status: 'published',
  visibility_type: 'members',
  updated_at: '2026-05-20T10:00:00.000Z',
  ...overrides,
});

describe('guild Atlas helpers', () => {
  it('normalizes tags and free-text collections', () => {
    expect(normalizeAtlasTags(' Raid, raid, WeakAura,  , Loot ')).toEqual([
      'raid',
      'weakaura',
      'loot',
    ]);
    expect(normalizeAtlasCollection('  Raid prep  ')).toBe('Raid prep');
    expect(normalizeAtlasCollection('   ')).toBeNull();
  });

  it('builds collections from existing documents without predefined categories', () => {
    expect(buildAtlasCollections([
      doc({ id: 'raid', collection: 'Raiding' }),
      doc({ id: 'addons', collection: 'Addons' }),
      doc({ id: 'duplicate', collection: 'Raiding' }),
      doc({ id: 'blank', collection: null }),
    ])).toEqual(['Addons', 'Raiding']);
  });

  it('filters documents by collection, status, visibility, and text query', () => {
    const documents = [
      doc({ id: 'raid', title: 'Raid Rules', collection: 'Raiding', visibility_type: 'members' }),
      doc({ id: 'addons', title: 'WeakAura Setup', collection: 'Addons', tags: ['weakaura'], visibility_type: 'officers' }),
      doc({ id: 'draft', title: 'Trial Notes', collection: 'Recruitment', status: 'draft', content: 'Trial checklist' }),
      doc({ id: 'uncategorized', title: 'Loot Notes', collection: null, content: 'Loot council notes' }),
      doc({ id: 'archived', title: 'Old Guide', collection: 'Raiding', status: 'archived' }),
    ];

    expect(
      filterAtlasDocuments(documents, {
        query: 'weak',
        collection: 'all',
        status: 'published',
        visibility: 'officers',
      }).map((item) => item.id),
    ).toEqual(['addons']);

    expect(
      filterAtlasDocuments(documents, {
        query: 'checklist',
        collection: 'Recruitment',
        status: 'draft',
        visibility: 'all',
      }).map((item) => item.id),
    ).toEqual(['draft']);

    expect(
      filterAtlasDocuments(documents, {
        query: 'loot',
        collection: UNCATEGORIZED_COLLECTION,
        status: 'active',
        visibility: 'all',
      }).map((item) => item.id),
    ).toEqual(['uncategorized']);
  });

  it('treats active discovery as non-archived documents', () => {
    const documents = [
      doc({ id: 'published', status: 'published' }),
      doc({ id: 'draft', status: 'draft' }),
      doc({ id: 'archived', status: 'archived' }),
    ];

    expect(
      filterAtlasDocuments(documents, {
        query: '',
        collection: 'all',
        status: 'active',
        visibility: 'all',
      }).map((item) => item.id),
    ).toEqual(['published', 'draft']);
  });
});
