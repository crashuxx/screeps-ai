import { Utils } from "../utils/Utils";
import { AbstractRole, Role, Roles } from "./Role";

enum Status {
    IDLE = 0,
    MOVE_TO_RED_FLAG,
    FIND_TARGET,
    MOVE,
    ATTACK,
}

export class WarriorRole extends AbstractRole {

    constructor() {
        super(Roles.WARRIOR);
    }

    public update(creep: Creep): void {
    }

    public execute(creep: Creep): void {
        if (creep.memory.status == Status.IDLE || creep.memory.status == Status.MOVE_TO_RED_FLAG) {
           /* let target = creep.room.find(FIND_HOSTILE_SPAWNS)
                .sort((a,b) => Utils.distance(creep, a) - Utils.distance(creep, b))
                .find(()=>true);

            if (target == undefined) {
                // @ts-ignore
                target = creep.room.find(FIND_HOSTILE_CREEPS)
                    .sort((a,b) => Utils.distance(creep, a) - Utils.distance(creep, b))
                    .find(()=>true);
            }

            if (target == undefined) {
                // @ts-ignore
                target = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: s => s.structureType != STRUCTURE_CONTROLLER})
                    .sort((a,b) => Utils.distance(creep, a) - Utils.distance(creep, b))
                    .find(()=>true);
            }

            if (target != undefined) {
                if (Utils.distance(creep, target) <= 1) {
                    creep.memory.status = Status.ATTACK;
                    creep.memory.targetId = target.id;
                } else {
                    creep.memory.status = Status.MOVE;
                    creep.memory.targetId = target.id;
                }
            } else*/ {
                creep.memory.status = Status.MOVE_TO_RED_FLAG;
                creep.memory.targetId = undefined;
            }
        }

        if (creep.memory.status == Status.MOVE_TO_RED_FLAG) {
            for (let flag of Object.values(Game.flags)) {
                if (flag.color == 1) {
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
                creep.memory.status = Status.ATTACK;
            } else if (creep.moveTo(target) != OK) {
                creep.memory.status = Status.IDLE;
                creep.memory.targetId = undefined;
            }
        }

        if (creep.memory.status == Status.ATTACK) {
            // @ts-ignore
            let target = Game.getObjectById<Creep>(creep.memory.targetId);

            if (target == undefined) {
                creep.memory.status = Status.IDLE;
                creep.memory.targetId = undefined;
            } else if (creep.attack(target) != OK) {
                creep.memory.status = Status.IDLE;
                creep.memory.targetId = undefined;
            }
        }
    }

    public static spawn(room: Room) {
        room.find(FIND_MY_STRUCTURES, { filter: object => object.structureType == STRUCTURE_SPAWN })
            .first()
            .cast<StructureSpawn>()
            .filter(s => s.room.energyCapacityAvailable >= 420)
            .filter(s => s.room.energyAvailable >= 420)
            .ifPresent(s => {
                s.spawnCreep([TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK], Game.time.toString(), {
                    memory: {
                        status: 0,
                        role: Roles.WARRIOR
                    }
                });
            });
    }
}
