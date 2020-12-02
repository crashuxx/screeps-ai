import { Utils } from "../utils/Utils";
import { AbstractRole, Roles } from "./Role";
import { GameUtils } from "../GameUtils";
import { Events } from "../lib/Events";

enum Status {
    IDLE = 0,
    MOVE_TO_HARVESTING_ZONE,
    HARVESTING,
    FIND_PLACE_TO_DISCHARGE,
    TRANSFER,
    MOVE_TO_TRANSFER,
    MOVE_TO_AND_LOAD,
    LOAD,
}

export class WorkerUniversalRole extends AbstractRole {
    private doRefillTask: { [roomName: string]: boolean } = {};

    constructor() {
        super();

        Events.on("creep_role_count", (a) => {
            this.handler_creepCount(a);
        });
    }

    public accept(creep: Creep): boolean {
        return creep.memory.role == Roles.WORKER_UNIVERSAL;
    }

    public execute(creep: Creep) {
        if (creep.memory.status == Status.HARVESTING) {
            // @ts-ignore
            let source = Game.getObjectById<RoomObject>(creep.memory.targetId);

            if (source == undefined) {
                this.setStatusAndClearTarget(creep, Status.IDLE);
            } else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) != 0) {
                // @ts-ignore
                creep.harvest(source);
            } else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                this.setStatusAndClearTarget(creep, Status.FIND_PLACE_TO_DISCHARGE);
            }
        }

        if (creep.memory.status == Status.LOAD) {
            GameUtils.getObjectById<StructureContainer | Resource>(creep.memory.targetId)
                .filter(container => ((container instanceof StructureContainer) ? container.store.getUsedCapacity(RESOURCE_ENERGY) : container.amount) > 50)
                .ifPresent(container => {
                    if (container instanceof StructureContainer) creep.withdraw(container, RESOURCE_ENERGY);
                    else creep.pickup(container);
                });

            if (creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                this.setStatusAndClearTarget(creep, Status.FIND_PLACE_TO_DISCHARGE);
            } else {
                this.setStatusAndClearTarget(creep, Status.IDLE);
            }
        }

        if (creep.memory.status == Status.IDLE) {
            if (creep.store.getUsedCapacity() == 0) {
                let source = creep.room.find(FIND_SOURCES)
                    .sort((a, b) => Utils.distance(creep, a) - Utils.distance(creep, b))
                    .sort((a, b) => this.weightTargetComparator(a, b))
                    .find(() => true);

                if (source != undefined) {
                    if (Utils.sourceInRange(creep, source)) {
                        this.setStatusAndTarget(creep, Status.HARVESTING, source);
                    } else {
                        this.setStatusAndTarget(creep, Status.MOVE_TO_HARVESTING_ZONE, source);
                    }
                }

                creep.room.find(FIND_DROPPED_RESOURCES, { filter: r => r.resourceType == RESOURCE_ENERGY })
                    .filter(c => c.amount >= creep.store.getCapacity())
                    .cast<Resource | Structure>()
                    .ifEmptyConcat(() => {
                        return creep.room.find<StructureContainer>(FIND_STRUCTURES, { filter: s => s.structureType == STRUCTURE_CONTAINER })
                            .filter(c => c.store.getUsedCapacity() > 100);
                    })
                    .sort((a, b) => Utils.distance(creep, a) - Utils.distance(creep, b))
                    .sort((a, b) => this.weightTargetComparator(a, b))
                    .first()
                    .ifPresent(resource => {
                        this.setStatusAndTarget(creep, Status.MOVE_TO_AND_LOAD, resource);
                    });
            } else {
                this.setStatusAndClearTarget(creep, Status.FIND_PLACE_TO_DISCHARGE);
            }
        }

        if (creep.memory.status == Status.MOVE_TO_AND_LOAD) {
            GameUtils.getObjectById<StructureContainer>(creep.memory.targetId)
                .ifPresent(container => {
                    if (Utils.distance(creep, container) > 1) creep.moveTo(container);
                    else this.setStatusAndTarget(creep, Status.LOAD, container);
                })
                .orElseDo(() => {
                    this.setStatusAndClearTarget(creep, Status.IDLE);
                });
        }

        if (creep.memory.status == Status.MOVE_TO_HARVESTING_ZONE) {
            // @ts-ignore
            let source = Game.getObjectById<Source>(creep.memory.targetId);
            if (source == undefined) {
                this.setStatusAndClearTarget(creep, Status.IDLE);
            } else if (Utils.sourceInRange(creep, source)) {
                this.setStatusAndTarget(creep, Status.HARVESTING, source);
            } else {
                creep.moveTo(source);
            }
        }

        if (creep.memory.status == Status.MOVE_TO_TRANSFER) {
            // @ts-ignore
            let target = Game.getObjectById<RoomObject>(creep.memory.targetId);
            if (target != undefined) {
                if (Utils.workInRange(creep, target)) {
                    this.setStatusAndTarget(creep, Status.TRANSFER, target);
                } else if (creep.fatigue == 0 && creep.moveTo(target.pos) != OK) {
                    this.setStatusAndTarget(creep, Status.MOVE_TO_TRANSFER, target);
                }
            } else {
                this.setStatusAndClearTarget(creep, Status.IDLE);
            }
        }

        if (creep.memory.status == Status.FIND_PLACE_TO_DISCHARGE) {
            (this.doRefillTask[creep.room.name] ? GameUtils.constructionsAndControllerAndExtensionAndSpawn(creep.room) : GameUtils.constructionsAndController(creep.room))
                .concat(GameUtils.findStructuresForRepair(creep.room))
                .sort((a, b) => Utils.distance(creep, a) - Utils.distance(creep, b))
                .sort((a, b) => this.weightTargetComparator(a, b))
                .first()
                .ifPresent(target => {
                    this.setStatusAndTarget(creep, Status.MOVE_TO_TRANSFER, target);
                });
        }

        if (creep.memory.status == Status.TRANSFER) {
            // @ts-ignore
            let target = Game.getObjectById<RoomObject>(creep.memory.targetId);
            // @ts-ignore
            if (target == undefined || ((target.structureType == STRUCTURE_CONTAINER || creep.transfer(target, RESOURCE_ENERGY) != OK) && creep.build(target) != OK && (target.hits == target.hitsMax || creep.repair(target) != OK))) {
                this.setStatusAndClearTarget(creep, Status.IDLE);
            }
        }
    }

    private handler_creepCount(map: { [roomName: string]: { [role: number]: Creep[] } }) {
        this.doRefillTask = {};
        for (let roomName in map) {
            this.doRefillTask[roomName] = map[roomName][Roles.KEEPER] == undefined || map[roomName][Roles.KEEPER].length == 0;
        }
    }
}
