import { describe, expect, it, vi } from 'vitest';
import { createSelector } from './selector';

interface Product {
  id: number;
  category: string;
}

interface ProductsState {
  products: Product[];
  selectedCategory: string;
  loading: boolean;
}

describe('createSelector', () => {
  it('computes the combined value from a single input selector', () => {
    const selectCount = createSelector(
      (s: { items: number[] }) => s.items,
      (items) => items.length
    );

    expect(selectCount({ items: [1, 2, 3] })).toBe(3);
  });

  it('combines results from multiple input selectors', () => {
    const selectProducts = (s: ProductsState) => s.products;
    const selectCategory = (s: ProductsState) => s.selectedCategory;

    const selectFiltered = createSelector(selectProducts, selectCategory, (products, category) =>
      products.filter((p) => p.category === category)
    );

    const state: ProductsState = {
      products: [
        { id: 1, category: 'a' },
        { id: 2, category: 'b' },
      ],
      selectedCategory: 'a',
      loading: false,
    };

    expect(selectFiltered(state)).toEqual([{ id: 1, category: 'a' }]);
  });

  it('does not recompute when inputs are unchanged (reference equality)', () => {
    const combiner = vi.fn((items: number[]) => items.length);
    const selectCount = createSelector((s: { items: number[] }) => s.items, combiner);

    const items = [1, 2, 3];
    selectCount({ items });
    selectCount({ items });
    selectCount({ items });

    expect(combiner).toHaveBeenCalledTimes(1);
  });

  it('recomputes when an input selector result changes', () => {
    const combiner = vi.fn((items: number[]) => items.length);
    const selectCount = createSelector((s: { items: number[] }) => s.items, combiner);

    selectCount({ items: [1, 2] });
    selectCount({ items: [1, 2, 3] });

    expect(combiner).toHaveBeenCalledTimes(2);
  });

  it('skips recomputation when only an unrelated field changes', () => {
    const combiner = vi.fn((products: Product[], category: string) =>
      products.filter((p) => p.category === category)
    );
    const selectProducts = (s: ProductsState) => s.products;
    const selectCategory = (s: ProductsState) => s.selectedCategory;
    const selectFiltered = createSelector(selectProducts, selectCategory, combiner);

    const products: Product[] = [{ id: 1, category: 'a' }];
    selectFiltered({ products, selectedCategory: 'a', loading: false });
    // Only `loading` changed — products and selectedCategory are unchanged.
    selectFiltered({ products, selectedCategory: 'a', loading: true });

    expect(combiner).toHaveBeenCalledTimes(1);
  });

  it('keeps independent caches across separate createSelector calls', () => {
    const combinerA = vi.fn((items: number[]) => items.length);
    const combinerB = vi.fn((items: number[]) => items.length * 2);
    const selectA = createSelector((s: { items: number[] }) => s.items, combinerA);
    const selectB = createSelector((s: { items: number[] }) => s.items, combinerB);

    const state = { items: [1, 2] };
    expect(selectA(state)).toBe(2);
    expect(selectB(state)).toBe(4);
    expect(combinerA).toHaveBeenCalledTimes(1);
    expect(combinerB).toHaveBeenCalledTimes(1);
  });
});
