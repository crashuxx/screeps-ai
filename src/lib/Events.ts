export class Events {
    private static events: { [name: string]: [(...args: any) => any] } = {};

    public static emit(event: string, ...args: any) {
        for (let i of this.events[event] || []) {
            i(...args);
        }
    }

    public static on(event: string, callback: (...args: any) => any) {
        (this.events[event] = this.events[event] || []).push(callback);
    }
}
