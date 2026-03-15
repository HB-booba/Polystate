/**
 * @polystate/angular — consumer-level integration tests.
 *
 * Imports exclusively from compiled dist/ artefacts, exactly as a real
 * Angular application would consume the package.
 *
 * Uses direct instantiation only — no TestBed — to avoid the Angular JIT
 * decorator requirement and keep tests hermetic.  Angular Signal (select())
 * requires a full injection context and is covered by unit tests instead.
 *
 * Zone.js is imported for consistent Promise scheduling, but instanceof
 * Promise checks are avoided (zone.js wraps Promise → ZoneAwarePromise).
 */
import { createAngularService, PolystateService } from '@polystate/angular';
import { firstValueFrom, take, toArray } from 'rxjs';
import { describe, expect, it } from 'vitest';
import 'zone.js';

// Prevents Date.now() collisions in rapid back-to-back dispatches
const tick = () => new Promise<void>((r) => setTimeout(r, 1));

// ---------------------------------------------------------------------------
// Shared state / action types
// ---------------------------------------------------------------------------

interface TodoState {
    todos: Array<{ id: number; text: string; done: boolean }>;
    filter: 'all' | 'active' | 'done';
    loading: boolean;
}

const initialState: TodoState = { todos: [], filter: 'all', loading: false };

const actions = {
    addTodo: (s: TodoState, text: string) => ({
        ...s,
        todos: [...s.todos, { id: Date.now(), text, done: false }],
    }),
    toggle: (s: TodoState, id: number) => ({
        ...s,
        todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }),
    remove: (s: TodoState, id: number) => ({
        ...s,
        todos: s.todos.filter((t) => t.id !== id),
    }),
    setFilter: (s: TodoState, f: 'all' | 'active' | 'done') => ({
        ...s,
        filter: f,
    }),
    setLoading: (s: TodoState, loading: boolean) => ({ ...s, loading }),
};

// ---------------------------------------------------------------------------
// Convenience factory
// ---------------------------------------------------------------------------

function makeSvc() {
    return new (createAngularService<TodoState>(initialState, actions))();
}

// ---------------------------------------------------------------------------
// 1. createAngularService factory
// ---------------------------------------------------------------------------

describe('@polystate/angular — createAngularService', () => {
    it('returns a class — instances are PolystateService', () => {
        const svc = makeSvc();
        expect(svc).toBeInstanceOf(PolystateService);
    });

    it('initialises store on construction — getState works immediately', () => {
        const Svc = createAngularService({ count: 0 }, {
            inc: (s: { count: number }) => ({ count: s.count + 1 }),
        });
        const svc = new Svc();
        expect(svc.getState()).toEqual({ count: 0 });
    });

    it('each new instance has isolated state', async () => {
        const a = makeSvc();
        const b = makeSvc();
        await a.dispatch('setLoading', true);
        expect(a.getState((s) => s.loading)).toBe(true);
        expect(b.getState((s) => s.loading)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// 2. getState
// ---------------------------------------------------------------------------

describe('@polystate/angular — getState', () => {
    it('returns full initial state', () => {
        const svc = new (createAngularService<TodoState>(initialState, actions))();
        expect(svc.getState()).toEqual(initialState);
    });

    it('returns selected slice of initial state', () => {
        const svc = new (createAngularService<TodoState>(initialState, actions))();
        expect(svc.getState((s) => s.filter)).toBe('all');
        expect(svc.getState((s) => s.todos.length)).toBe(0);
    });

    it('reflects state after dispatch', async () => {
        const svc = new (createAngularService<TodoState>(initialState, actions))();
        await svc.dispatch('addTodo', 'Write tests');
        expect(svc.getState((s) => s.todos)).toHaveLength(1);
        expect(svc.getState((s) => s.todos[0].text)).toBe('Write tests');
    });
});

// ---------------------------------------------------------------------------
// 3. dispatch
// ---------------------------------------------------------------------------

describe('@polystate/angular — dispatch', () => {
    it('returns a thenable (Promise-like)', async () => {
        const svc = makeSvc();
        const p = svc.dispatch('setLoading', true);
        // Zone.js wraps native Promise — use typeof to avoid instanceof pitfall
        expect(typeof (p as any).then).toBe('function');
        await p;
        expect(svc.getState((s) => s.loading)).toBe(true);
    });

    it('updates state synchronously after await', async () => {
        const svc = makeSvc();
        await svc.dispatch('addTodo', 'First');
        await tick();
        await svc.dispatch('addTodo', 'Second');
        expect(svc.getState((s) => s.todos)).toHaveLength(2);
    });

    it('toggle action flips done flag', async () => {
        const svc = makeSvc();
        await svc.dispatch('addTodo', 'Task');
        const id = svc.getState((s) => s.todos[0].id);
        expect(svc.getState((s) => s.todos[0].done)).toBe(false);

        await svc.dispatch('toggle', id);
        expect(svc.getState((s) => s.todos[0].done)).toBe(true);

        await svc.dispatch('toggle', id);
        expect(svc.getState((s) => s.todos[0].done)).toBe(false);
    });

    it('remove action deletes item by id', async () => {
        const svc = makeSvc();
        await svc.dispatch('addTodo', 'A');
        await tick(); // ensure unique Date.now() for each id
        await svc.dispatch('addTodo', 'B');
        const todos = svc.getState((s) => s.todos);
        expect(todos).toHaveLength(2);
        await svc.dispatch('remove', todos[0].id);
        const remaining = svc.getState((s) => s.todos);
        expect(remaining).toHaveLength(1);
        expect(remaining[0].text).toBe('B');
    });
});

// ---------------------------------------------------------------------------
// 4. select$ — RxJS Observable
// ---------------------------------------------------------------------------

describe('@polystate/angular — select$', () => {
    it('emits the initial value on subscribe', async () => {
        const svc = makeSvc();
        const filter$ = svc.select$((s) => s.filter);
        const first = await firstValueFrom(filter$);
        expect(first).toBe('all');
    });

    it('emits every time the selected slice changes', async () => {
        const svc = makeSvc();
        const filter$ = svc.select$((s) => s.filter);

        // Collect 3 emissions: initial + 2 dispatches
        const values$ = filter$.pipe(take(3), toArray());
        const promise = firstValueFrom(values$);

        await svc.dispatch('setFilter', 'active');
        await svc.dispatch('setFilter', 'done');

        const values = await promise;
        expect(values).toEqual(['all', 'active', 'done']);
    });

    it('does NOT emit when unrelated slice changes', async () => {
        const svc = makeSvc();
        const filter$ = svc.select$((s) => s.filter);

        const emissions: Array<'all' | 'active' | 'done'> = [];
        const sub = filter$.subscribe((v) => emissions.push(v));

        await svc.dispatch('setLoading', true); // unrelated
        await svc.dispatch('addTodo', 'item'); // unrelated

        expect(emissions).toEqual(['all']); // only the initial value
        sub.unsubscribe();
    });

    it('emits todos array reactively', async () => {
        const svc = makeSvc();
        const counts: number[] = [];
        const sub = svc.select$((s) => s.todos.length).subscribe((n) => counts.push(n));

        await svc.dispatch('addTodo', 'X');
        await tick();
        await svc.dispatch('addTodo', 'Y');

        expect(counts).toEqual([0, 1, 2]);
        sub.unsubscribe();
    });
});

// ---------------------------------------------------------------------------
// 5. select — Angular Signal (requires injection context)
// ---------------------------------------------------------------------------

// Note: select() (Angular Signal) requires an Angular injection context.
// This is covered by packages/angular unit tests; omitted here to keep
// integration tests free of TestBed/JIT decorator machinery.

// ---------------------------------------------------------------------------
// 6. ngOnDestroy — subscription cleanup
// ---------------------------------------------------------------------------

describe('@polystate/angular — ngOnDestroy', () => {
    it('completes select$ observables on destroy', () => {
        const svc = makeSvc();
        const filter$ = svc.select$((s) => s.filter);

        let completed = false;
        const sub = filter$.subscribe({ complete: () => { completed = true; } });

        svc.ngOnDestroy();

        expect(completed).toBe(true);
        sub.unsubscribe();
    });

    it('no emissions on select$ after ngOnDestroy', async () => {
        const svc = makeSvc();
        const filter$ = svc.select$((s) => s.filter);
        const emissions: unknown[] = [];
        const sub = filter$.subscribe((v) => emissions.push(v));

        svc.ngOnDestroy();

        // Dispatch after destroy — should NOT produce new emissions
        await svc.dispatch('setFilter', 'done').catch(() => { });

        expect(emissions).toEqual(['all']); // only the subscription-time emission
        sub.unsubscribe();
    });
});

// ---------------------------------------------------------------------------
// 7. End-to-end TodoService scenario
// ---------------------------------------------------------------------------

describe('@polystate/angular — TodoService end-to-end', () => {
    it('manages a full todo workflow', async () => {
        const svc = makeSvc();

        // Add todos (tick() between them to ensure unique Date.now() IDs)
        await svc.dispatch('addTodo', 'Buy milk');
        await tick();
        await svc.dispatch('addTodo', 'Clean house');
        expect(svc.getState((s) => s.todos)).toHaveLength(2);

        // Toggle one
        const [milk] = svc.getState((s) => s.todos);
        await svc.dispatch('toggle', milk.id);
        expect(svc.getState((s) => s.todos[0].done)).toBe(true);

        // Check active in-memory
        const allTodos = svc.getState((s) => s.todos);
        const active = allTodos.filter((t) => !t.done);
        expect(active).toHaveLength(1);
        expect(active[0].text).toBe('Clean house');

        // Remove the done one
        await svc.dispatch('remove', milk.id);
        expect(svc.getState((s) => s.todos)).toHaveLength(1);

        // select$ reflects live state
        const counts: number[] = [];
        const sub = svc.select$((s) => s.todos.length).subscribe((n) => counts.push(n));

        await svc.dispatch('addTodo', 'New task');
        expect(counts).toEqual([1, 2]);

        sub.unsubscribe();
        svc.ngOnDestroy();
    });
});
