import { ErrorMapper } from "utils/ErrorMapper";
import { UnitRole } from "./units/Unit";
import { WorkerUniversalRole } from "./units/WorkerUniversalRole";
import { WarriorRole } from "./units/WarriorRole";
import "./ext.ts";
import { WorkerHarvesterRole } from "./units/WorkerHarvesterRole";
import { KeeperRole } from "./units/KeeperRole";
import { GameUtils } from "./GameUtils";
import { Utils } from "./utils/Utils";
//import { EventEmitter } from "events";

let handlers = [new WorkerUniversalRole(), new WarriorRole(), new WorkerHarvesterRole(), new KeeperRole()];

//new EventEmitter()

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
        if (creep.ticksToLive >= 10) {
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

    Game.spawns['Spawn1']?.room.find(FIND_HOSTILE_CREEPS)
        .sort((a,b) => Utils.distance(Game.spawns['Spawn1'], a) - Utils.distance(Game.spawns['Spawn1'], b))
        .first()
        .ifPresent(h => {
            Game.spawns['Spawn1']?.room.find<StructureTower>(FIND_STRUCTURES, {filter: object => object.structureType == STRUCTURE_TOWER})
                .forEach(t => {
                    t.attack(h);
                })
        })
        .orElseDo(() => {
            Game.spawns['Spawn1']?.room.find(FIND_STRUCTURES)
                .filter(s => s.hits + 1000 < s.hitsMax)
                .first()
                .ifPresent(h => {
                    Game.spawns['Spawn1']?.room.find<StructureTower>(FIND_STRUCTURES, {filter: object => object.structureType == STRUCTURE_TOWER})
                        .forEach(t => {
                            t.repair(h);
                        })
                })
        })

    let creepCount = Object.values(Game.creeps).length;

    if (creepCounter[UnitRole.WORKER_UNIVERSAL] > 1 && Game.spawns["Spawn1"].room.energyCapacityAvailable > 550) {
        if (creepCounter[UnitRole.WORKER_UNIVERSAL] < 6) {
            Game.spawns["Spawn1"].spawnCreep([MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, WORK, WORK, WORK, WORK], Game.time.toString(), {
                memory: {
                    status: 0,
                    role: UnitRole.WORKER_UNIVERSAL
                }
            });
        } else if (creepCounter[UnitRole.WORKER_HARVESTER] < 2) {
            WorkerHarvesterRole.spawn(Game.spawns["Spawn1"].room);
        } else if (creepCounter[UnitRole.WORKER_HARVESTER] > 0 && creepCounter[UnitRole.KEEPER] < 1) {
            KeeperRole.spawn(Game.spawns["Spawn1"].room);
        } else if (creepCounter[UnitRole.WARRIOR] < 4) {
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
