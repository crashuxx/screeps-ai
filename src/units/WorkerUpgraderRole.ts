import { Utils } from "../utils/Utils";
import { Unit, UnitRole } from "./Unit";
import { GameUtils } from "../GameUtils";

enum Status {
    IDLE = 0,
    MOVE_TO_CONTROLLER,
    TRANSFER,
    WAIT_FOR_RESOURCES,
}

export class WorkerUpgraderRole implements Unit {
    private static targets: { [id: string]: number } = {};

    public canHandle(creep: Creep): boolean {
        return creep.memory.role == UnitRole.WORKER_UPGRADER;
    }

    public prepare(creep: Creep): void {
        let targetId = creep.memory.targetId;
        if (targetId != undefined) {
            this.markTarget(targetId);
        }
    }

    public handle(creep: Creep): void {
        if (creep.memory.status == Status.TRANSFER) {
            // @ts-ignore
            let target = Game.getObjectById<Structure>(creep.memory.targetId);

            if (target == undefined) {
                creep.memory.status = Status.IDLE;
                creep.memory.statusSince = Game.time;
                creep.memory.targetId = undefined;
            } else if (creep.store.getUsedCapacity(RESOURCE_ENERGY) == OK) {
                creep.memory.status = Status.WAIT_FOR_RESOURCES;
                creep.memory.statusSince = Game.time;
                creep.memory.statusSince = Game.time;
            } else if (creep.transfer(target, RESOURCE_ENERGY) != OK) {
                // @ts-ignore
                if (creep.build(target) != OK) {
                    creep.memory.status = Status.IDLE;
                    creep.memory.statusSince = Game.time;
                }
            } else if (creep.memory.statusSince == undefined || creep.memory.statusSince + 100 < Game.time) {
                creep.memory.status = Status.IDLE;
                creep.memory.statusSince = Game.time;
            }
        }

        if (creep.memory.status == Status.WAIT_FOR_RESOURCES) {
            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) != 0) {
                creep.memory.status = Status.TRANSFER;
            } /*else if (creep.memory.statusSince == undefined || creep.memory.statusSince + 100 < Game.time) {
                creep.memory.status = Status.IDLE;
                creep.memory.statusSince = Game.time;
            }*/
        }

        if (creep.memory.status == Status.IDLE) {
            let target = GameUtils.constructionsAndController(creep.room)
                .sort((a, b) => this.weightTarget(a.id) - this.weightTarget(b.id))
                .find(() => true);

            if (target != undefined) {
                creep.memory.targetId = target.id;
                creep.memory.status = Status.MOVE_TO_CONTROLLER;
                creep.memory.statusSince = Game.time;
            }
        }

        if (creep.memory.status == Status.MOVE_TO_CONTROLLER) {
            // @ts-ignore
            let target = Game.getObjectById<Structure>(creep.memory.targetId);

            if (target == undefined) {
                creep.memory.status = Status.IDLE;
                creep.memory.statusSince = Game.time;
                creep.memory.targetId = undefined;
            } else if (Utils.workInRange(creep, target)) {
                creep.memory.status = Status.TRANSFER;
                creep.memory.statusSince = Game.time;
            } else {
                creep.moveTo(target);
            }
        }
    }

    private markTarget(id: string) {
        WorkerUpgraderRole.targets[id] = (WorkerUpgraderRole.targets[id] != undefined ? WorkerUpgraderRole.targets[id] : 0) + 1;
    }

    private weightTarget(id: string): number {
        return (WorkerUpgraderRole.targets[id] != undefined ? WorkerUpgraderRole.targets[id] : 0);
    }
}
