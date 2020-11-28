import { Utils } from "../utils/Utils";
import { Unit, UnitRole } from "./Unit";

enum Status {
    IDLE = 0,
    MOVE_TO_HARVESTING_ZONE,
    HARVESTING,
    FIND_PLACE_TO_DISCHARGE,
    CONSTRUCT_SITE,
    CONSTRUCT_SITE_MOVE_TO,
    TRANSFER,
    MOVE_TO_TRANSFER,
}

export class WorkerUniversalRole implements Unit {
    public canHandle(creep: Creep): boolean {
        if (creep.memory.role == undefined) creep.memory.role = UnitRole.WORKER_UNIVERSAL;
        return creep.memory.role == UnitRole.WORKER_UNIVERSAL;
    }

    public prepare(creep: Creep): void {
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

    findSomeConstructionWork(creep: Creep): boolean {
        if (Object.values(Game.constructionSites).length <= 0) return false;

        let constructionSite = Object.values(Game.constructionSites)[0];
        creep.memory.targetId = constructionSite.id;
        creep.memory.status = Status.CONSTRUCT_SITE_MOVE_TO;
        return true;
    }
}