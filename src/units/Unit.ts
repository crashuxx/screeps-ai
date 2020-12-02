export enum UnitRole {
    SLAVE = 0,
    WORKER_UNIVERSAL,
    WORKER_HARVESTER,
    WARRIOR,
    KEEPER,

    SIZE,
}

export interface Unit {
    init(): void;

    canHandle(creep: Creep): boolean;

    prepare(creep: Creep): void;

    handle(creep: Creep): void;
}