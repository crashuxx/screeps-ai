declare global {
    interface Array<T> {
        first(): Optional<T>;
        isNotEmpty(): boolean;
        ifEmptyConcat(func: () => T[]): T[];
        cast<R>(): R[];
    }
}

if (!Array.prototype.first) {
    // @ts-ignore
    Array.prototype.first = function() {
        return new Optional(this.find(() => true));
    };
}
if (!Array.prototype.isNotEmpty) {
    // @ts-ignore
    Array.prototype.isNotEmpty = function() {
        return this.length != 0;
    };
}
if (!Array.prototype.ifEmptyConcat) {
    // @ts-ignore
    Array.prototype.ifEmptyConcat = function(func: () => []) {
        if (!this.isNotEmpty()) {
            return func();
        }
        return this;
    };
}
if (!Array.prototype.cast) {
    // @ts-ignore
    Array.prototype.cast = function() {
        return this;
    };
}

export class Optional<T> {
    public static readonly optionalOfNull = new Optional(null);

    private value?: T;

    public constructor(value?: T) {
        this.value = value;
    }

    public cast<O>(): Optional<O> {
        // @ts-ignore
        return this;
    }

    public filter(callback: (v: T) => boolean): Optional<T> {
        if (this.value != undefined) {
            if (callback(this.value)) {
                return this;
            }
        }

        // @ts-ignore
        return Optional.optionalOfNull;
    }

    public peek(callback: (v: T) => void): Optional<T> {
        if (this.value != undefined) {
            callback(this.value);
        }
        return this;
    }

    public ifPresent(callback: (v: T) => any): Optional<T> {
        const self = this;
        if (this.value != undefined) {
            // @ts-ignore
            callback(this.value);
        }
        return self;
    }

    public orElseThrow(): T {
        if (this.value == undefined) {
            throw new Error("Null pointer exception");
        }
        return this.value;
    }

    public orElseDo(callback: () => any): Optional<T> {
        if (this.value == undefined) {
           callback();
        }
        return this;
    }

    public static ofNullable<R>(value: R | null): Optional<R> {
        // @ts-ignore
        return value != undefined ? new Optional<R>(value) : Optional.optionalOfNull;
    }
}
