import { Utils } from "../utils/Utils";
import { AbstractUnit, UnitRole } from "./Unit";
import { GameUtils } from "../GameUtils";

enum Status {
    IDLE = 0,
    MOVE_TO_HARVESTING_ZONE,
    HARVESTING
}

export class WorkerHarvesterRole extends AbstractUnit {
    public canHandle(creep: Creep): boolean {
        return creep.memory.role == UnitRole.WORKER_HARVESTER;
    }

    public handle(creep: Creep): void {
        if (creep.memory.status == Status.IDLE) {
            creep.memory.targetId = undefined;

            //@TODO only containers with source next-door
            creep.room.find(FIND_STRUCTURES, { filter: s => s.structureType == STRUCTURE_CONTAINER })
                .filter(source => this.weightTarget(source.id) == 0)
                .filter(source => creep.room.lookForAt(LOOK_CREEPS, source).length == 0)
                .first()
                .ifPresent(source => {console.log(source)
                    if (Utils.sourceInRange(creep, source)) {
                        this.setStatusAndTarget(creep, Status.HARVESTING, source);
                    } else {
                        this.setStatusAndTarget(creep, Status.MOVE_TO_HARVESTING_ZONE, source);
                    }
                });
        }

        if (creep.memory.status == Status.MOVE_TO_HARVESTING_ZONE) {
            GameUtils.getObjectById<Source>(creep.memory.targetId)
                .filter(target => Utils.distance(creep, target) == 0)
                .ifPresent(source => {
                    creep.pos.findInRange(FIND_SOURCES, 1)
                        .first()
                        .ifPresent(source => this.setStatusAndTarget(creep, Status.HARVESTING, source))
                        .orElseDo(() => this.setStatusAndClearTarget(creep, Status.IDLE));
                });
        }

        switch (creep.memory.status) {
            case Status.MOVE_TO_HARVESTING_ZONE:
                GameUtils.getObjectById<Source>(creep.memory.targetId)
                    .ifPresent(target => creep.moveTo(target))
                    .orElseDo(() => this.setStatusAndClearTarget(creep, Status.IDLE));
                break;

            case Status.HARVESTING:
                GameUtils.getObjectById<Source>(creep.memory.targetId)
                    .ifPresent(target => creep.harvest(target))
                    .orElseDo(() => this.setStatusAndClearTarget(creep, Status.IDLE));
                break;
        }
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
