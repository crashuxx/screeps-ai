export enum Roles {
    RESERVED_ = 0,
    WORKER,
    HARVESTER,
    WARRIOR,
    KEEPER,

    TMP_CLAIMER,
    SIZE,
}

export interface Role {
    init(creep: Creep): void;

    died(creep: CreepMemory): void;

    accept(creep: Creep): boolean;

    update(creep: Creep): void;

    execute(creep: Creep): void;
}

export abstract class AbstractRole implements Role {
    protected targets: { [id: string]: number } = {};
    private readonly role: Roles;

    constructor(role: Roles) {
        this.role = role;
    }

    public init(creep: Creep): void {
        if (creep.memory.targetId) {
            this.markTarget(creep.memory.targetId);
        }
    }

    public died(creepMemory: CreepMemory): void {
        if (creepMemory.role == this.role && creepMemory.targetId && this.targets[creepMemory.targetId]) {
            this.targets[creepMemory.targetId] = Math.max(this.targets[creepMemory.targetId] - 1, 0);
        }
    }

    public accept(creep: Creep): boolean {
        return creep.memory.role == this.role;
    }

    abstract update(creep: Creep): void;

    abstract execute(creep: Creep): void;

    protected setStatus(creep: Creep, status: number): void {
        creep.memory.status = status;
        creep.memory.statusSince = Game.time;
    }

    protected setStatusAndClearTarget(creep: Creep, status: number): void {
        if (creep.memory.targetId) {
            this.targets[creep.memory.targetId] = Math.max(this.targets[creep.memory.targetId] - 1, 0);
        }

        creep.memory.status = status;
        creep.memory.statusSince = Game.time;
        creep.memory.targetId = undefined;
    }

    protected setStatusAndTarget(creep: Creep, status: number, target: RoomObject): void {
        if (creep.memory.targetId) {
            this.targets[creep.memory.targetId] = Math.max(this.targets[creep.memory.targetId] - 1, 0);
        }

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
