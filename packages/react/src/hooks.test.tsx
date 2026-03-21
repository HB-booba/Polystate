import { createStore } from '@polystate/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement as h } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createStoreContext,
  createStoreHooks,
  useDispatch,
  useSelector,
  useSetState,
  useStore,
} from './index';

describe('React Hooks', () => {
  interface TestState {
    count: number;
    name: string;
  }

  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore<TestState>(
      { count: 0, name: 'Test' },
      {
        increment: (state) => ({ ...state, count: state.count + 1 }),
        setName: (state, name: string) => ({ ...state, name }),
      }
    );
  });

  describe('useStore', () => {
    it('should subscribe to the entire store state', async () => {
      function TestComponent() {
        const state = useStore(store);
        return h('div', null, `Count: ${state.count}`);
      }

      render(h(TestComponent));
      expect(screen.getByText('Count: 0')).toBeInTheDocument();

      await store.dispatch('increment');
      await waitFor(() => {
        expect(screen.getByText('Count: 1')).toBeInTheDocument();
      });
    });

    it('should re-render when store changes', async () => {
      let renderCount = 0;

      function TestComponent() {
        const state = useStore(store);
        renderCount++;
        return h('div', null, `Count: ${state.count}`);
      }

      render(h(TestComponent));
      const initialRenderCount = renderCount;

      await store.dispatch('increment');
      await waitFor(() => {
        expect(renderCount).toBeGreaterThan(initialRenderCount);
      });
    });
  });

  describe('useSelector', () => {
    it('should select a slice of state', async () => {
      function TestComponent() {
        const count = useSelector(store, (state) => state.count);
        return h('div', null, `Count: ${count}`);
      }

      render(h(TestComponent));
      expect(screen.getByText('Count: 0')).toBeInTheDocument();

      await store.dispatch('increment');
      await waitFor(() => {
        expect(screen.getByText('Count: 1')).toBeInTheDocument();
      });
    });

    it('should only re-render when selected value changes', async () => {
      let renderCount = 0;

      function TestComponent() {
        const count = useSelector(store, (state) => state.count);
        renderCount++;
        return h('div', null, `Count: ${count}`);
      }

      render(h(TestComponent));
      const initialRenderCount = renderCount;

      // Change name, not count
      await store.dispatch('setName', 'Updated');
      await waitFor(
        () => {
          // Should not have re-rendered
          expect(renderCount).toBe(initialRenderCount);
        },
        { timeout: 100 }
      ).catch(() => {
        // Expected to timeout since no re-render should happen
      });
    });

    it('should not re-render when unrelated state changes, only when selected slice changes', async () => {
      let renderCount = 0;

      function TestComponent() {
        const count = useSelector(store, (state) => state.count);
        renderCount++;
        return h('div', null, `Count: ${count}`);
      }

      render(h(TestComponent));
      const afterMount = renderCount;

      // Change name several times — count selector must not trigger re-renders
      await store.dispatch('setName', 'A');
      await store.dispatch('setName', 'B');
      await store.dispatch('setName', 'C');

      // Change count once — should trigger exactly one re-render
      await store.dispatch('increment');

      await waitFor(() => {
        expect(screen.getByText('Count: 1')).toBeInTheDocument();
      });

      expect(renderCount).toBe(afterMount + 1);
    });
  });

  describe('useDispatch', () => {
    it('should dispatch actions', async () => {
      function TestComponent() {
        const state = useStore(store);
        const { dispatch } = useDispatch(store);

        return h(
          'div',
          null,
          h('div', null, `Count: ${state.count}`),
          h('button', { onClick: () => dispatch('increment') }, 'Increment')
        );
      }

      render(h(TestComponent));
      const button = screen.getByText('Increment');

      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByText('Count: 1')).toBeInTheDocument();
      });
    });

    it('should dispatch actions with payload', async () => {
      function TestComponent() {
        const state = useStore(store);
        const { dispatch } = useDispatch(store);

        return h(
          'div',
          null,
          h('div', null, `Name: ${state.name}`),
          h('button', { onClick: () => dispatch('setName', 'Alice') }, 'Set Name')
        );
      }

      render(h(TestComponent));
      const button = screen.getByText('Set Name');

      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByText('Name: Alice')).toBeInTheDocument();
      });
    });
  });

  describe('useSetState', () => {
    it('should update partial state', async () => {
      function TestComponent() {
        const state = useStore(store);
        const setState = useSetState(store);

        return h(
          'div',
          null,
          h('div', null, `Count: ${state.count}, Name: ${state.name}`),
          h('button', { onClick: () => setState({ count: 42 }) }, 'Set Count')
        );
      }

      render(h(TestComponent));
      const button = screen.getByText('Set Count');

      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByText('Count: 42, Name: Test')).toBeInTheDocument();
      });
    });
  });

  describe('createStoreHooks', () => {
    it('should create pre-bound hooks', async () => {
      const {
        useStore: useTestStore,
        useDispatch: useTestDispatch,
        useSelector: useTestSelector,
      } = createStoreHooks(store);

      function TestComponent() {
        const state = useTestStore();
        const { dispatch } = useTestDispatch();
        const count = useTestSelector((state) => state.count);

        return h(
          'div',
          null,
          h('div', null, `Count from store: ${state.count}`),
          h('div', null, `Count from selector: ${count}`),
          h('button', { onClick: () => dispatch('increment') }, 'Increment')
        );
      }

      render(h(TestComponent));

      expect(screen.getByText('Count from store: 0')).toBeInTheDocument();
      expect(screen.getByText('Count from selector: 0')).toBeInTheDocument();

      const button = screen.getByText('Increment');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Count from store: 1')).toBeInTheDocument();
        expect(screen.getByText('Count from selector: 1')).toBeInTheDocument();
      });
    });
  });

  describe('createStoreContext', () => {
    it('should provide store through context', async () => {
      const { Provider, useContextStore } = createStoreContext(store);

      function Inner() {
        const state = useStore(useContextStore());
        return h('div', null, `Count: ${state.count}`);
      }

      function Wrapper() {
        return h(Provider, null, h(Inner));
      }

      render(h(Wrapper));
      expect(screen.getByText('Count: 0')).toBeInTheDocument();

      await store.dispatch('increment');
      await waitFor(() => {
        expect(screen.getByText('Count: 1')).toBeInTheDocument();
      });
    });

    it('should throw if used outside provider', () => {
      const { useContextStore } = createStoreContext(store);

      function TestComponent() {
        useContextStore();
        return h('div', null, 'Test');
      }

      expect(() => render(h(TestComponent))).toThrow(
        'useContextStore must be used within a StoreContext Provider'
      );
    });
  });
});
