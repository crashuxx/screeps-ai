import { Utils } from "utils/Utils";

enum Status {
    IDLE = 0,
    MOVE_TO_HARVESTING_ZONE,
    HARVESTING,
    TRANSFER_TO_SLAVE,
    WAIT_FOR_SLAVE,
}

export class WorkerRole {

    public static run(creep: Creep) {
        if (creep.memory.status == Status.HARVESTING) {
            // @ts-ignore
            let source = Game.getObjectById<Source>(creep.memory.targetId);

            if (source == undefined) {
                creep.memory.status = Status.IDLE;
                creep.memory.targetId = undefined;
            } else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) != 0) {
                creep.harvest(source);
            } else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                creep.memory.status = Status.TRANSFER_TO_SLAVE;
            }
        }

        if(creep.memory.status == Status.WAIT_FOR_SLAVE) {
            if(Game.time%5 == 0) {
                creep.memory.status = Status.TRANSFER_TO_SLAVE;
            }
        }

        if (creep.memory.status == Status.TRANSFER_TO_SLAVE) {
            let slaves = creep.pos.findInRange(FIND_MY_CREEPS, 1, { filter: object => object.name.charAt(0) == "s" && object.store.getFreeCapacity(RESOURCE_ENERGY) > 0 });

            if (slaves.length > 0) {
                creep.transfer(slaves[0], RESOURCE_ENERGY);
                creep.memory.status = Status.HARVESTING;
            } else {
                creep.memory.status = Status.WAIT_FOR_SLAVE;
            }
        }

        if (creep.memory.status == Status.IDLE) {
            if (creep.store.getFreeCapacity() > 0) {
                let source = creep.room.find(FIND_SOURCES).find(() => true);
                if (source != undefined) {
                    if (Utils.sourceInRange(creep, source)) {
                        creep.memory.status = Status.HARVESTING;
                        creep.memory.targetId = source.id;
                    } else {
                        creep.memory.status = Status.MOVE_TO_HARVESTING_ZONE;
                        creep.memory.targetId = source.id;
                    }
                }
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
    }
}
