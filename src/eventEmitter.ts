type Listener<T> = (arg: T) => void;
export type Event<T> = (listener: Listener<T>) => { dispose: () => void };

export class EventEmitter<T> {
  private listeners: Listener<T>[] = [];

  private _register(listener: Listener<T>) {
    this.listeners.push(listener);
    return {
      dispose: () => {
        let index = this.listeners.indexOf(listener);
        if (index !== -1) this.listeners.splice(index, 1);
      },
    };
  }

  register = this._register.bind(this);

  public fire(arg: T): void {
    for (const listener of this.listeners) listener(arg);
  }
}
