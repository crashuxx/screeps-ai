import { Utils } from "../utils/Utils";
import { AbstractRole, Roles } from "./Role";

enum Status {
    IDLE = 0,
    MOVE_TO_WHITE_FLAG,
    MOVE,
    CLAIM,
}

export class ClaimerRole extends AbstractRole {
    constructor() {
        super(Roles.TMP_CLAIMER);
    }

    public update(creep: Creep): void {
    }

    public execute(creep: Creep): void {
        if (creep.memory.status == Status.IDLE || creep.memory.status == Status.MOVE_TO_WHITE_FLAG) {
            let target = creep.room.find<StructureController>(FIND_STRUCTURES, { filter: object => object.structureType == STRUCTURE_CONTROLLER })
                .filter(s => s.owner == undefined)
                .find(() => true);

            if (target != undefined) {
                if (Utils.distance(creep, target) <= 1) {
                    creep.memory.status = Status.CLAIM;
                    creep.memory.targetId = target.id;
                } else {
                    creep.memory.status = Status.MOVE;
                    creep.memory.targetId = target.id;
                }
            } else {
                creep.memory.status = Status.MOVE_TO_WHITE_FLAG;
                creep.memory.targetId = undefined;
            }
        }

        if (creep.memory.status == Status.MOVE_TO_WHITE_FLAG) {
            for (let flag of Object.values(Game.flags)) {
                if (flag.color == 10) {
                    if (creep.moveTo(flag) != OK) {
                        creep.memory.status = Status.IDLE;
                    }
                    break;
                }
            }
        }

        if (creep.memory.status == Status.MOVE) {
            // @ts-ignore
            let target = Game.getObjectById<Creep>(creep.memory.targetId);

            if (target == undefined) {
                creep.memory.status = Status.IDLE;
                creep.memory.targetId = undefined;
            } else if (Utils.distance(creep, target) <= 1) {
                creep.memory.status = Status.CLAIM;
            } else if (creep.moveTo(target) != OK) {
                creep.memory.status = Status.IDLE;
                creep.memory.targetId = undefined;
            }
        }

        if (creep.memory.status == Status.CLAIM) {
            // @ts-ignore
            let target = Game.getObjectById<StructureController>(creep.memory.targetId);

            if (target == undefined) {
                creep.memory.status = Status.IDLE;
                creep.memory.targetId = undefined;
            } else if (creep.claimController(target) != OK) {
                creep.memory.status = Status.IDLE;
                creep.memory.targetId = undefined;
            }
        }
    }
}
