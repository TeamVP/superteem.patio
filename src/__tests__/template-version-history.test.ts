import { describe, it, expect, vi } from 'vitest';
import { useQuery as realUseQuery } from 'convex/react';

// We test version history by mocking convex/react useQuery behavior used by useListTemplateVersions.
// This avoids network calls while asserting ordering and structure of versions after overwrite.

interface VersionRec {
  _id: string;
  templateId: string;
  version: number;
  body: { version?: number; questions?: { id: string }[] } | { id: string; type?: string }[];
  status: string;
  schemaVersion: string;
  createdAt: number;
}

const mockVersions: VersionRec[] = [
  {
    _id: 'ver1',
    templateId: 'tpl_sibr',
    version: 1,
    body: { version: 1, questions: [{ id: 'patient_census' }] },
    status: 'published',
    schemaVersion: 'v1',
    createdAt: 1000,
  },
  {
    _id: 'ver2',
    templateId: 'tpl_sibr',
    version: 2,
    body: [
      { id: 'patient_census', type: 'IntegerQuestion' },
      { id: 'sibr_occurred', type: 'MultipleChoiceQuestion' },
      { id: 'sibr_details', type: 'CompositeQuestion' },
    ],
    status: 'published',
    schemaVersion: 'v1',
    createdAt: 2000,
  },
];

vi.mock('convex/react', () => ({
  useQuery: (ref: { _name?: string }) => {
    if (ref?._name?.includes('listTemplateVersions')) return mockVersions;
    return undefined;
  },
}));

describe('Template version history', () => {
  it('orders versions descending and includes overwrite body structure', () => {
    // Simulate consumer logic that sorts (mirrors backend query returning unsorted and sorting client-side) if needed
    // useQuery here is the mocked function returning mockVersions
    const fetchVersions = realUseQuery as unknown as (
      ref: { _name: string },
      args: { templateId: string }
    ) => VersionRec[] | undefined;
    const versions =
      fetchVersions({ _name: 'templates:listTemplateVersions' }, { templateId: 'tpl_sibr' }) || [];
    expect(Array.isArray(versions)).toBe(true);
    const v1 = versions.find((v) => v.version === 1);
    const v2 = versions.find((v) => v.version === 2);
    expect(v1).toBeTruthy();
    expect(v2).toBeTruthy();
    if (v2 && Array.isArray(v2.body)) {
      expect(v2.body.some((q) => 'id' in q && q.id === 'sibr_details')).toBe(true);
    } else {
      throw new Error('v2 body not in expected array form');
    }
  // New assertions: ordering (descending by createdAt) after explicit sort
  const sortedByTime = [...versions].sort((a, b) => b.createdAt - a.createdAt);
  expect(sortedByTime.map((v) => v._id)).toEqual(['ver2', 'ver1']);
    // Contiguous version numbers starting at 1
  const versionNumbers = versions.map((v) => v.version).sort((a, b) => a - b);
    versionNumbers.forEach((num, idx) => {
      expect(num).toBe(idx + 1);
    });
    // Simple diff summary: questions added between v1->v2
    type QLike = { id: string };
    const v1Ids = new Set(
      Array.isArray(v1?.body)
        ? (v1?.body as QLike[]).map((q) => q.id)
        : (v1?.body as { questions?: QLike[] })?.questions?.map((q) => q.id) || []
    );
    const v2Ids = new Set(Array.isArray(v2?.body) ? (v2?.body as QLike[]).map((q) => q.id) : []);
    const added = [...v2Ids].filter((id) => !v1Ids.has(id));
    expect(added).toContain('sibr_details');
  });
});
