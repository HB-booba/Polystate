import { Injectable } from '@angular/core';
import { createAngularService } from '@polystate/angular';
import { connectDevTools } from '@polystate/devtools';
import { combineLatest, distinctUntilChanged, map } from 'rxjs';

// ─── Domain types ──────────────────────────────────────────────────────────────

export type Currency = 'USD' | 'EUR' | 'GBP';
export type Category = 'all' | 'Electronics' | 'Clothing' | 'Books' | 'Food';
export type SortBy = 'name' | 'price' | 'rating';

export interface Product {
    id: number;
    name: string;
    description: string;
    /** Base price in USD */
    price: number;
    category: Exclude<Category, 'all'>;
    stock: number;
    rating: number;
}

export interface CartItem {
    productId: number;
    quantity: number;
}

export interface CartItemFull extends CartItem {
    product: Product;
}

export interface Order {
    id: number;
    items: CartItem[];
    /** Total in USD at time of checkout */
    total: number;
    placedAt: string;
    status: 'processing' | 'shipped' | 'delivered';
}

export interface ShopFilters {
    category: Category;
    maxPrice: number;
    search: string;
    sortBy: SortBy;
    sortDir: 'asc' | 'desc';
}

export interface ShopState {
    products: Product[];
    cart: CartItem[];
    orders: Order[];
    filter: ShopFilters;
    ui: {
        cartOpen: boolean;
        loading: boolean;
        error: string | null;
        currency: Currency;
    };
}

// ─── Currency helpers ──────────────────────────────────────────────────────────

export const CURRENCY_RATES: Record<Currency, number> = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
};

// ─── Seed data ─────────────────────────────────────────────────────────────────

const SEED_PRODUCTS: Product[] = [
    { id: 1, name: 'Wireless Headphones', description: 'Premium noise-cancelling audio', price: 149.99, category: 'Electronics', stock: 12, rating: 4.7 },
    { id: 2, name: 'Mechanical Keyboard', description: 'RGB tactile switches, TKL layout', price: 89.99, category: 'Electronics', stock: 8, rating: 4.5 },
    { id: 3, name: 'Running Shoes', description: 'Lightweight breathable mesh upper', price: 74.99, category: 'Clothing', stock: 25, rating: 4.3 },
    { id: 4, name: 'TypeScript Handbook', description: 'Complete guide to TypeScript 5', price: 39.99, category: 'Books', stock: 50, rating: 4.8 },
    { id: 5, name: 'Artisan Coffee Beans', description: 'Single-origin Ethiopian blend', price: 18.99, category: 'Food', stock: 100, rating: 4.6 },
    { id: 6, name: '4K Webcam', description: 'Auto-focus with built-in ring light', price: 119.99, category: 'Electronics', stock: 5, rating: 4.4 },
    { id: 7, name: 'Merino Wool Sweater', description: 'Ultra-soft, temperature-regulating', price: 94.99, category: 'Clothing', stock: 15, rating: 4.2 },
    { id: 8, name: 'Clean Code', description: "Robert Martin on software craftsmanship", price: 34.99, category: 'Books', stock: 30, rating: 4.9 },
    { id: 9, name: 'Green Tea Sampler', description: '10 premium Japanese varieties', price: 24.99, category: 'Food', stock: 200, rating: 4.5 },
    { id: 10, name: 'USB-C Hub 7-in-1', description: 'HDMI, USB3, SD card, PD charging', price: 49.99, category: 'Electronics', stock: 20, rating: 4.3 },
];

// ─── Initial state ─────────────────────────────────────────────────────────────

const initialState: ShopState = {
    products: [],
    cart: [],
    orders: [],
    filter: {
        category: 'all',
        maxPrice: 500,
        search: '',
        sortBy: 'name',
        sortDir: 'asc',
    },
    ui: {
        cartOpen: false,
        loading: false,
        error: null,
        currency: 'USD',
    },
};

// ─── Actions ───────────────────────────────────────────────────────────────────
//
// All handlers follow the Polystate contract:
//   (state: T, payload?: unknown) => T   — pure, return new state

const actions = {
    /** Start simulated async product fetch */
    loadStart: (state: ShopState): ShopState => ({
        ...state,
        ui: { ...state.ui, loading: true, error: null },
    }),

    /** Resolve with product list */
    loadSuccess: (state: ShopState, products: unknown): ShopState => ({
        ...state,
        products: products as Product[],
        ui: { ...state.ui, loading: false },
    }),

    /** Reject with error message */
    loadError: (state: ShopState, error: unknown): ShopState => ({
        ...state,
        ui: { ...state.ui, loading: false, error: error as string },
    }),

    /** Add one unit of a product; bumps quantity if already in cart */
    addToCart: (state: ShopState, productId: unknown): ShopState => {
        const id = productId as number;
        const existing = state.cart.find((i) => i.productId === id);
        if (existing) {
            return {
                ...state,
                cart: state.cart.map((i) =>
                    i.productId === id ? { ...i, quantity: i.quantity + 1 } : i
                ),
            };
        }
        return { ...state, cart: [...state.cart, { productId: id, quantity: 1 }] };
    },

    /** Remove a product line entirely from the cart */
    removeFromCart: (state: ShopState, productId: unknown): ShopState => ({
        ...state,
        cart: state.cart.filter((i) => i.productId !== (productId as number)),
    }),

    /** Set an exact quantity; quantity < 1 removes the line */
    updateQuantity: (state: ShopState, payload: unknown): ShopState => {
        const { productId, quantity } = payload as { productId: number; quantity: number };
        if (quantity < 1) {
            return { ...state, cart: state.cart.filter((i) => i.productId !== productId) };
        }
        return {
            ...state,
            cart: state.cart.map((i) =>
                i.productId === productId ? { ...i, quantity } : i
            ),
        };
    },

    /** Place order: snapshot the cart, clear it, append to order history */
    checkout: (state: ShopState): ShopState => {
        if (state.cart.length === 0) return state;

        const total = state.cart.reduce((sum, item) => {
            const product = state.products.find((p) => p.id === item.productId);
            return sum + (product?.price ?? 0) * item.quantity;
        }, 0);

        const newOrder: Order = {
            id: Date.now(),
            items: [...state.cart],
            total: Math.round(total * 100) / 100,
            placedAt: new Date().toISOString(),
            status: 'processing',
        };

        return {
            ...state,
            cart: [],
            orders: [newOrder, ...state.orders],
            ui: { ...state.ui, cartOpen: false },
        };
    },

    /** Merge a partial filter patch */
    setFilter: (state: ShopState, patch: unknown): ShopState => ({
        ...state,
        filter: { ...state.filter, ...(patch as Partial<ShopFilters>) },
    }),

    /** Toggle the cart sidebar open/closed */
    toggleCart: (state: ShopState): ShopState => ({
        ...state,
        ui: { ...state.ui, cartOpen: !state.ui.cartOpen },
    }),

    /** Switch display currency (prices are always stored in USD) */
    setCurrency: (state: ShopState, currency: unknown): ShopState => ({
        ...state,
        ui: { ...state.ui, currency: currency as Currency },
    }),
};

// ─── ShopService ────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ShopService
    extends createAngularService<ShopState>(initialState, actions)
{
    // ── raw streams (selective subscriptions — only notify on change) ─────────

    readonly products$ = this.select$((s) => s.products);
    readonly cart$ = this.select$((s) => s.cart);
    readonly orders$ = this.select$((s) => s.orders);
    readonly filter$ = this.select$((s) => s.filter);
    readonly loading$ = this.select$((s) => s.ui.loading);
    readonly error$ = this.select$((s) => s.ui.error);
    readonly cartOpen$ = this.select$((s) => s.ui.cartOpen);
    readonly currency$ = this.select$((s) => s.ui.currency);

    // ── derived streams ───────────────────────────────────────────────────────

    /** Products filtered, searched, and sorted according to current filter state */
    readonly filteredProducts$ = combineLatest([this.products$, this.filter$]).pipe(
        map(([products, filter]) => {
            let result = [...products];

            if (filter.category !== 'all') {
                result = result.filter((p) => p.category === filter.category);
            }
            if (filter.search) {
                const q = filter.search.toLowerCase();
                result = result.filter(
                    (p) =>
                        p.name.toLowerCase().includes(q) ||
                        p.description.toLowerCase().includes(q)
                );
            }
            result = result.filter((p) => p.price <= filter.maxPrice);

            result.sort((a, b) => {
                const dir = filter.sortDir === 'asc' ? 1 : -1;
                if (filter.sortBy === 'price') return (a.price - b.price) * dir;
                if (filter.sortBy === 'rating') return (a.rating - b.rating) * dir;
                return a.name.localeCompare(b.name) * dir;
            });

            return result;
        }),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    );

    /** Set of product IDs currently in the cart — for O(1) in-cart checks */
    readonly cartProductIds$ = this.cart$.pipe(
        map((cart) => new Set(cart.map((i) => i.productId)))
    );

    /** Cart items enriched with the full Product object */
    readonly cartItemsFull$ = combineLatest([this.cart$, this.products$]).pipe(
        map(([cart, products]) =>
            cart
                .map((item) => ({
                    ...item,
                    product: products.find((p) => p.id === item.productId)!,
                }))
                .filter((i) => i.product != null)
        )
    );

    /** Total number of units in the cart */
    readonly cartCount$ = this.cart$.pipe(
        map((cart) => cart.reduce((sum, i) => sum + i.quantity, 0))
    );

    /** Cart grand total converted to the selected display currency */
    readonly cartDisplay$ = combineLatest([this.cartItemsFull$, this.currency$]).pipe(
        map(([items, currency]) => {
            const usd = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
            return {
                amount: (usd * CURRENCY_RATES[currency]).toFixed(2),
                symbol: CURRENCY_SYMBOLS[currency],
            };
        })
    );

    /** Unique categories derived from loaded products, prefixed with "all" */
    readonly categories$ = this.products$.pipe(
        map((products) => {
            const cats = [...new Set(products.map((p) => p.category))];
            return ['all', ...cats] as Category[];
        })
    );

    /**
     * A single view-model stream that combines every piece of UI state.
     * Components subscribe once with `*ngIf="shop.vm$ | async as vm"` to
     * avoid N async pipes and multiple change-detection passes.
     */
    readonly vm$ = combineLatest({
        products: this.filteredProducts$,
        cartIds: this.cartProductIds$,
        cartItems: this.cartItemsFull$,
        cartCount: this.cartCount$,
        cartDisplay: this.cartDisplay$,
        cartOpen: this.cartOpen$,
        orders: this.orders$,
        filter: this.filter$,
        categories: this.categories$,
        loading: this.loading$,
        error: this.error$,
        currency: this.currency$,
    });

    constructor() {
        super();

        // Bridge to the Redux DevTools browser extension.
        // Open the DevTools panel to inspect every action and time-travel.
        connectDevTools(this.store, { name: 'AngularShop', timeTravel: true });

        // Simulate an async product fetch (e.g. HTTP call)
        this.dispatch('loadStart');
        setTimeout(() => {
            this.dispatch('loadSuccess', SEED_PRODUCTS);
        }, 800);
    }
}
