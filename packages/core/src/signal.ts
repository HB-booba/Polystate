/**
 * A reactive signal primitive that notifies subscribers of value changes.
 *
 * @template T - The type of the signal's value
 *
 * @example
 * ```typescript
 * const signal = new Signal(0);
 *
 * signal.subscribe((value) => {
 *   console.log('New value:', value);
 * });
 *
 * signal.value = 1; // Logs: "New value: 1"
 * ```
 */
export class Signal<T> {
  private _value: T;
  private subscribers: Set<(value: T) => void> = new Set();

  /**
   * Creates a new Signal with an initial value.
   * @param initialValue - The initial value for the signal
   */
  constructor(initialValue: T) {
    this._value = initialValue;
  }

  /**
   * Gets the current value of the signal.
   */
  get value(): T {
    return this._value;
  }

  /**
   * Sets the value of the signal and notifies all subscribers.
   * @param newValue - The new value to set
   */
  set value(newValue: T) {
    if (this._value !== newValue) {
      this._value = newValue;
      this.notify();
    }
  }

  /**
   * Subscribes to changes in the signal's value.
   * @param subscriber - Callback function called with the new value
   * @returns Unsubscribe function
   */
  subscribe(subscriber: (value: T) => void): () => void {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  /**
   * Notifies all subscribers of a value change.
   */
  private notify(): void {
    this.subscribers.forEach((subscriber) => {
      subscriber(this._value);
    });
  }

  /**
   * Gets the number of active subscribers.
   */
  get subscriberCount(): number {
    return this.subscribers.size;
  }
}
