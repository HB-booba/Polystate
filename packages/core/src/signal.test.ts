import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Signal } from './signal';

describe('Signal', () => {
  let signal: Signal<number>;

  beforeEach(() => {
    signal = new Signal(0);
  });

  it('should initialize with a value', () => {
    expect(signal.value).toBe(0);
  });

  it('should set and get values', () => {
    signal.value = 42;
    expect(signal.value).toBe(42);
  });

  it('should notify subscribers when value changes', () => {
    const listener = vi.fn();
    signal.subscribe(listener);

    signal.value = 10;
    expect(listener).toHaveBeenCalledWith(10);

    signal.value = 20;
    expect(listener).toHaveBeenCalledWith(20);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('should not notify if value does not change', () => {
    const listener = vi.fn();
    signal.subscribe(listener);

    signal.value = 0;
    expect(listener).toHaveBeenCalledTimes(0);
  });

  it('should support multiple subscribers', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    signal.subscribe(listener1);
    signal.subscribe(listener2);

    signal.value = 5;

    expect(listener1).toHaveBeenCalledWith(5);
    expect(listener2).toHaveBeenCalledWith(5);
  });

  it('should unsubscribe correctly', () => {
    const listener = vi.fn();
    const unsubscribe = signal.subscribe(listener);

    signal.value = 1;
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    signal.value = 2;
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should track subscriber count', () => {
    expect(signal.subscriberCount).toBe(0);

    const unsub1 = signal.subscribe(() => {});
    expect(signal.subscriberCount).toBe(1);

    const unsub2 = signal.subscribe(() => {});
    expect(signal.subscriberCount).toBe(2);

    unsub1();
    expect(signal.subscriberCount).toBe(1);

    unsub2();
    expect(signal.subscriberCount).toBe(0);
  });

  it('should work with complex types', () => {
    interface User {
      name: string;
      age: number;
    }

    const userSignal = new Signal<User>({ name: 'Alice', age: 30 });
    const listener = vi.fn();

    userSignal.subscribe(listener);
    userSignal.value = { name: 'Bob', age: 25 };

    expect(listener).toHaveBeenCalledWith({ name: 'Bob', age: 25 });
  });
});
