import { Utils } from "../utils/Utils";
import { Unit, UnitRole } from "./Unit";
import { GameUtils } from "../GameUtils";

enum Status {
    IDLE = 0,
    MOVE_TO_HARVESTING_ZONE,
    HARVESTING,
    FIND_PLACE_TO_DISCHARGE,
    TRANSFER,
    MOVE_TO_TRANSFER,
}

export class WorkerUniversalRole implements Unit {
    private static targets: { [id: string]: number } = {};

    public canHandle(creep: Creep): boolean {
        if (creep.memory.role == undefined) creep.memory.role = UnitRole.WORKER_UNIVERSAL;
        return creep.memory.role == UnitRole.WORKER_UNIVERSAL;
    }

    public prepare(creep: Creep): void {
        let targetId = creep.memory.targetId;
        if (targetId != undefined) {
            this.markTarget(targetId);
        }
    }

    public handle(creep: Creep) {
        if (creep.memory.status == Status.HARVESTING) {
            // @ts-ignore
            let source = Game.getObjectById<Source>(creep.memory.targetId);

            if (source == undefined) {
                creep.memory.status = Status.IDLE;
                creep.memory.targetId = undefined;
            } else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) != 0) {
                creep.harvest(source);
            } else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                creep.memory.status = Status.FIND_PLACE_TO_DISCHARGE;
            }
        }


        if (creep.memory.status == Status.IDLE) {
            if (creep.store.getUsedCapacity() == 0) {
                let source = creep.room.find(FIND_SOURCES)
                    .filter(s => s.id != '0f8f923dd13eb994302f5f08')
                    .sort((a,b) => this.weightTarget(a.id) - this.weightTarget(b.id))
                    .find(() => true);

                if (source != undefined) {
                    if (Utils.sourceInRange(creep, source)) {
                        creep.memory.status = Status.HARVESTING;
                        creep.memory.targetId = source.id;
                    } else {
                        creep.memory.status = Status.MOVE_TO_HARVESTING_ZONE;
                        creep.memory.targetId = source.id;
                    }
                    this.markTarget(source.id)
                }
            } else {
                creep.memory.status = Status.FIND_PLACE_TO_DISCHARGE;
            }
        }

        if (creep.memory.status == Status.MOVE_TO_HARVESTING_ZONE) {
            // @ts-ignore
            let source = Game.getObjectById<Source>(creep.memory.targetId);
            if (source == undefined) {
                creep.memory.status = Status.IDLE;
                creep.memory.targetId = undefined;
            } else if (Utils.sourceInRange(creep, source)) {
                creep.memory.status = Status.HARVESTING;
            } else {
                creep.moveTo(source);
            }
        }

        if(creep.memory.status == Status.MOVE_TO_TRANSFER) {
            // @ts-ignore
            let target = Game.getObjectById<RoomObject>(creep.memory.targetId);
            if (target != undefined) {
                if (Utils.workInRange(creep, target)) {
                    creep.memory.status = Status.TRANSFER;
                } else if (creep.fatigue == 0 && creep.moveTo(target.pos) != OK) {
                    creep.memory.status = Status.MOVE_TO_TRANSFER;
                }
            } else {
                creep.memory.status = Status.IDLE;
            }
        }

        if (creep.memory.status == Status.FIND_PLACE_TO_DISCHARGE) {
            let target = GameUtils.constructionsAndControllerAndExtensionAndSpawn(creep.room)
                .sort((a,b) => this.weightTarget(a.id) - this.weightTarget(b.id))
                .first();

            if (target != undefined) {
                creep.memory.targetId = target.id;
                creep.memory.status = Status.MOVE_TO_TRANSFER;
                creep.memory.statusSince = Game.time;
            }
        }

        if (creep.memory.status == Status.TRANSFER) {
            // @ts-ignore
            let target = Game.getObjectById<RoomObject>(creep.memory.targetId);
            // @ts-ignore
            if (target == undefined || (creep.transfer(target, RESOURCE_ENERGY) != OK && creep.build(target) != OK)) {
                creep.memory.status = Status.IDLE;
            }
        }
    }

    private markTarget(id: string) {
        WorkerUniversalRole.targets[id] = (WorkerUniversalRole.targets[id] != undefined ? WorkerUniversalRole.targets[id] : 0) + 1;
    }

    private weightTarget(id: string): number {
        return (WorkerUniversalRole.targets[id] != undefined ? WorkerUniversalRole.targets[id] : 0);
    }

    public workComparator(a: RoomObject, b:RoomObject): number {
        // @ts-ignore
        return this.weightTarget(b.id) - this.weightTarget(a.id)
    }
}
