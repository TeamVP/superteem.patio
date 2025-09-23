/* eslint-disable @typescript-eslint/no-explicit-any */
import { assertTeamRole, assertTemplateRole } from '../../convex/rbac';

interface TestUser {
  _id: string;
  roles: string[];
  tokenIdentifier?: string;
}
interface Membership {
  userId: string;
  teamId: string;
  roles: string[];
}
interface Template {
  _id: string;
  teamId?: string;
}
interface Identity {
  tokenIdentifier: string;
}
interface Fixtures {
  identity?: Identity;
  users?: TestUser[];
  users_teams?: Membership[];
  templates?: Template[];
}

type EqCond = { field: string; value: unknown };

function makeCtx(fixtures: Fixtures) {
  return {
    auth: {
      async getUserIdentity(): Promise<Identity | null> {
        return fixtures.identity ?? null;
      },
    },
    db: {
      async get(id: string) {
        return fixtures.templates?.find((t) => t._id === id) ?? null;
      },
      query(table: keyof Fixtures) {
        const rows = (fixtures[table] as unknown[]) || [];
        return {
          withIndex(
            _name: string,
            fn: (q: { eq(field: string, value: unknown): unknown }) => unknown
          ) {
            const conditions: EqCond[] = [];
            const builder = {
              eq(field: string, value: unknown) {
                conditions.push({ field, value });
                return builder;
              },
            };
            fn(builder);
            const filtered = rows.filter((r: any) =>
              conditions.every((c) => r[c.field] === c.value)
            );
            return {
              async first() {
                return filtered[0] ?? null;
              },
              async collect() {
                return filtered;
              },
            };
          },
          async first() {
            return rows[0] ?? null;
          },
          async collect() {
            return rows;
          },
        };
      },
    },
  } as unknown as { auth: any; db: any };
}

const user: TestUser = { _id: 'u1', roles: ['admin'] };
const teamUser: TestUser = { _id: 'u2', roles: ['viewer'] };
const teamMembership: Membership = { userId: 'u2', teamId: 't1', roles: ['editor'] };
const templateGlobal: Template = { _id: 'tpl1', teamId: undefined };
const templateTeam: Template = { _id: 'tpl2', teamId: 't1' };
describe('rbac assertions', () => {
  it('assertTeamRole passes with required role', async () => {
    const ctx = makeCtx({
      identity: { tokenIdentifier: 'token-u2' },
      users: [teamUser, user],
      users_teams: [teamMembership],
    });
    // adapt getViewer logic: tokenIdentifier index simulation
    teamUser.tokenIdentifier = 'token-u2';
    await expect(assertTeamRole(ctx, 't1', ['editor'])).resolves.toBeTruthy();
  });

  it('assertTeamRole fails without membership', async () => {
    const ctx = makeCtx({ identity: { tokenIdentifier: 'x' }, users: [user], users_teams: [] });
    user.tokenIdentifier = 'token-admin';
    // tokenIdentifier mismatch means viewer lookup fails -> No user
    await expect(assertTeamRole(ctx, 't1', ['editor'])).rejects.toThrow('No user');
  });

  it('assertTemplateRole global template uses platform roles', async () => {
    const ctx = makeCtx({
      identity: { tokenIdentifier: 'token-admin' },
      users: [user],
      templates: [templateGlobal],
    });
    user.tokenIdentifier = 'token-admin';
    await expect(assertTemplateRole(ctx, 'tpl1', ['admin'])).resolves.toBeUndefined();
  });

  it('assertTemplateRole team template uses membership', async () => {
    const ctx = makeCtx({
      identity: { tokenIdentifier: 'token-u2' },
      users: [teamUser],
      users_teams: [teamMembership],
      templates: [templateTeam],
    });
    teamUser.tokenIdentifier = 'token-u2';
    await expect(assertTemplateRole(ctx, 'tpl2', ['editor'])).resolves.toBeUndefined();
  });

  it('assertTemplateRole rejects missing template', async () => {
    const ctx = makeCtx({
      identity: { tokenIdentifier: 'token-admin' },
      users: [user],
      templates: [],
    });
    user.tokenIdentifier = 'token-admin';
    await expect(assertTemplateRole(ctx, 'missing', ['admin'])).rejects.toThrow(
      'Template not found'
    );
  });

  it('assertTemplateRole forbids when roles mismatch', async () => {
    const ctx = makeCtx({
      identity: { tokenIdentifier: 'token-u2' },
      users: [teamUser],
      users_teams: [teamMembership],
      templates: [templateTeam],
    });
    teamUser.tokenIdentifier = 'token-u2';
    await expect(assertTemplateRole(ctx, 'tpl2', ['publisher'])).rejects.toThrow('Forbidden');
  });
});
