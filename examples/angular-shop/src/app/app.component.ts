import { AsyncPipe, DatePipe, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { Component, inject, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import {
    Category,
    Currency,
    CURRENCY_RATES,
    CURRENCY_SYMBOLS,
    Product,
    ShopService,
    SortBy,
} from './shop.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [AsyncPipe, NgFor, NgIf, DatePipe, TitleCasePipe],
    styles: [`
        /* ── Global reset ─────────────────────────────────────────────── */
        :host {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            display: block;
            min-height: 100vh;
            background: #f0f2f5;
            color: #1a1a2e;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Header ───────────────────────────────────────────────────── */
        header {
            position: sticky; top: 0; z-index: 50;
            background: #1a1a2e; color: white;
            display: flex; align-items: center; justify-content: space-between;
            padding: 0.75rem 1.5rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        header h1 { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.02em; }
        .header-right { display: flex; align-items: center; gap: 0.75rem; }
        .currency-select {
            background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2);
            padding: 0.3rem 0.5rem; border-radius: 6px; font-size: 0.85rem; cursor: pointer;
        }
        .currency-select option { background: #1a1a2e; }
        .nav-btn {
            background: transparent; color: rgba(255,255,255,0.7); border: none;
            padding: 0.4rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem;
            transition: background 0.15s, color 0.15s;
        }
        .nav-btn:hover { background: rgba(255,255,255,0.1); color: white; }
        .nav-btn.active { background: rgba(255,255,255,0.2); color: white; font-weight: 600; }
        .cart-btn {
            position: relative;
            background: #e94560; color: white; border: none;
            padding: 0.4rem 0.9rem; border-radius: 6px; cursor: pointer;
            font-size: 1rem; font-weight: 600; transition: background 0.15s;
        }
        .cart-btn:hover { background: #c73652; }
        .badge {
            position: absolute; top: -6px; right: -6px;
            background: #ffd700; color: #1a1a2e;
            border-radius: 50%; width: 18px; height: 18px;
            font-size: 0.65rem; font-weight: 700;
            display: flex; align-items: center; justify-content: center;
        }

        /* ── State banners ────────────────────────────────────────────── */
        .loading-banner, .error-banner {
            text-align: center; padding: 0.75rem; font-size: 0.95rem;
        }
        .loading-banner { background: #e8f4fd; color: #1565c0; }
        .error-banner { background: #fdecea; color: #c62828; }

        /* ── Main layout ──────────────────────────────────────────────── */
        main { max-width: 1200px; margin: 0 auto; padding: 1.5rem; }

        /* ── Filter bar ───────────────────────────────────────────────── */
        .filter-bar {
            background: white; border-radius: 12px;
            padding: 1rem 1.25rem; margin-bottom: 1.25rem;
            box-shadow: 0 1px 4px rgba(0,0,0,0.08);
            display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;
        }
        .search-input {
            flex: 1 1 200px; padding: 0.5rem 0.75rem; border: 1px solid #ddd;
            border-radius: 8px; font-size: 0.9rem; outline: none;
            transition: border-color 0.15s;
        }
        .search-input:focus { border-color: #667eea; }
        .category-tabs { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .cat-btn {
            padding: 0.3rem 0.7rem; border: 1px solid #ddd;
            border-radius: 20px; cursor: pointer; font-size: 0.8rem;
            background: white; transition: all 0.15s;
        }
        .cat-btn:hover { border-color: #667eea; color: #667eea; }
        .cat-btn.active { background: #667eea; color: white; border-color: #667eea; }
        .sort-controls { display: flex; gap: 0.4rem; align-items: center; }
        .sort-select {
            padding: 0.35rem 0.6rem; border: 1px solid #ddd; border-radius: 8px;
            font-size: 0.85rem; cursor: pointer; outline: none;
        }
        .sort-dir-btn {
            padding: 0.35rem 0.6rem; border: 1px solid #ddd; border-radius: 8px;
            background: white; cursor: pointer; font-size: 0.9rem; transition: all 0.15s;
        }
        .sort-dir-btn:hover { background: #f0f0f0; }
        .price-range { font-size: 0.85rem; color: #555; white-space: nowrap; }
        .price-range input[type=range] {
            display: block; width: 120px; margin-top: 0.25rem; cursor: pointer;
            accent-color: #667eea;
        }

        /* ── Results bar ──────────────────────────────────────────────── */
        .results-bar {
            font-size: 0.85rem; color: #888; margin-bottom: 1rem;
        }
        .no-results {
            text-align: center; padding: 3rem; color: #aaa; font-size: 1rem;
        }

        /* ── Product grid ─────────────────────────────────────────────── */
        .product-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 1.25rem;
        }
        .product-card {
            background: white; border-radius: 12px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.08);
            padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem;
            transition: transform 0.15s, box-shadow 0.15s;
        }
        .product-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }
        .card-meta { display: flex; justify-content: space-between; align-items: center; }
        .category-badge {
            font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
            padding: 0.2rem 0.5rem; border-radius: 20px;
            background: #e8f0fe; color: #3949ab;
        }
        .rating { font-size: 0.8rem; color: #f59e0b; }
        .product-card h3 { font-size: 0.95rem; font-weight: 600; line-height: 1.3; }
        .product-desc { font-size: 0.8rem; color: #666; line-height: 1.4; flex: 1; }
        .stock-info { font-size: 0.78rem; color: #888; }
        .stock-info.low { color: #ef4444; font-weight: 600; }
        .product-price { font-size: 1.1rem; font-weight: 700; color: #1a1a2e; }
        .add-btn {
            padding: 0.5rem; border: none; border-radius: 8px; cursor: pointer;
            font-size: 0.85rem; font-weight: 600; transition: all 0.15s;
            background: #667eea; color: white;
        }
        .add-btn:hover:not(:disabled) { background: #5568d6; }
        .add-btn.in-cart { background: #10b981; }
        .add-btn.in-cart:hover { background: #059669; }
        .add-btn:disabled { background: #e0e0e0; color: #aaa; cursor: not-allowed; }

        /* ── Cart sidebar ─────────────────────────────────────────────── */
        .overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 98;
        }
        .cart-sidebar {
            position: fixed; top: 0; right: 0; width: 360px; height: 100vh;
            background: white; z-index: 99;
            transform: translateX(100%); transition: transform 0.3s ease;
            display: flex; flex-direction: column;
            box-shadow: -4px 0 24px rgba(0,0,0,0.15);
        }
        .cart-sidebar.open { transform: translateX(0); }
        .cart-header {
            display: flex; justify-content: space-between; align-items: center;
            padding: 1rem 1.25rem; border-bottom: 1px solid #f0f0f0;
        }
        .cart-header h2 { font-size: 1.05rem; font-weight: 700; }
        .close-btn {
            background: none; border: none; font-size: 1.1rem;
            cursor: pointer; color: #888; padding: 0.25rem;
        }
        .close-btn:hover { color: #333; }
        .cart-body { flex: 1; overflow-y: auto; padding: 0.75rem 1.25rem; }
        .cart-empty { text-align: center; padding: 2rem; color: #aaa; }
        .cart-empty button {
            margin-top: 1rem; padding: 0.5rem 1rem; background: #667eea;
            color: white; border: none; border-radius: 8px; cursor: pointer;
        }
        .cart-item {
            display: grid; grid-template-columns: 1fr auto auto auto;
            align-items: center; gap: 0.5rem;
            padding: 0.75rem 0; border-bottom: 1px solid #f5f5f5;
        }
        .item-name { font-size: 0.85rem; font-weight: 600; }
        .item-unit-price { font-size: 0.75rem; color: #888; }
        .qty-controls {
            display: flex; align-items: center; gap: 0.25rem;
        }
        .qty-btn {
            width: 24px; height: 24px; border: 1px solid #ddd; border-radius: 4px;
            background: white; cursor: pointer; font-size: 0.9rem; line-height: 1;
            display: flex; align-items: center; justify-content: center;
            transition: all 0.1s;
        }
        .qty-btn:hover { background: #f0f0f0; border-color: #aaa; }
        .qty-value { min-width: 24px; text-align: center; font-size: 0.85rem; }
        .item-line-total { font-size: 0.85rem; font-weight: 600; white-space: nowrap; }
        .remove-item-btn {
            background: none; border: none; color: #ccc;
            cursor: pointer; font-size: 0.9rem; padding: 0.2rem;
            transition: color 0.1s;
        }
        .remove-item-btn:hover { color: #ef4444; }
        .cart-footer { padding: 1rem 1.25rem; border-top: 1px solid #f0f0f0; }
        .cart-total-row {
            display: flex; justify-content: space-between; align-items: baseline;
            margin-bottom: 0.75rem;
        }
        .cart-total-label { font-size: 0.9rem; color: #555; }
        .cart-total-amount { font-size: 1.2rem; font-weight: 700; }
        .checkout-btn {
            width: 100%; padding: 0.75rem; background: #e94560; color: white;
            border: none; border-radius: 10px; font-size: 0.95rem; font-weight: 700;
            cursor: pointer; transition: background 0.15s;
        }
        .checkout-btn:hover:not(:disabled) { background: #c73652; }
        .checkout-btn:disabled { background: #e0e0e0; color: #aaa; cursor: not-allowed; }

        /* ── Orders view ──────────────────────────────────────────────── */
        .orders-view h2 {
            font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;
        }
        .empty-orders { text-align: center; padding: 3rem; color: #aaa; }
        .empty-orders button {
            margin-top: 1rem; padding: 0.6rem 1.25rem; background: #667eea;
            color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9rem;
        }
        .order-card {
            background: white; border-radius: 12px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.08);
            padding: 1rem 1.25rem; margin-bottom: 1rem;
        }
        .order-header {
            display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;
        }
        .order-id { font-size: 0.85rem; font-weight: 700; color: #333; }
        .order-status { font-size: 0.8rem; font-weight: 600; }
        .order-date { font-size: 0.75rem; color: #aaa; margin-left: auto; }
        .order-items-list { font-size: 0.8rem; color: #666; margin-bottom: 0.5rem; }
        .order-total { font-size: 0.9rem; font-weight: 700; }
    `],
    template: `
        <ng-container *ngIf="shop.vm$ | async as vm">

            <!-- ═══════════════════════════ HEADER ════════════════════════════ -->
            <header>
                <h1>🛍 Angular Shop — Polystate</h1>
                <div class="header-right">
                    <select class="currency-select"
                        [value]="vm.currency"
                        (change)="setCurrency($event)">
                        <option value="USD">🇺🇸 USD</option>
                        <option value="EUR">🇪🇺 EUR</option>
                        <option value="GBP">🇬🇧 GBP</option>
                    </select>

                    <button class="nav-btn"
                        [class.active]="view === 'shop'"
                        (click)="view = 'shop'">Shop</button>

                    <button class="nav-btn"
                        [class.active]="view === 'orders'"
                        (click)="view = 'orders'">
                        Orders
                        <span class="badge" *ngIf="vm.orders.length > 0"
                            style="position:static;transform:none;margin-left:4px;
                                   display:inline-flex;width:18px;height:18px;">
                            {{ vm.orders.length }}
                        </span>
                    </button>

                    <button class="cart-btn" (click)="shop.dispatch('toggleCart')">
                        🛒
                        <span class="badge" *ngIf="vm.cartCount > 0">{{ vm.cartCount }}</span>
                    </button>
                </div>
            </header>

            <!-- ═══════════════════════ LOADING / ERROR ═══════════════════════ -->
            <div class="loading-banner" *ngIf="vm.loading">⏳ Loading products…</div>
            <div class="error-banner"   *ngIf="vm.error">⚠️ {{ vm.error }}</div>

            <main>

                <!-- ══════════════════════ SHOP VIEW ═══════════════════════════ -->
                <div *ngIf="view === 'shop'">

                    <!-- Filter bar -->
                    <div class="filter-bar">
                        <input class="search-input"
                            placeholder="Search products…"
                            [value]="vm.filter.search"
                            (input)="onSearch($event)" />

                        <div class="category-tabs">
                            <button class="cat-btn"
                                *ngFor="let cat of vm.categories"
                                [class.active]="vm.filter.category === cat"
                                (click)="setCategory(cat)">
                                {{ cat | titlecase }}
                            </button>
                        </div>

                        <div class="sort-controls">
                            <select class="sort-select"
                                [value]="vm.filter.sortBy"
                                (change)="onSortBy($event)">
                                <option value="name">Name</option>
                                <option value="price">Price</option>
                                <option value="rating">Rating</option>
                            </select>
                            <button class="sort-dir-btn"
                                (click)="toggleSortDir(vm.filter.sortDir)"
                                [title]="vm.filter.sortDir === 'asc' ? 'Sort ascending' : 'Sort descending'">
                                {{ vm.filter.sortDir === 'asc' ? '↑ Asc' : '↓ Desc' }}
                            </button>
                        </div>

                        <label class="price-range">
                            Max price: {{ formatPrice(maxPrice, vm.currency) }}
                            <input type="range" min="10" max="500" step="10"
                                [value]="maxPrice"
                                (input)="onMaxPrice($event)" />
                        </label>
                    </div>

                    <p class="results-bar">
                        {{ vm.products.length }}
                        {{ vm.products.length === 1 ? 'product' : 'products' }}
                    </p>

                    <div class="no-results" *ngIf="vm.products.length === 0 && !vm.loading">
                        No products match your filters. Try clearing the search or adjusting the price.
                    </div>

                    <!-- Product grid -->
                    <div class="product-grid">
                        <div class="product-card" *ngFor="let p of vm.products">
                            <div class="card-meta">
                                <span class="category-badge">{{ p.category }}</span>
                                <span class="rating">⭐ {{ p.rating }}</span>
                            </div>
                            <h3>{{ p.name }}</h3>
                            <p class="product-desc">{{ p.description }}</p>
                            <div class="stock-info" [class.low]="p.stock < 5">
                                <span *ngIf="p.stock === 0">Out of stock</span>
                                <span *ngIf="p.stock > 0 && p.stock < 5">⚠️ Only {{ p.stock }} left</span>
                                <span *ngIf="p.stock >= 5">In stock: {{ p.stock }}</span>
                            </div>
                            <div class="product-price">{{ formatPrice(p.price, vm.currency) }}</div>
                            <button class="add-btn"
                                [class.in-cart]="vm.cartIds.has(p.id)"
                                [disabled]="p.stock === 0"
                                (click)="shop.dispatch('addToCart', p.id)">
                                {{ vm.cartIds.has(p.id) ? '✓ In Cart' : (p.stock === 0 ? 'Out of Stock' : 'Add to Cart') }}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- ══════════════════════ ORDERS VIEW ══════════════════════════ -->
                <div class="orders-view" *ngIf="view === 'orders'">
                    <h2>Order History</h2>

                    <div class="empty-orders" *ngIf="vm.orders.length === 0">
                        <p>No orders yet. Start shopping!</p>
                        <button (click)="view = 'shop'">Browse Products</button>
                    </div>

                    <div class="order-card" *ngFor="let order of vm.orders">
                        <div class="order-header">
                            <span class="order-id">#{{ order.id.toString().slice(-6) }}</span>
                            <span class="order-status"
                                [style.color]="getStatusColor(order.status)">
                                ● {{ order.status | titlecase }}
                            </span>
                            <span class="order-date">{{ order.placedAt | date:'medium' }}</span>
                        </div>
                        <div class="order-items-list">
                            <span *ngFor="let item of order.items; let last = last">
                                {{ getProductName(vm.products, item.productId) }} × {{ item.quantity }}{{ last ? '' : ', ' }}
                            </span>
                        </div>
                        <div class="order-total">
                            Total: {{ formatPrice(order.total, vm.currency) }}
                        </div>
                    </div>
                </div>

            </main>

            <!-- ══════════════════════ CART SIDEBAR ════════════════════════════ -->
            <div class="overlay" *ngIf="vm.cartOpen"
                (click)="shop.dispatch('toggleCart')"></div>

            <div class="cart-sidebar" [class.open]="vm.cartOpen">
                <div class="cart-header">
                    <h2>🛒 Cart ({{ vm.cartCount }})</h2>
                    <button class="close-btn"
                        (click)="shop.dispatch('toggleCart')">✕</button>
                </div>

                <div class="cart-body">
                    <div class="cart-empty" *ngIf="vm.cartItems.length === 0">
                        <p>Your cart is empty.</p>
                        <button (click)="shop.dispatch('toggleCart')">
                            Keep Shopping
                        </button>
                    </div>

                    <div class="cart-item" *ngFor="let item of vm.cartItems">
                        <div>
                            <div class="item-name">{{ item.product.name }}</div>
                            <div class="item-unit-price">
                                {{ formatPrice(item.product.price, vm.currency) }} each
                            </div>
                        </div>

                        <div class="qty-controls">
                            <button class="qty-btn"
                                (click)="shop.dispatch('updateQuantity', { productId: item.productId, quantity: item.quantity - 1 })">
                                −
                            </button>
                            <span class="qty-value">{{ item.quantity }}</span>
                            <button class="qty-btn"
                                (click)="shop.dispatch('updateQuantity', { productId: item.productId, quantity: item.quantity + 1 })">
                                +
                            </button>
                        </div>

                        <div class="item-line-total">
                            {{ formatPrice(item.product.price * item.quantity, vm.currency) }}
                        </div>

                        <button class="remove-item-btn"
                            (click)="shop.dispatch('removeFromCart', item.productId)"
                            title="Remove">✕</button>
                    </div>
                </div>

                <div class="cart-footer" *ngIf="vm.cartItems.length > 0">
                    <div class="cart-total-row">
                        <span class="cart-total-label">Total</span>
                        <span class="cart-total-amount">
                            {{ vm.cartDisplay.symbol }}{{ vm.cartDisplay.amount }}
                        </span>
                    </div>
                    <button class="checkout-btn"
                        [disabled]="vm.cartCount === 0"
                        (click)="shop.dispatch('checkout')">
                        Place Order →
                    </button>
                </div>
            </div>

        </ng-container>
    `,
})
export class AppComponent implements OnDestroy {
    readonly shop = inject(ShopService);

    /** Local view state — not part of the Polystate store */
    view: 'shop' | 'orders' = 'shop';
    maxPrice = 500;

    /** Track current currency locally for formatPrice() helper */
    private currentCurrency: Currency = 'USD';
    private readonly currencySub: Subscription;

    constructor() {
        // One subscription to keep currentCurrency in sync for formatPrice().
        // Cleaned up in ngOnDestroy to avoid leaks.
        this.currencySub = this.shop.currency$.subscribe(
            (c) => (this.currentCurrency = c)
        );
    }

    ngOnDestroy(): void {
        this.currencySub.unsubscribe();
    }

    // ── Price formatting ──────────────────────────────────────────────────────

    /** Convert a USD price to the given display currency */
    formatPrice(usdAmount: number, currency: Currency = this.currentCurrency): string {
        const rate = CURRENCY_RATES[currency];
        const symbol = CURRENCY_SYMBOLS[currency];
        return `${symbol}${(usdAmount * rate).toFixed(2)}`;
    }

    // ── Filter dispatchers ────────────────────────────────────────────────────

    onSearch(event: Event): void {
        const search = (event.target as HTMLInputElement).value;
        this.shop.dispatch('setFilter', { search });
    }

    setCategory(cat: string): void {
        this.shop.dispatch('setFilter', { category: cat as Category });
    }

    onSortBy(event: Event): void {
        const sortBy = (event.target as HTMLSelectElement).value as SortBy;
        this.shop.dispatch('setFilter', { sortBy });
    }

    toggleSortDir(current: 'asc' | 'desc'): void {
        this.shop.dispatch('setFilter', {
            sortDir: current === 'asc' ? 'desc' : 'asc',
        });
    }

    onMaxPrice(event: Event): void {
        const maxPrice = +(event.target as HTMLInputElement).value;
        this.maxPrice = maxPrice;
        this.shop.dispatch('setFilter', { maxPrice });
    }

    setCurrency(event: Event): void {
        const currency = (event.target as HTMLSelectElement).value as Currency;
        this.shop.dispatch('setCurrency', currency);
    }

    // ── Order helpers ─────────────────────────────────────────────────────────

    getStatusColor(status: string): string {
        switch (status) {
            case 'processing': return '#f59e0b';
            case 'shipped':    return '#3b82f6';
            case 'delivered':  return '#10b981';
            default:           return '#6b7280';
        }
    }

    getProductName(products: Product[], productId: number): string {
        return products.find((p) => p.id === productId)?.name ?? `#${productId}`;
    }
}
