import { Utils } from "../utils/Utils";
import { AbstractRole, Roles } from "./Role";
import { GameUtils } from "../GameUtils";
import { Events } from "../lib/Events";

enum Status {
    IDLE = 0,
    TAKE_RESOURCES_FROM,
    GIVE_RESOURCES_TO,
    HARVEST,
    TRANSFER,
    BUILD,
    REPAIR,
}

export class WorkerRole extends AbstractRole {
    private doRefillTask: { [roomName: string]: boolean } = {};

    constructor() {
        super(Roles.WORKER);

        Events.on("creep_role_count", (a) => {
            this.handler_creepCount(a);
        });
    }

    init(creep: Creep) {
        super.init(creep);
    }

    public update(creep: Creep): void {
        if (creep.memory.status == Status.IDLE) {
            if (creep.store.getUsedCapacity() == 0) { // find resources
                creep.room.find(FIND_DROPPED_RESOURCES, { filter: r => r.resourceType == RESOURCE_ENERGY })
                    .filter(c => c.amount >= creep.store.getCapacity())
                    .cast<Resource | Structure | Source>()
                    .concat(
                        creep.room.find<StructureContainer>(FIND_STRUCTURES, { filter: s => s.structureType == STRUCTURE_CONTAINER })
                            .filter(c => c.store.getUsedCapacity() > 100)
                            .cast<StructureContainer | Source>()
                            .ifEmptyConcat(() => GameUtils.findRoomSources(creep.room)) //TODO if source is empty, what then ?
                    )
                    .sort((a, b) => Utils.distance(creep, a) - Utils.distance(creep, b)) // TODO measure by sortest path ?
                    .sort((a, b) => this.weightTargetComparator(a, b))
                    .first()
                    .ifPresent(source => this.setStatusAndTarget(creep, Status.TAKE_RESOURCES_FROM, source));
                //TODO or else sleep for a while ?
            } else {
                (this.doRefillTask[creep.room.name] ? GameUtils.constructionsAndControllerAndExtensionAndSpawn(creep.room) : GameUtils.constructionsAndController(creep.room))
                    .concat(GameUtils.findStructuresForRepair(creep.room))//TODO don't do that if theres a tower in room
                    .filter(s => s.structureType != STRUCTURE_CONTAINER)
                    .sort((a, b) => Utils.distance(creep, a) - Utils.distance(creep, b))
                    .sort((a, b) => this.weightTargetComparator(a, b))
                    /*                .sort((a, b) => {
                                        if (a.structureType == STRUCTURE_SPAWN) return -1;
                                        else if (b.structureType == STRUCTURE_SPAWN) return 1;
                                        else return 0;
                                    })*/
                    .first()
                    .ifPresent(target => {
                        this.setStatusAndTarget(creep, Status.GIVE_RESOURCES_TO, target);
                    });
            }
        }
    }

    public execute(creep: Creep) {
        switch (creep.memory.status) {
            case Status.TAKE_RESOURCES_FROM:
                GameUtils.getObjectById<Resource | Structure | Source>(creep.memory.targetId)
                    .ifPresent(target => {
                        creep.moveTo(target);

                        if (Utils.sourceInRange(creep, target)) {
                            if (target instanceof StructureContainer) {
                                creep.withdraw(target, RESOURCE_ENERGY);
                                this.setStatus(creep, Status.IDLE);
                            } else if (target instanceof Resource) {
                                creep.pickup(target);
                                this.setStatus(creep, Status.IDLE);
                            } else if (target instanceof Source) {
                                creep.harvest(target);
                                this.setStatus(creep, Status.HARVEST);
                            }
                        }
                    })
                    .orElseDo(() => this.setStatus(creep, Status.IDLE));
                break;

            case Status.GIVE_RESOURCES_TO:
                GameUtils.getObjectById<StructureSpawn | StructureExtension | StructureContainer | StructureController | ConstructionSite>(creep.memory.targetId)
                    .ifPresent(target => {
                        creep.moveTo(target);

                        if (target instanceof ConstructionSite) {
                            if (Utils.workInRange(creep, target)) {
                                this.setStatus(creep, Status.BUILD);
                            }
                        } else if (target.hitsMax > 0 && target.hits < 1000) {
                            console.log("repair");
                            if (Utils.workInRange(creep, target)) {
                                this.setStatus(creep, Status.REPAIR);
                            }
                        } else {
                            if (Utils.workInRange(creep, target)) {
                                this.setStatus(creep, Status.TRANSFER);
                            }
                        }
                    })
                    .orElseDo(() => this.setStatus(creep, Status.IDLE));
                break;
        }

        switch (creep.memory.status) {
            case Status.HARVEST:
                GameUtils.getObjectById<Source>(creep.memory.targetId)
                    .ifPresent(source => {
                        //TODO Should be moved to creep's memory
                        let workPower = creep.body.filter(p => p.type == WORK).length;

                        creep.harvest(source);

                        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) - (workPower * 2) < 0) {
                            this.setStatusAndClearTarget(creep, Status.IDLE);
                        }
                    })
                    .orElseDo(() => this.setStatusAndClearTarget(creep, Status.IDLE));
                break;

            case Status.TRANSFER:
                //TODO Should be moved to creep's memory
                var workPower = creep.body.filter(p => p.type == WORK).length;

                GameUtils.getObjectById<StructureController>(creep.memory.targetId)
                    .filter(target => creep.transfer(target, RESOURCE_ENERGY) == OK)
                    .filter(target => creep.store.getUsedCapacity(RESOURCE_ENERGY) - workPower > 0)
                    //.ifPresent(target => console.log("Transfer " + target))
                    .orElseDo(() => this.setStatusAndClearTarget(creep, Status.IDLE));
                break;

            case Status.BUILD:
                //TODO Should be moved to creep's memory
                var workPower = creep.body.filter(p => p.type == WORK).length;

                GameUtils.getObjectById<ConstructionSite>(creep.memory.targetId)
                    .filter(target => target.progress < target.progressTotal)
                    .filter(target => creep.build(target) == OK)
                    .filter(target => creep.store.getUsedCapacity(RESOURCE_ENERGY) - workPower > 0)
                    .filter(target => target.progress + (workPower * 5) < target.progressTotal)
                    //.ifPresent(target => console.log("Build " + target))
                    .orElseDo(() => this.setStatusAndClearTarget(creep, Status.IDLE));
                break;

            case Status.REPAIR:
                //TODO Should be moved to creep's memory
                var workPower = creep.body.filter(p => p.type == WORK).length;

                GameUtils.getObjectById<Structure>(creep.memory.targetId)
                    .filter(target => target.hits < target.hitsMax)
                    .filter(target => creep.repair(target) == OK)
                    .filter(target => creep.store.getUsedCapacity(RESOURCE_ENERGY) - workPower > 0)
                    .filter(target => target.hits + (100 * workPower) < target.hitsMax)
                    //.ifPresent(target => console.log("Repair " + target))
                    .orElseDo(() => this.setStatusAndClearTarget(creep, Status.IDLE));
                break;
        }
    }

    private handler_creepCount(map: { [roomName: string]: { [role: number]: Creep[] } }) {
        this.doRefillTask = {};
        for (let roomName in map) {
            this.doRefillTask[roomName] = map[roomName][Roles.KEEPER] == undefined || map[roomName][Roles.KEEPER].length == 0;
        }
    }

    public static spawn(room: Room, creepCount: { [role: number]: Creep[] }) {
        let optionalSpawn = room.find<StructureSpawn>(FIND_MY_STRUCTURES, { filter: object => object.structureType == STRUCTURE_SPAWN }).first();
        let workerCount = creepCount[Roles.WORKER]?.length || 0;

        if (workerCount > 0 && room.energyCapacityAvailable >= 1400) {
            optionalSpawn.ifPresent(spawn => spawn.spawnCreep([MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, WORK, WORK, WORK, WORK, WORK, WORK, WORK], Game.time.toString(), {
                memory: { status: Status.IDLE, role: Roles.WORKER }
            }));
        } else if (workerCount > 0 && room.energyCapacityAvailable >= 800) {
            optionalSpawn.ifPresent(spawn => spawn.spawnCreep([MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, WORK, WORK, WORK, WORK], Game.time.toString(), {
                memory: { status: Status.IDLE, role: Roles.WORKER }
            }));
        } else if (workerCount > 0 && room.energyCapacityAvailable >= 550) {
            optionalSpawn.ifPresent(spawn => spawn.spawnCreep([MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, WORK, WORK], Game.time.toString(), {
                memory: { status: Status.IDLE, role: Roles.WORKER }
            }));
        } else if (room.energyCapacityAvailable <= 300) {
            optionalSpawn.ifPresent(spawn => spawn.spawnCreep([MOVE, CARRY, CARRY, CARRY, WORK], Game.time.toString(), {
                memory: { status: Status.IDLE, role: Roles.WORKER }
            }));
        }
    }
}
