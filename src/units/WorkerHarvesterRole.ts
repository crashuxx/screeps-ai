import { Utils } from "../utils/Utils";
import { Unit, UnitRole } from "./Unit";
import { GameUtils } from "../GameUtils";


enum Status {
    IDLE = 0,
    MOVE_TO_HARVESTING_ZONE,
    HARVESTING,
    DROP_TO_CONTAINER,
}

export class WorkerHarvesterRole implements Unit {
    private static targets: { [id: string]: number } = {};

    init(): void {
        WorkerHarvesterRole.targets = {}
    }

    public canHandle(creep: Creep): boolean {
        return creep.memory.role == UnitRole.WORKER_HARVESTER;
    }

    public prepare(creep: Creep): void {
        let targetId = creep.memory.targetId;
        if (targetId != undefined) {
            WorkerHarvesterRole.markTarget(targetId);
        }
    }

    public handle(creep: Creep): void {
        if (creep.memory.status == Status.IDLE) {
            creep.memory.targetId = undefined;

            creep.room.find(FIND_STRUCTURES, { filter: s => s.structureType == STRUCTURE_CONTAINER })
                //.filter(s => s.pos.findInRange(FIND_SOURCES, 1).filter(s => WorkerHarvesterRole.weightTarget(s.id) == 0).isNotEmpty())
                .filter(source => WorkerHarvesterRole.weightTarget(source.id) == 0)
                .filter(source => creep.room.lookForAt(LOOK_CREEPS, source).length == 0)
                .first()
                .ifPresent(source => {
                    WorkerHarvesterRole.markTarget(source.id);

                    creep.memory.targetId = source.id;
                    creep.memory.statusSince = Game.time;

                    if (Utils.sourceInRange(creep, source)) {
                        creep.memory.status = Status.HARVESTING;
                    } else {
                        creep.memory.status = Status.MOVE_TO_HARVESTING_ZONE;
                    }
                });
        }

        if (creep.memory.status == Status.HARVESTING) {
            GameUtils.getObjectById<Source>(creep.memory.targetId)
                .ifPresent(source => {
                   // if (creep.store.getFreeCapacity(RESOURCE_ENERGY) != 0) {
                        creep.harvest(source);
                  //  } else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                   //     creep.memory.status = Status.DROP_TO_CONTAINER;
                  //  }
                });
        }

        if (creep.memory.status == Status.DROP_TO_CONTAINER) {
            creep.pos.findInRange(FIND_STRUCTURES, 1, { filter: object => object.structureType == STRUCTURE_CONTAINER })
                .sort(container => Utils.distance(creep, container))
                .first()
                .ifPresent(container => {
                    creep.transfer(container, RESOURCE_ENERGY);
                    creep.memory.status = Status.HARVESTING;
                });
            // .orElseDo(() => creep.say(":O"));
        }

        if (creep.memory.status == Status.MOVE_TO_HARVESTING_ZONE) {
            GameUtils.getObjectById<Source>(creep.memory.targetId)
                .ifPresent(source => {
                    if (Utils.distance(creep, source) == 0) {
                        creep.pos.findInRange(FIND_SOURCES, 1)
                            .first()
                            .ifPresent(source => {
                                creep.memory.targetId = source.id;
                                creep.memory.status = Status.HARVESTING;
                            }).orElseDo(() => {
                            creep.memory.status = Status.IDLE
                        });
                    } else {
                        creep.moveTo(source);
                    }
                })
                .orElseDo(() => {
                    creep.memory.status = Status.IDLE;
                    creep.memory.targetId = undefined;
                });
        }
    }

    private static markTarget(id: string) {
        WorkerHarvesterRole.targets[id] = (WorkerHarvesterRole.targets[id] != undefined ? (WorkerHarvesterRole.targets[id] + 1) : 1);
    }

    private static weightTarget(id: string): number {
        return (WorkerHarvesterRole.targets[id] != undefined) ? WorkerHarvesterRole.targets[id] : 0;
    }

    private static weightTargetComparator(a: RoomObject, b: RoomObject): number {
        // @ts-ignore
        return WorkerHarvesterRole.weightTarget(a.id) - WorkerHarvesterRole.weightTarget(b.id);
    }

    public static spawn(room: Room) {
        room.find(FIND_MY_STRUCTURES, { filter: object => object.structureType == STRUCTURE_SPAWN })
            .first()
            .cast<StructureSpawn>()
            .filter(s => s.room.energyCapacityAvailable >= 700)
            .filter(s => s.room.energyAvailable >= 700)
            .ifPresent(s => {
                s.spawnCreep([MOVE, WORK, WORK, WORK, WORK, WORK, WORK], Game.time.toString(), {
                    memory: {
                        status: 0,
                        role: UnitRole.WORKER_HARVESTER
                    }
                });
            });
    }
}
