export enum Roles {
    RESERVED_ = 0,
    WORKER_UNIVERSAL,
    HARVESTER,
    WARRIOR,
    KEEPER,

    SIZE,
}

export interface Role {
    init(): void;

    accept(creep: Creep): boolean;

    update(creep: Creep): void;

    execute(creep: Creep): void;
}

export abstract class AbstractRole implements Role {
    protected targets: { [id: string]: number } = {};

    public init(): void {
        this.targets = {};
    }

    abstract accept(creep: Creep): boolean;

    public update(creep: Creep): void {
        let targetId = creep.memory.targetId;
        if (targetId != undefined) {
            this.markTarget(targetId);
        }
    }

    abstract execute(creep: Creep): void;

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