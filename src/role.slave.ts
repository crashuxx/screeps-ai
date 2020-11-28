import { Utils } from "utils/Utils";

enum Status {
    IDLE = 0,
    MOVE_TO,
    CHARGING,

    FIND_PLACE_TO_DISCHARGE,
    MOVE_TO_CHARGING,

    TRANSFER,
    MOVE_TO_TRANSFER,

    CONSTRUCT_SITE,
    CONSTRUCT_SITE_MOVE_TO,
    FIND_PLACE_TO_CHARGE,
}

export class SlaveRole {

    public static run(creep: Creep) {
        if (creep.memory.status == Status.CHARGING) {
            if (creep.store.getFreeCapacity() == 0) {
                creep.memory.status = Status.FIND_PLACE_TO_DISCHARGE;
            } else {
                if (Game.time % 10 == 0) {
                    let workingCreep = creep.pos.findInRange(FIND_MY_CREEPS, 2, { filter: object => object.name.charAt(0) == "w" })
                        .sort((n1, n2) => n1.store.getFreeCapacity() - n2.store.getFreeCapacity())
                        .find(() => true);

                    if (workingCreep != undefined) {
                        creep.memory.targetId = workingCreep.id;
                        creep.memory.status = Status.MOVE_TO_CHARGING;
                    } else {
                        creep.memory.targetId = undefined;
                        creep.memory.status = Status.IDLE;
                    }
                }
            }
        }

        if(creep.memory.status == Status.FIND_PLACE_TO_CHARGE) {
            let masterCreep = creep.pos.findClosestByRange(FIND_MY_CREEPS, { filter: object => object.name.charAt(0) == "w" });
            if (masterCreep != undefined) {
                creep.memory.targetId = masterCreep.id;
                if (Utils.distance(creep, masterCreep) > 1) {
                    creep.memory.status = Status.MOVE_TO_CHARGING;
                } else {
                    creep.memory.status = Status.CHARGING;
                }
            }
        }

        if(creep.memory.status == Status.MOVE_TO_CHARGING) {
            // @ts-ignore
            let target = Game.getObjectById<RoomObject>(creep.memory.targetId);
            if (target != undefined) {
                if (Utils.distance(creep, target) == 1) {
                    creep.memory.status = Status.CHARGING;
                } else if (creep.fatigue == 0 && creep.moveTo(target.pos) != OK) {
                    creep.memory.status = Status.CHARGING;
                }
            } else {
                creep.memory.status = Status.IDLE;
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
            if (Game.spawns["Spawn1"].store.getFreeCapacity(RESOURCE_ENERGY) > 40) {
                creep.memory.status = Status.MOVE_TO_TRANSFER;
                creep.memory.targetId = Game.spawns["Spawn1"].id;
            } else if (Object.values(Game.constructionSites).length > 0) {
                let constructionSite = Object.values(Game.constructionSites)[0];
                creep.memory.targetId = constructionSite.id;
                creep.memory.status = Status.CONSTRUCT_SITE_MOVE_TO;
            } else {
                let structureExtension = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, { filter: s => {return s.structureType == STRUCTURE_EXTENSION && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0;} });
                if (structureExtension != undefined) {
                    creep.memory.targetId = structureExtension.id;
                    creep.memory.status = Status.MOVE_TO_TRANSFER;
                } else {
                    let controller = creep.room.controller;
                    if (controller != undefined) {
                        creep.memory.targetId = controller.id;
                        creep.memory.status = Status.MOVE_TO_TRANSFER;
                    }
                }
            }
        }

        if (creep.memory.status == Status.IDLE) {
            creep.memory.targetId = undefined;

            if (creep.store.getUsedCapacity() == 0) {
                creep.memory.status = Status.FIND_PLACE_TO_CHARGE
            } else {
                creep.memory.status = Status.FIND_PLACE_TO_DISCHARGE;
            }
        }

        if (creep.memory.status == Status.MOVE_TO) {
            // @ts-ignore
            let target = Game.getObjectById<RoomObject>(creep.memory.targetId);
            if (target != undefined) {
                if (Utils.workInRange(creep, target)) {
                    creep.memory.status = Status.IDLE;
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
                creep.memory.status = Status.IDLE;
            }
        }

        if (creep.memory.status == Status.CONSTRUCT_SITE_MOVE_TO) {
            // @ts-ignore
            let target = Game.getObjectById<ConstructionSite>(creep.memory.targetId);
            if (target != undefined) {
                if (!Utils.constructionInRange(creep, target)) {
                    creep.moveTo(target);
                } else {
                    creep.memory.status = Status.CONSTRUCT_SITE;
                }
            } else {
                creep.memory.status = Status.IDLE;
                creep.memory.targetId = undefined;
            }
        }

        if (creep.memory.status == Status.CONSTRUCT_SITE) {
            // @ts-ignore
            let target = Game.getObjectById<ConstructionSite>(creep.memory.targetId);
            if (creep.store.getUsedCapacity() == 0) {
                creep.memory.status = Status.IDLE;
            } else if (target != undefined) {
                if (creep.build(target) != OK) {
                    if (!this.findSomeConstructionWork(creep)) {
                        creep.memory.status = Status.IDLE;
                    }
                }
            } else {
                if (!this.findSomeConstructionWork(creep)) {
                    creep.memory.status = Status.IDLE;
                }
            }
        }
    }

    static findSomeConstructionWork(creep: Creep): boolean {
        if (Object.values(Game.constructionSites).length <= 0) return false;

        let constructionSite = Object.values(Game.constructionSites)[0];
        creep.memory.targetId = constructionSite.id;
        creep.memory.status = Status.CONSTRUCT_SITE_MOVE_TO;
        return true;
    }
}
