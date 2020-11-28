if (!Array.prototype.first) {
    // @ts-ignore
    Array.prototype.first = function() {
        return this.find(() => true);
    };
}

export class Optional<T> {
    private value?:T;

    public constructor(value?: T) {
        this.value = value;
    }

    public orElseThrow(): T {
        if (this.value == undefined) {
            throw new Error("Null pointer exception");
        }
        return this.value;
    }
}
