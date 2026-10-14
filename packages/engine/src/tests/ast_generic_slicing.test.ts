import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AstContextSlicer } from '../context/AstContextSlicer.js';

describe('AstContextSlicer Generic Interface Slicing (T96.3.1)', () => {
  const slicer = new AstContextSlicer();

  test('handles complex generic interface declarations without syntax corruption', () => {
    const code = `
export interface Entity<TId> {
  id: TId;
}

export interface Repository<TEntity extends Entity<TId>, TId = string, TQuery extends Record<string, unknown> = Record<string, unknown>> {
  findById(id: TId): Promise<TEntity | null>;
  findMany(query?: TQuery): Promise<readonly TEntity[]>;
  save<TInput extends Partial<TEntity>>(entity: TInput): Promise<TEntity>;
}

export class SqlRepository<T extends Entity<string>> implements Repository<T, string> {
  private tableName: string;
  constructor(tableName: string) {
    this.tableName = tableName;
  }
  public async findById(id: string): Promise<T | null> {
    return null;
  }
  public async findMany(query?: Record<string, unknown>): Promise<readonly T[]> {
    return [];
  }
  public async save<TInput extends Partial<T>>(entity: TInput): Promise<T> {
    return entity as unknown as T;
  }
}
`;

    const result = slicer.generateTypeSkeleton(code, ['Repository']);
    assert.ok(result.skeletonContent.includes('interface Repository<TEntity extends Entity<TId>, TId = string, TQuery extends Record<string, unknown> = Record<string, unknown>>'));
    assert.ok(result.skeletonContent.includes('findById(id: TId): Promise<TEntity | null>;'));
    assert.ok(result.skeletonContent.includes('save<TInput extends Partial<TEntity>>(entity: TInput): Promise<TEntity>;'));
    assert.strictEqual(result.skeletonContent.includes('tableName: string;'), false);
  });

  test('handles nested generic type aliases and union bounds', () => {
    const code = `
export type Result<T, E extends Error = Error> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E };

export interface Pipeline<TIn, TOut> {
  process(input: TIn): Result<TOut>;
}
`;

    const result = slicer.generateTypeSkeleton(code, ['Result', 'Pipeline']);
    assert.ok(result.skeletonContent.includes('type Result<T, E extends Error = Error>'));
    assert.ok(result.skeletonContent.includes('interface Pipeline<TIn, TOut>'));
  });
});
