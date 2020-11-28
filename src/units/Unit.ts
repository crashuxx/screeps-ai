export enum UnitRole {
    SLAVE = 0,
    WORKER_UNIVERSAL,
    WORKER_HARVESTER,
    WORKER_BUILDER,
    WORKER_UPGRADER,

    SIZE
}

export interface Unit {
    canHandle(creep: Creep): boolean;

    prepare(creep: Creep): void;

    handle(creep: Creep): void;
}