import { ErrorMapper } from "utils/ErrorMapper";
import { WorkerHarvesterRole } from "units/WorkerHarvesterRole";
import { UnitRole } from "./units/Unit";
import { WorkerUniversalRole } from "./units/WorkerUniversalRole";
import { SlaveRole } from "./units/SlaveRole";
import { WorkerUpgraderRole } from "./units/WorkerUpgraderRole";

const WORKER_SLAVE_FACTOR = 0.5;

let handlers = [new WorkerHarvesterRole(), new WorkerUniversalRole(), new SlaveRole(), new WorkerUpgraderRole()];

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
    //console.log(`Current game tick is ${Game.time}`);

    // Automatically delete memory of missing units
    for (const name in Memory.creeps) {
        if (!(name in Game.creeps)) {
            delete Memory.creeps[name];
        }
    }

    var creepCounter: { [role: number]: number } = {};
    for (let i = 0; i < UnitRole.SIZE; i++) {
        creepCounter[i] = 0;
    }

    for (let creep of Object.values(Game.creeps)) {
        // @ts-ignore
        if(creep.ticksToLive >= 100) {
            creepCounter[creep.memory.role]++;
        }

        for (let handler of handlers) {
            if (handler.canHandle(creep)) {
                handler.prepare(creep);
                break;
            }
        }

        for (let handler of handlers) {
            if (handler.canHandle(creep)) {
                handler.handle(creep);
                break;
            }
        }
    }

    if (Game.spawns["Spawn1"].room.energyCapacityAvailable == 551) {
        if ((creepCounter[UnitRole.SLAVE] * 0.5) < creepCounter[UnitRole.WORKER_HARVESTER]) {
            Game.spawns["Spawn1"].spawnCreep([MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY], Game.time.toString(), {
                memory: {
                    status: 0,
                    role: UnitRole.SLAVE
                }
            });
        } else if (creepCounter[UnitRole.WORKER_UPGRADER] < creepCounter[UnitRole.WORKER_HARVESTER]) {
            Game.spawns["Spawn1"].spawnCreep([MOVE, CARRY, WORK, WORK, WORK, WORK], Game.time.toString(), {
                memory: {
                    status: 0,
                    role: UnitRole.WORKER_UPGRADER
                }
            });
        } else if (creepCounter[UnitRole.WORKER_HARVESTER] < 2) {
            Game.spawns["Spawn1"].spawnCreep([MOVE, CARRY, WORK, WORK, WORK, WORK], Game.time.toString(), {
                memory: {
                    status: 0,
                    role: UnitRole.WORKER_HARVESTER
                }
            });
        }
    } else if (Object.values(Game.creeps).length < 6) {
        Game.spawns["Spawn1"].spawnCreep([MOVE, CARRY, CARRY, CARRY, WORK], Game.time.toString(), {
            memory: {
                status: 0,
                role: UnitRole.WORKER_UNIVERSAL
            }
        });
        //   }
    }

    //console.log("CPU used " + Game.cpu.getUsed());
});
