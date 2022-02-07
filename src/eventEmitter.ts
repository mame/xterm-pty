type Listener<T> = (arg: T) => void;
export type Event<T> = (listener: Listener<T>) => { dispose: () => void };

export class EventEmitter<T> {
  private listeners: Listener<T>[] = [];

  get register(): Event<T> {
    const listeners = this.listeners;
    return (listener: Listener<T>) => {
      listeners.push(listener);
      return {
        dispose: () => {
          for (let i = 0; i < listeners.length; i++) {
            if (listeners[i] === listener) {
              listeners.splice(i, 1);
              return;
            }
          }
        },
      };
    };
  }

  public fire(arg: T): void {
    for (const listener of this.listeners) listener(arg);
  }
}
