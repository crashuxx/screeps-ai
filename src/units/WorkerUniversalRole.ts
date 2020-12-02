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
    MOVE_TO_AND_LOAD,
    LOAD,
}

export class WorkerUniversalRole implements Unit {
    private static targets: { [id: string]: number } = {};

    init(): void {
        WorkerUniversalRole.targets = {};
    }

    public canHandle(creep: Creep): boolean {
        if (creep.memory.role == undefined) creep.memory.role = UnitRole.WORKER_UNIVERSAL;
        return creep.memory.role == UnitRole.WORKER_UNIVERSAL;
    }

    public prepare(creep: Creep): void {
        let targetId = creep.memory.targetId;
        if (targetId != undefined) {
            WorkerUniversalRole.markTarget(targetId);
        }
    }

    public handle(creep: Creep) {
        if (creep.memory.status == Status.HARVESTING) {
            // @ts-ignore
            let source = Game.getObjectById<RoomObject>(creep.memory.targetId);

            if (source == undefined) {
                creep.memory.status = Status.IDLE;
                creep.memory.targetId = undefined;
            } else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) != 0) {
                // @ts-ignore
                creep.harvest(source);
            } else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                creep.memory.status = Status.FIND_PLACE_TO_DISCHARGE;
                creep.memory.targetId = undefined;
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
                creep.memory.status = Status.FIND_PLACE_TO_DISCHARGE;
                creep.memory.targetId = undefined;
            } else {
                creep.memory.status = Status.IDLE;
                creep.memory.targetId = undefined;
            }
        }

        if (creep.memory.status == Status.IDLE) {
            creep.memory.targetId = undefined;
            if (creep.store.getUsedCapacity() == 0) {
                let source = creep.room.find(FIND_SOURCES)
                    .sort((a, b) => Utils.distance(creep, a) - Utils.distance(creep, b))
                    .sort(WorkerUniversalRole.weightTargetComparator)
                    .find(() => true);

                if (source != undefined) {
                    if (Utils.sourceInRange(creep, source)) {
                        creep.memory.status = Status.HARVESTING;
                        creep.memory.targetId = source.id;
                    } else {
                        creep.memory.status = Status.MOVE_TO_HARVESTING_ZONE;
                        creep.memory.targetId = source.id;
                    }
                    WorkerUniversalRole.markTarget(source.id);
                }

                creep.room.find(FIND_DROPPED_RESOURCES, { filter: r => r.resourceType == RESOURCE_ENERGY })
                    .filter(c => c.amount >= creep.store.getCapacity())
                    .cast<Resource | Structure>()
                    .ifEmptyConcat(() => {
                        return creep.room.find<StructureContainer>(FIND_STRUCTURES, { filter: s => s.structureType == STRUCTURE_CONTAINER })
                            .filter(c => c.store.getUsedCapacity() > 100);
                    })
                    .sort((a, b) => Utils.distance(creep, a) - Utils.distance(creep, b))
                    .sort(WorkerUniversalRole.weightTargetComparator)
                    .first()
                    .ifPresent(resource => {
                        WorkerUniversalRole.markTarget(resource.id);
                        creep.memory.status = Status.MOVE_TO_AND_LOAD;
                        creep.memory.targetId = resource.id;
                    });
            } else {
                creep.memory.status = Status.FIND_PLACE_TO_DISCHARGE;
                creep.memory.targetId = undefined;
            }
        }

        if (creep.memory.status == Status.MOVE_TO_AND_LOAD) {
            GameUtils.getObjectById<StructureContainer>(creep.memory.targetId)
                .ifPresent(container => {
                    if (Utils.distance(creep, container) > 1) creep.moveTo(container);
                    else creep.memory.status = Status.LOAD;
                })
                .orElseDo(() => {
                    creep.memory.status = Status.IDLE;
                    creep.memory.targetId = undefined;
                });
        }

        if (creep.memory.status == Status.MOVE_TO_HARVESTING_ZONE) {
            // @ts-ignore
            let source = Game.getObjectById<Source>(creep.memory.targetId);
            if (source == undefined) {
                creep.memory.status = Status.IDLE;
                creep.memory.targetId = undefined;
                creep.memory.statusSince = Game.time;
            } else if (Utils.sourceInRange(creep, source)) {
                creep.memory.status = Status.HARVESTING;
            } else {
                creep.moveTo(source);
            }
        }

        if (creep.memory.status == Status.MOVE_TO_TRANSFER) {
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
                creep.memory.targetId = undefined;
                creep.memory.statusSince = Game.time;
            }
        }

        if (creep.memory.status == Status.FIND_PLACE_TO_DISCHARGE) {
            GameUtils.constructionsAndControllerAndExtensionAndSpawn(creep.room)
                .concat(GameUtils.findStructuresForRepair(creep.room))
                .sort((a, b) => Utils.distance(creep, a) - Utils.distance(creep, b))
                .sort(WorkerUniversalRole.weightTargetComparator)
                .first()
                .ifPresent(target => {
                    creep.memory.targetId = target.id;
                    creep.memory.status = Status.MOVE_TO_TRANSFER;
                    creep.memory.statusSince = Game.time;
                    WorkerUniversalRole.markTarget(target.id);
                });
        }

        if (creep.memory.status == Status.TRANSFER) {
            // @ts-ignore
            let target = Game.getObjectById<RoomObject>(creep.memory.targetId);
            // @ts-ignore
            if (target == undefined || ((target.structureType == STRUCTURE_CONTAINER || creep.transfer(target, RESOURCE_ENERGY) != OK) && creep.build(target) != OK && (target.hits == target.hitsMax || creep.repair(target) != OK))) {
                creep.memory.status = Status.IDLE;
                creep.memory.targetId = undefined;
                creep.memory.statusSince = Game.time;
            }
        }
    }

    private static markTarget(id: string) {
        WorkerUniversalRole.targets[id] = (WorkerUniversalRole.targets[id] != undefined ? (WorkerUniversalRole.targets[id] + 1) : 1);
    }

    private static weightTarget(id: string): number {
        return (WorkerUniversalRole.targets[id] != undefined) ? WorkerUniversalRole.targets[id] : 0;
    }

    private static weightTargetComparator(a: RoomObject | Resource, b: RoomObject | Resource): number {
        // @ts-ignore
        return WorkerUniversalRole.weightTarget(a.id) - WorkerUniversalRole.weightTarget(b.id);
    }
}
