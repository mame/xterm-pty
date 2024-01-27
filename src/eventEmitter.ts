type Listener<T> = (arg: T) => void;
export type Event<T> = (listener: Listener<T>) => { dispose: () => void };

export class EventEmitter<T> {
  private listeners = new Set<Listener<T>>();

  private _register(listener: Listener<T>) {
    this.listeners.add(listener);
    return {
      dispose: () => {
        this.listeners.delete(listener);
      }
    };
  }

  register = this._register.bind(this);

  public fire(arg: T): void {
    for (const listener of this.listeners) {
      try {
        listener(arg);
      } catch (e) {
        console.error(e);
      }
    }
  }
}
