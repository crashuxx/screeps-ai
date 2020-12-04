import { Utils } from "../utils/Utils";
import { AbstractRole, Roles } from "./Role";
import { GameUtils } from "../GameUtils";

enum Status {
    IDLE = 0,
    MOVE_TO_HARVESTING_ZONE,
    HARVESTING
}

export class HarvesterRole extends AbstractRole {
    constructor() {
        super(Roles.HARVESTER);
    }

    public update(creep: Creep): void {
        if (creep.memory.status == Status.IDLE) {
            creep.memory.targetId = undefined;

            //@TODO only containers with source next-door
            creep.room.find(FIND_STRUCTURES, { filter: s => s.structureType == STRUCTURE_CONTAINER })
                .filter(source => this.weightTarget(source.id) == 0)
                .filter(source => creep.room.lookForAt(LOOK_CREEPS, source).filter(c => c.memory.role == Roles.HARVESTER).length == 0)
                .first()
                .ifPresent(source => {
                    if (Utils.sourceInRange(creep, source)) {
                        this.setStatusAndTarget(creep, Status.HARVESTING, source);
                    } else {
                        this.setStatusAndTarget(creep, Status.MOVE_TO_HARVESTING_ZONE, source);
                    }
                });
        }
    }

    public execute(creep: Creep): void {
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
            .filter(s => s.room.energyCapacityAvailable >= 550)
            .filter(s => s.room.energyAvailable >= 550)
            .ifPresent(s => {
                let body = [MOVE, WORK, WORK, WORK, WORK, WORK, WORK];
                if (s.room.energyCapacityAvailable <=650) {
                    body = [MOVE, WORK, WORK, WORK, WORK, WORK];
                }

                s.spawnCreep(body, Game.time.toString(), {
                    memory: {
                        status: 0,
                        role: Roles.HARVESTER
                    }
                });
            });
    }
}
