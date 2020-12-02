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

export abstract class AbstractUnit implements Unit {
    protected targets: { [id: string]: number } = {};

    public init(): void {
        this.targets = {};
    }

    abstract canHandle(creep: Creep): boolean;

    abstract prepare(creep: Creep): void;

    abstract handle(creep: Creep): void;

    protected setStatus(creep: Creep, status: number): void {
        creep.memory.status = status;
        creep.memory.statusSince = Game.time;
    }

    protected setStatusAndClearTarget(creep: Creep, status: number): void {
        creep.memory.status = status;
        creep.memory.statusSince = Game.time;
        creep.memory.targetId = undefined;
    }

    protected setStatusAndTarget(creep: Creep, status: number, target: RoomObject): void {
        creep.memory.status = status;
        creep.memory.statusSince = Game.time;
        // @ts-ignore
        creep.memory.targetId = target.id;

        // @ts-ignore
        this.markTarget(target.id);
    }

    protected markTarget(id: string) {
        this.targets[id] = (this.targets[id] != undefined ? (this.targets[id] + 1) : 1);
    }

    protected weightTarget(id: string): number {
        return (this.targets[id] != undefined) ? this.targets[id] : 0;
    }

    protected weightTargetComparator(a: RoomObject, b: RoomObject): number {
        // @ts-ignore
        return this.weightTarget(a.id) - this.weightTarget(b.id);
    }

}