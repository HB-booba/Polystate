/**
 * @polystate/react — consumer-level integration tests.
 *
 * Imports exclusively from compiled dist/ artefacts. Components are built
 * with createElement (no JSX transform needed in .ts files) to keep the
 * integration config minimal.
 */
import { createStore } from '@polystate/core';
import {
    createStoreContext,
    createStoreHooks,
    useDispatch,
    useSelector,
    useSetState,
    useStore,
} from '@polystate/react';
import {
    act,
    fireEvent,
    render,
    screen
} from '@testing-library/react';
import { createElement as h } from 'react';
import { describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Shared store factory (reset per test below)
// ---------------------------------------------------------------------------

interface TodoState {
    todos: Array<{ id: number; text: string; done: boolean }>;
    filter: 'all' | 'active' | 'done';
    loading: boolean;
}

function makeTodoStore() {
    return createStore<TodoState>(
        { todos: [], filter: 'all', loading: false },
        {
            addTodo: (s, text: string) => ({
                ...s,
                todos: [...s.todos, { id: Date.now(), text, done: false }],
            }),
            toggle: (s, id: number) => ({
                ...s,
                todos: s.todos.map((t) =>
                    t.id === id ? { ...t, done: !t.done } : t
                ),
            }),
            remove: (s, id: number) => ({
                ...s,
                todos: s.todos.filter((t) => t.id !== id),
            }),
            setFilter: (s, f: 'all' | 'active' | 'done') => ({
                ...s,
                filter: f,
            }),
            setLoading: (s, loading: boolean) => ({ ...s, loading }),
        }
    );
}

// ---------------------------------------------------------------------------
// 1. useStore — full-state subscription
// ---------------------------------------------------------------------------

describe('@polystate/react — useStore', () => {
    it('renders initial state and updates on dispatch', async () => {
        const store = makeTodoStore();

        function Counter() {
            const state = useStore(store);
            return h('div', null, `todos:${state.todos.length} loading:${state.loading}`);
        }

        const { unmount } = render(h(Counter));
        expect(screen.getByText('todos:0 loading:false')).toBeTruthy();

        await act(() => store.dispatch('setLoading', true));
        expect(screen.getByText('todos:0 loading:true')).toBeTruthy();

        await act(() => store.dispatch('addTodo', 'Buy milk'));
        expect(screen.getByText('todos:1 loading:true')).toBeTruthy();

        unmount();
    });

    it('re-renders on every store update', async () => {
        const store = makeTodoStore();
        let renders = 0;

        function Tracked() {
            renders++;
            const state = useStore(store);
            return h('span', null, String(state.todos.length));
        }

        render(h(Tracked));
        const baseline = renders;

        await act(() => store.dispatch('addTodo', 'A'));
        await act(() => store.dispatch('addTodo', 'B'));

        expect(renders).toBe(baseline + 2);
    });
});

// ---------------------------------------------------------------------------
// 2. useSelector — fine-grained subscription
// ---------------------------------------------------------------------------

describe('@polystate/react — useSelector', () => {
    it('returns the selected slice', async () => {
        const store = makeTodoStore();

        function TodoCount() {
            const count = useSelector(store, (s) => s.todos.length);
            return h('div', null, `count:${count}`);
        }

        render(h(TodoCount));
        expect(screen.getByText('count:0')).toBeTruthy();

        await act(() => store.dispatch('addTodo', 'Wash car'));
        expect(screen.getByText('count:1')).toBeTruthy();
    });

    it('does NOT re-render when unrelated slice changes', async () => {
        const store = makeTodoStore();
        let renders = 0;

        function FilterLabel() {
            renders++;
            const filter = useSelector(store, (s) => s.filter);
            return h('span', null, filter);
        }

        render(h(FilterLabel));
        const baseline = renders;

        // Change loading / todos — FilterLabel must NOT re-render
        await act(() => store.dispatch('setLoading', true));
        await act(() => store.dispatch('addTodo', 'x'));

        expect(renders).toBe(baseline);

        // Change filter — now it must re-render
        await act(() => store.dispatch('setFilter', 'active'));
        expect(renders).toBe(baseline + 1);
        expect(screen.getByText('active')).toBeTruthy();
    });

    it('multiple selectors are independent', async () => {
        const store = makeTodoStore();
        let countRenders = 0;
        let filterRenders = 0;

        function CountSlice() {
            countRenders++;
            const n = useSelector(store, (s) => s.todos.length);
            return h('span', { 'data-testid': 'count' }, String(n));
        }

        function FilterSlice() {
            filterRenders++;
            const f = useSelector(store, (s) => s.filter);
            return h('span', { 'data-testid': 'filter' }, f);
        }

        render(h('div', null, h(CountSlice), h(FilterSlice)));
        const cBase = countRenders;
        const fBase = filterRenders;

        await act(() => store.dispatch('addTodo', 'task'));
        expect(countRenders).toBe(cBase + 1);
        expect(filterRenders).toBe(fBase); // no change

        await act(() => store.dispatch('setFilter', 'done'));
        expect(countRenders).toBe(cBase + 1); // no change
        expect(filterRenders).toBe(fBase + 1);
    });
});

// ---------------------------------------------------------------------------
// 3. useDispatch — action dispatching from components
// ---------------------------------------------------------------------------

describe('@polystate/react — useDispatch', () => {
    it('dispatches actions that update sibling component', async () => {
        const store = makeTodoStore();

        function AddButton() {
            const { dispatch } = useDispatch(store);
            return h(
                'button',
                { onClick: () => dispatch('addTodo', 'new task') },
                'Add'
            );
        }

        function TaskList() {
            const todos = useSelector(store, (s) => s.todos);
            return h('ul', null, ...todos.map((t) => h('li', { key: t.id }, t.text)));
        }

        render(h('div', null, h(AddButton), h(TaskList)));

        expect(screen.queryByText('new task')).toBeNull();

        await act(() => {
            fireEvent.click(screen.getByText('Add'));
        });

        expect(screen.getByText('new task')).toBeTruthy();
    });

    it('dispatch is stable (same reference between renders)', async () => {
        const store = makeTodoStore();
        const dispatchRefs: Function[] = [];

        function Inspector() {
            const { dispatch } = useDispatch(store);
            dispatchRefs.push(dispatch);
            useStore(store); // force re-render on any change
            return h('div', null, String(dispatchRefs.length));
        }

        render(h(Inspector));
        await act(() => store.dispatch('setLoading', true));
        await act(() => store.dispatch('setLoading', false));

        // Should have 3 render calls but dispatch ref must be the same
        expect(dispatchRefs.length).toBeGreaterThanOrEqual(1);
        const [first, ...rest] = dispatchRefs;
        for (const ref of rest) {
            expect(ref).toBe(first);
        }
    });
});

// ---------------------------------------------------------------------------
// 4. useSetState — partial merge shorthand
// ---------------------------------------------------------------------------

describe('@polystate/react — useSetState', () => {
    it('sets partial state without losing other keys', async () => {
        const store = createStore(
            { a: 1, b: 2, c: 3 },
            {} as Record<string, never>
        );

        function Partial() {
            const state = useStore(store);
            const setState = useSetState(store);
            return h(
                'div',
                null,
                h('span', { 'data-testid': 'vals' }, `${state.a}-${state.b}-${state.c}`),
                h('button', { onClick: () => setState({ b: 99 }) }, 'Patch')
            );
        }

        render(h(Partial));
        expect(screen.getByTestId('vals').textContent).toBe('1-2-3');

        await act(() => {
            fireEvent.click(screen.getByText('Patch'));
        });

        expect(screen.getByTestId('vals').textContent).toBe('1-99-3');
    });
});

// ---------------------------------------------------------------------------
// 5. createStoreHooks — pre-bound hook factory
// ---------------------------------------------------------------------------

describe('@polystate/react — createStoreHooks', () => {
    it('creates hooks bound to the store', async () => {
        const store = makeTodoStore();
        const {
            useStore: useTodo,
            useSelector: useTodoSel,
            useDispatch: useTodoDispatch,
        } = createStoreHooks(store);

        function App() {
            const state = useTodo();
            const count = useTodoSel((s) => s.todos.length);
            const { dispatch } = useTodoDispatch();
            return h(
                'div',
                null,
                h('span', { 'data-testid': 'info' }, `${state.filter}:${count}`),
                h('button', { onClick: () => dispatch('addTodo', 'item') }, 'Add')
            );
        }

        render(h(App));
        expect(screen.getByTestId('info').textContent).toBe('all:0');

        await act(() => {
            fireEvent.click(screen.getByText('Add'));
        });

        expect(screen.getByTestId('info').textContent).toBe('all:1');
    });
});

// ---------------------------------------------------------------------------
// 6. createStoreContext — React context integration
// ---------------------------------------------------------------------------

describe('@polystate/react — createStoreContext', () => {
    it('provides store to descendants through context', async () => {
        const store = makeTodoStore();
        const { Provider, useContextStore } = createStoreContext(store);

        function Child() {
            const ctxStore = useContextStore();
            const n = useSelector(ctxStore, (s) => s.todos.length);
            const { dispatch } = useDispatch(ctxStore);
            return h(
                'div',
                null,
                h('span', { 'data-testid': 'n' }, String(n)),
                h('button', { onClick: () => dispatch('addTodo', 't') }, 'Add')
            );
        }

        render(h(Provider, null, h(Child)));
        expect(screen.getByTestId('n').textContent).toBe('0');

        await act(() => {
            fireEvent.click(screen.getByText('Add'));
        });

        expect(screen.getByTestId('n').textContent).toBe('1');
    });

    it('throws outside provider', () => {
        const store = makeTodoStore();
        const { useContextStore } = createStoreContext(store);

        function Orphan() {
            useContextStore();
            return h('div', null, 'ok');
        }

        const err = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => render(h(Orphan))).toThrow();
        err.mockRestore();
    });
});

// ---------------------------------------------------------------------------
// 7. Full TodoApp — end-to-end scenario
// ---------------------------------------------------------------------------

describe('@polystate/react — TodoApp end-to-end', () => {
    it('add, filter and remove todos', async () => {
        const store = makeTodoStore();
        const { useSelector: useSel, useDispatch: useDis } = createStoreHooks(store);

        function TodoApp() {
            const todos = useSel((s) => s.todos);
            const filter = useSel((s) => s.filter);
            const { dispatch } = useDis();

            const visible =
                filter === 'all'
                    ? todos
                    : filter === 'active'
                      ? todos.filter((t) => !t.done)
                      : todos.filter((t) => t.done);

            return h(
                'div',
                null,
                h('button', { onClick: () => dispatch('addTodo', 'Task A') }, 'Add A'),
                h('button', { onClick: () => dispatch('addTodo', 'Task B') }, 'Add B'),
                h(
                    'button',
                    {
                        onClick: () =>
                            dispatch('toggle', todos.find((t) => t.text === 'Task A')?.id ?? 0),
                    },
                    'Toggle A'
                ),
                h('button', { onClick: () => dispatch('setFilter', 'active') }, 'Active'),
                h('button', { onClick: () => dispatch('setFilter', 'done') }, 'Done'),
                h('button', { onClick: () => dispatch('setFilter', 'all') }, 'All'),
                h(
                    'ul',
                    null,
                    ...visible.map((t) =>
                        h(
                            'li',
                            { key: t.id, 'data-testid': `todo-${t.text.replace(' ', '-')}` },
                            t.text
                        )
                    )
                ),
                h('span', { 'data-testid': 'filter-label' }, filter)
            );
        }

        render(h(TodoApp));

        // Add two todos
        await act(() => { fireEvent.click(screen.getByText('Add A')); });
        await act(() => { fireEvent.click(screen.getByText('Add B')); });
        expect(screen.getAllByRole('listitem')).toHaveLength(2);

        // Toggle Task A → done
        await act(() => { fireEvent.click(screen.getByText('Toggle A')); });
        
        // Filter: active → only Task B
        await act(() => { fireEvent.click(screen.getByText('Active')); });
        expect(screen.getAllByRole('listitem')).toHaveLength(1);
        expect(screen.getByTestId('todo-Task-B')).toBeTruthy();
        expect(screen.queryByTestId('todo-Task-A')).toBeNull();

        // Filter: done → only Task A
        await act(() => { fireEvent.click(screen.getByText('Done')); });
        expect(screen.getAllByRole('listitem')).toHaveLength(1);
        expect(screen.getByTestId('todo-Task-A')).toBeTruthy();

        // Filter: all → both
        await act(() => { fireEvent.click(screen.getByText('All')); });
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });
});
