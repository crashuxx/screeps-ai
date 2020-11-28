// example declaration file - remove these and add your own custom typings

// memory extension samples

interface CreepMemory {
    status: number;
    targetId?: string;
    role: number;
    statusSince?: number;
}

interface Memory {
    uuid: number;
    log: any;
}

// `global` extension samples
declare namespace NodeJS {
    interface Global {
        log: any;
    }
}

interface Position {
    pos: RoomPosition
}


interface Array<T> {
    first(): T | undefined;
}
