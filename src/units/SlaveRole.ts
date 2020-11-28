import { Utils } from "../utils/Utils";
import { Unit, UnitRole } from "./Unit";

enum Status {
    IDLE = 0,

    FIND_PLACE_TO_TRANSFER,
    MOVE_TO_TRANSFER,
    TRANSFER,

    FIND_HARVESTER,

    MOVE_TO_HARVESTER,
    WAIT_FOR_RESOURCE,
    FIND_BETTER_HARVESTER,
    FIND_PLACE_AROUND_FOR_TRANSFER,
}

export class SlaveRole implements Unit {
    private static targets: { [id: string]: number } = {};

    canHandle(creep: Creep): boolean {
        return creep.memory.role == UnitRole.SLAVE;
    }

    public prepare(creep: Creep): void {
        let targetId = creep.memory.targetId;
        if (targetId != undefined) {
            this.markTarget(targetId);
        }
    }

    handle(creep: Creep): void {
        if (creep.memory.status == Status.IDLE) {
            creep.memory.status = Status.FIND_HARVESTER;
        }

        if (creep.memory.status == Status.FIND_HARVESTER) {
            let harvester = creep.room.find(FIND_MY_CREEPS, { filter: object => object.memory.role == UnitRole.WORKER_HARVESTER })
                .sort((a, b) => this.weightTarget(a.id) - this.weightTarget(b.id))
                .find(() => true);

            if (harvester != undefined) {
                creep.memory.status = Status.MOVE_TO_HARVESTER;
                creep.memory.targetId = harvester.id;
            }
        }

        if (creep.memory.status == Status.MOVE_TO_HARVESTER) {
            // @ts-ignore
            let target = Game.getObjectById<RoomObject>(creep.memory.targetId);
            if (target != undefined) {
                if (Utils.distance(creep, target) == 1) {
                    creep.memory.status = Status.WAIT_FOR_RESOURCE;
                    creep.memory.statusSince = Game.time;
                } else if (creep.fatigue == 0 && creep.moveTo(target.pos) != OK) {
                    creep.memory.status = Status.IDLE;
                }
            } else {
                creep.memory.status = Status.IDLE;
            }
        }

        if (creep.memory.status == Status.WAIT_FOR_RESOURCE) {
            // @ts-ignore
            let target = Game.getObjectById<RoomObject>(creep.memory.targetId);
            if (target == undefined) {
                creep.memory.status = Status.FIND_HARVESTER;
            } /*else if (creep.memory.statusSince != null && creep.memory.statusSince + 25 < Game.time) {
                creep.memory.statusSince = undefined;
                creep.memory.targetId = undefined;
                creep.memory.status = Status.FIND_BETTER_HARVESTER;
            }*/ else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                creep.memory.targetId = undefined;
                creep.memory.status = Status.FIND_PLACE_TO_TRANSFER;
            }
        }

        if (creep.memory.status == Status.FIND_BETTER_HARVESTER) {
            let workingCreep = creep.pos.findInRange(FIND_MY_CREEPS, 2, { filter: c => c.memory.role == UnitRole.WORKER_HARVESTER })
                .sort((n1, n2) => n1.store.getFreeCapacity() - n2.store.getFreeCapacity())
                .find(() => true);

            if (workingCreep != undefined) {
                creep.memory.targetId = workingCreep.id;
                creep.memory.status = Status.MOVE_TO_HARVESTER;
            } else {
                creep.memory.targetId = undefined;
                creep.memory.status = Status.FIND_PLACE_TO_TRANSFER;
            }
        }

        if (creep.memory.status == Status.FIND_PLACE_TO_TRANSFER) {
            if (Game.spawns["Spawn1"].store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                creep.memory.status = Status.MOVE_TO_TRANSFER;
                creep.memory.targetId = Game.spawns["Spawn1"].id;
            } else {
                let structureExtension = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                    filter: s => {
                        return s.structureType == STRUCTURE_EXTENSION && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                    }
                });
                if (structureExtension != undefined) {
                    creep.memory.targetId = structureExtension.id;
                    creep.memory.status = Status.MOVE_TO_TRANSFER;
                } else {
                    let worker = creep.room.find(FIND_MY_CREEPS, { filter: c => c.memory.role == UnitRole.WORKER_UPGRADER && c.store.getFreeCapacity(RESOURCE_ENERGY) > 0 })
                        .sort((a, b) => this.weightTarget(b.id) - this.weightTarget(a.id))
                        .find(() => true);

                    if (worker != undefined) {
                        creep.memory.targetId = worker.id;
                        creep.memory.status = Status.MOVE_TO_TRANSFER;
                    }
                }
            }
        }

        if (creep.memory.status == Status.MOVE_TO_TRANSFER) {
            // @ts-ignore
            let target = Game.getObjectById<RoomObject>(creep.memory.targetId);
            if (target != undefined) {
                if (Utils.distance(creep, target) == 1) {
                    creep.memory.status = Status.TRANSFER;
                    creep.memory.statusSince = Game.time;
                } else if (creep.fatigue == 0 && creep.moveTo(target.pos) != OK) {
                    creep.memory.status = Status.IDLE;
                }
            } else {
                creep.memory.status = Status.IDLE;
            }
        }

        if (creep.memory.status == Status.TRANSFER) {
            // @ts-ignore
            let target = Game.getObjectById<Structure>(creep.memory.targetId);
            if (target == undefined || creep.transfer(target, RESOURCE_ENERGY) != OK) {
                if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                    creep.memory.status = Status.FIND_PLACE_TO_TRANSFER;
                } else {
                    creep.memory.status = Status.FIND_HARVESTER;
                }
                creep.memory.targetId = undefined;
            } else if (creep.memory.statusSince != undefined && creep.memory.statusSince + 6 < Game.time) {
                creep.memory.status = Status.FIND_PLACE_AROUND_FOR_TRANSFER;
                creep.memory.statusSince = undefined;
            }
        }

        if (creep.memory.status == Status.FIND_PLACE_AROUND_FOR_TRANSFER) {
            // @ts-ignore
            let target = Game.getObjectById<RoomObject>(creep.memory.targetId);

            let workingCreep = creep.pos.findInRange(FIND_MY_CREEPS, 2, { filter: c => c.memory.role == UnitRole.WORKER_UPGRADER })
                .filter(c => c != target)
                .sort((n1, n2) => n2.store.getFreeCapacity() - n1.store.getFreeCapacity())
                .find(() => true);
            console.log(workingCreep);
            if (workingCreep != undefined) {
                creep.memory.targetId = workingCreep.id;
                creep.memory.status = Status.MOVE_TO_TRANSFER;
            }
        }
    }

    private markTarget(id: string) {
        SlaveRole.targets[id] = (SlaveRole.targets[id] != undefined ? SlaveRole.targets[id] : 0) + 1;
    }

    private weightTarget(id: string): number {
        return (SlaveRole.targets[id] != undefined ? SlaveRole.targets[id] : 0);
    }
}