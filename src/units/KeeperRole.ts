import { Utils } from "../utils/Utils";
import { AbstractRole, Roles } from "./Role";
import { GameUtils } from "../GameUtils";


enum Status {
    IDLE = 0,
    TAKE_RESOURCES_FROM,
    GIVE_RESOURCES_TO,
}

export class KeeperRole extends AbstractRole {
    readonly spawnAndExtensionStructureTypes = [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER];

    constructor() {
        super(Roles.KEEPER);
    }

    update(creep: Creep): void {
        if (creep.memory.status == Status.IDLE) {
            creep.room.find<StructureSpawn | StructureExtension | StructureTower>(FIND_STRUCTURES, { filter: object => this.spawnAndExtensionStructureTypes.find(v => v == object.structureType) })
                .filter(structure => structure.store.getFreeCapacity(RESOURCE_ENERGY) > (structure.structureType != STRUCTURE_TOWER ? 0 : 250))
                .sort((a, b) => Utils.distance(creep, a) - Utils.distance(creep, b))
                .first()
                .ifPresent(structure => {
                    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                        this.setStatusAndTarget(creep, Status.GIVE_RESOURCES_TO, structure);
                    } else {
                        this.thinkFindClosestResources(creep);
                    }
                })
                .orElseDo(() => {
                    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                        if (creep.room.storage) {
                            this.setStatusAndTarget(creep, Status.GIVE_RESOURCES_TO, creep.room.storage);
                        }
                    } else {
                        this.thinkFindContainerWithResources(creep);
                    }
                });
        }
    }

    private thinkFindClosestResources(creep: Creep) {
        creep.room.find<StructureStorage | StructureContainer>(FIND_STRUCTURES, { filter: object => STRUCTURE_STORAGE == object.structureType || STRUCTURE_CONTAINER == object.structureType })
            .filter(structure => structure.store.getUsedCapacity(RESOURCE_ENERGY) >= 100)
            .sort((a, b) => Utils.distance(creep, a) - Utils.distance(creep, b))
            .first()
            .ifPresent(structure => this.setStatusAndTarget(creep, Status.TAKE_RESOURCES_FROM, structure));
    }

    private thinkFindContainerWithResources(creep: Creep) {
        creep.room.find<StructureContainer>(FIND_STRUCTURES, { filter: object => STRUCTURE_CONTAINER == object.structureType })
            .filter(structure => structure.store.getUsedCapacity(RESOURCE_ENERGY) >= 700)
            .sort((a, b) => a.store.getUsedCapacity(RESOURCE_ENERGY) - b.store.getUsedCapacity(RESOURCE_ENERGY))
            .first()
            .ifPresent(structure => this.setStatusAndTarget(creep, Status.TAKE_RESOURCES_FROM, structure));
    }

    execute(creep: Creep): void {
        switch (creep.memory.status) {
            case Status.TAKE_RESOURCES_FROM:
                GameUtils.getObjectById<StructureStorage | StructureContainer>(creep.memory.targetId)
                    .ifPresent(target => {
                        creep.moveTo(target);

                        if (Utils.sourceInRange(creep, target)) {
                            creep.withdraw(target, RESOURCE_ENERGY);
                            this.setStatus(creep, Status.IDLE);
                        }
                    })
                    .orElseDo(() => this.setStatus(creep, Status.IDLE));
                break;

            case Status.GIVE_RESOURCES_TO:
                GameUtils.getObjectById<StructureSpawn | StructureExtension | StructureContainer>(creep.memory.targetId)
                    .ifPresent(target => {
                        creep.moveTo(target);

                        if (Utils.sourceInRange(creep, target)) {
                            creep.transfer(target, RESOURCE_ENERGY);
                            this.setStatus(creep, Status.IDLE);
                        }
                    })
                    .orElseDo(() => this.setStatus(creep, Status.IDLE));
                break;
        }
    }

    static spawn(room: Room) {
        room.find<StructureSpawn>(FIND_MY_STRUCTURES, { filter: object => object.structureType == STRUCTURE_SPAWN })
            .filter(spawn => spawn.spawning == undefined)
            .first()
            .ifPresent(spawn => {
                spawn.spawnCreep([MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY], Game.time.toString(), {
                    memory: {
                        status: 0,
                        role: Roles.KEEPER
                    }
                });
            });
    }
}