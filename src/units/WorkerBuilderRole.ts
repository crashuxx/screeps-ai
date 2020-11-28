import { Utils } from "../utils/Utils";
import { Unit, UnitRole } from "./Unit";

enum Status {
    IDLE = 0,
    MOVE_TO_CONTROLLER,
    FIND_TO_CONSTRUCTION,
    MOVE_TO_CONSTRUCTION,
    TRANSFER,
    WAIT_FOR_RESOURCES,
}

export class WorkerBuilderRole implements Unit {
    public canHandle(creep: Creep): boolean {
        return creep.memory.role == UnitRole.WORKER_BUILDER;
    }

    public prepare(creep: Creep): void {
    }

    public handle(creep: Creep): void {
        if (creep.memory.status == Status.TRANSFER) {
            // @ts-ignore
            let target = Game.getObjectById<Structure>(creep.memory.targetId);

            if (target == undefined) {
                creep.memory.status = Status.IDLE;
                creep.memory.targetId = undefined;
            } else if(creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0) {
                creep.memory.status = Status.WAIT_FOR_RESOURCES;
            } else if (creep.transfer(target, RESOURCE_ENERGY) != 0) {
                console.log(";O")
            }
        }

        if (creep.memory.status == Status.WAIT_FOR_RESOURCES) {
            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) != 0) {
                creep.memory.status = Status.TRANSFER;
            }
        }

        if (creep.memory.status == Status.IDLE) {
            creep.memory.status = Status.MOVE_TO_CONSTRUCTION
        }

        if (creep.memory.status == Status.MOVE_TO_CONSTRUCTION) {
            // @ts-ignore
            let controller = creep.room.controller;
            if (controller == undefined) {
                creep.memory.status = Status.IDLE;
                creep.memory.targetId = undefined;
            } else if (Utils.workInRange(creep, controller)) {
                creep.memory.status = Status.TRANSFER;
                creep.memory.targetId = controller.id;
            } else {
                creep.moveTo(controller);
            }
        }
    }
}
