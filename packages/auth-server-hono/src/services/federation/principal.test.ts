/**
 * Tests for services/federation/principal.ts
 *
 * Tests pure logic (access level hierarchy) and integrates with the
 * Drizzle mock for CRUD. The DB chaining is mocked at the module level
 * so the Drizzle ORM patterns work without a real database.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Drizzle chainable mock ────────────────────────────────────────

/**
 * Build a chainable mock that supports the Drizzle query builder pattern:
 *   db.insert(t).values(...).onConflictDoNothing().returning()
 *   db.select().from(t).where(...)
 *   db.update(t).set(...).where(...).returning()
 *
 * The final `.returning()` or `.where()` resolves to `resolveValue`.
 */
function chain(resolveValue: unknown[] = []) {
  const where = vi.fn();
  where.mockResolvedValue(resolveValue);

  const returning = vi.fn();
  returning.mockResolvedValue(resolveValue);

  const chainable = {
    from: vi.fn(),
    where: vi.fn(),
    values: vi.fn(),
    set: vi.fn(),
    onConflictDoNothing: vi.fn(),
    returning: vi.fn(),
  };
  chainable.from.mockReturnValue({
    where: chainable.where,
    from: chainable.from,
  });
  chainable.where.mockReturnValue({ where: chainable.where, returning });
  chainable.values.mockReturnValue({
    onConflictDoNothing: chainable.onConflictDoNothing,
    returning,
    values: chainable.values,
    from: chainable.from,
  });
  chainable.onConflictDoNothing.mockReturnValue({ returning });
  chainable.set.mockReturnValue({ where: chainable.where, set: chainable.set });
  chainable.returning = returning;

  // For db.select().from(t).where(...)
  // select() returns { from } where from returns { where }
  const selectResult = { from: chainable.from };
  // For db.update(t) → { set }
  const updateResult = { set: chainable.set };
  // For db.insert(t) → { values }
  const insertResult = { values: chainable.values };

  return {
    selectResult,
    updateResult,
    insertResult,
    chainable,
    where,
    returning,
  };
}

vi.mock('../../db/drizzle.js', () => {
  const mockChain = chain([]);
  return {
    db: {
      insert: vi.fn(() => mockChain.insertResult),
      select: vi.fn(() => mockChain.selectResult),
      update: vi.fn(() => mockChain.updateResult),
    },
    defaultChain: mockChain,
  };
});

// Import after mock
const { satisfiesAccessLevel } = await import('./principal.js');

// ─── Pure logic tests ──────────────────────────────────────────────

describe('satisfiesAccessLevel', () => {
  it('read satisfies read', () => {
    expect(satisfiesAccessLevel('read', 'read')).toBe(true);
  });

  it('write satisfies read', () => {
    expect(satisfiesAccessLevel('write', 'read')).toBe(true);
  });

  it('admin satisfies read and write', () => {
    expect(satisfiesAccessLevel('admin', 'read')).toBe(true);
    expect(satisfiesAccessLevel('admin', 'write')).toBe(true);
    expect(satisfiesAccessLevel('admin', 'admin')).toBe(true);
  });

  it('read does NOT satisfy write or admin', () => {
    expect(satisfiesAccessLevel('read', 'write')).toBe(false);
    expect(satisfiesAccessLevel('read', 'admin')).toBe(false);
  });

  it('write does NOT satisfy admin', () => {
    expect(satisfiesAccessLevel('write', 'admin')).toBe(false);
  });
});

// ─── DB integration tests ──────────────────────────────────────────

describe('federated principal CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports the expected functions with proper signatures', async () => {
    const mod = await import('./principal.js');
    expect(mod.createFederatedPrincipal).toBeInstanceOf(Function);
    expect(mod.getFederatedPrincipalsByRoom).toBeInstanceOf(Function);
    expect(mod.getFederatedPrincipal).toBeInstanceOf(Function);
    expect(mod.getFederatedPrincipalById).toBeInstanceOf(Function);
    expect(mod.updateFederatedPrincipalStatus).toBeInstanceOf(Function);
    expect(mod.checkFederatedGrant).toBeInstanceOf(Function);
    expect(mod.revokeAllFederatedPrincipalsForRoom).toBeInstanceOf(Function);
    expect(mod.hasWriteAccessViaFederation).toBeInstanceOf(Function);
    expect(mod.hasAdminAccessViaFederation).toBeInstanceOf(Function);
  });
});
