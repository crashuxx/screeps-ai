import { ErrorMapper } from "utils/ErrorMapper";
import { UnitRole } from "./units/Unit";
import { WorkerUniversalRole } from "./units/WorkerUniversalRole";
import { WarriorRole } from "./units/WarriorRole";
import "./ext.ts";
import { WorkerHarvesterRole } from "./units/WorkerHarvesterRole";
import { Optional } from "./ext";

const WORKER_SLAVE_FACTOR = 0.5;

let handlers = [new WorkerUniversalRole(), new WarriorRole(), new WorkerHarvesterRole()];

export const loop = ErrorMapper.wrapLoop(() => {
    for (const name in Memory.creeps) {
        if (!(name in Game.creeps)) {
            delete Memory.creeps[name];
        }
    }

    var creepCounter: { [role: number]: number } = {};
    for (let i = 0; i < UnitRole.SIZE; i++) {
        creepCounter[i] = 0;
    }

    for (let handler of handlers) {
        handler.init();
    }

    for (let creep of Object.values(Game.creeps)) {
        // @ts-ignore
        if (creep.ticksToLive >= 100) {
            creepCounter[creep.memory.role]++;
        }

        for (let handler of handlers) {
            if (handler.canHandle(creep)) {
                handler.prepare(creep);
                break;
            }
        }
    }

    for (let creep of Object.values(Game.creeps)) {
        for (let handler of handlers) {
            if (handler.canHandle(creep)) {
                handler.handle(creep);
                break;
            }
        }
    }

    let creepCount = Object.values(Game.creeps).length;

    if (creepCounter[UnitRole.WORKER_UNIVERSAL] >= 4 && Game.spawns["Spawn1"].room.energyCapacityAvailable > 550) {
        if (creepCounter[UnitRole.WORKER_UNIVERSAL] < 6) {
            Game.spawns["Spawn1"].spawnCreep([MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, WORK, WORK, WORK], Game.time.toString(), {
                memory: {
                    status: 0,
                    role: UnitRole.WORKER_UNIVERSAL
                }
            });
        } else if (creepCounter[UnitRole.WORKER_UNIVERSAL] < 8) {
            Game.spawns["Spawn1"].spawnCreep([MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, WORK, WORK, WORK], Game.time.toString(), {
                memory: {
                    status: 0,
                    role: UnitRole.WORKER_UNIVERSAL
                }
            });
        } else if (creepCounter[UnitRole.WORKER_HARVESTER] < 2) {
            WorkerHarvesterRole.spawn(Game.spawns["Spawn1"].room);
        } else {
            //WarriorRole.spawn(Game.spawns["Spawn1"].room);
        }
    } else if (creepCount < 8) {
        Game.spawns["Spawn1"].spawnCreep([MOVE, CARRY, CARRY, CARRY, WORK], Game.time.toString(), {
            memory: {
                status: 0,
                role: UnitRole.WORKER_UNIVERSAL
            }
        });
    }

});
