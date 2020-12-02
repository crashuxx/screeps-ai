import { ErrorMapper } from "utils/ErrorMapper";
import { Roles } from "./units/Role";
import { WorkerUniversalRole } from "./units/WorkerUniversalRole";
import { WarriorRole } from "./units/WarriorRole";
import "./ext.ts";
import { HarvesterRole } from "./units/HarvesterRole";
import { KeeperRole } from "./units/KeeperRole";
import { Utils } from "./utils/Utils";
import { Events } from "./lib/Events";

let handlers = [new WorkerUniversalRole(), new WarriorRole(), new HarvesterRole(), new KeeperRole()];

export const loop = ErrorMapper.wrapLoop(() => {
    for (const name in Memory.creeps) {
        if (!(name in Game.creeps)) {
            delete Memory.creeps[name];
        }
    }

    var creepCounter: { [roomName: string]: { [role: number]: Creep[] } } = {};

    handlers.forEach(handler => handler.init());

    let creeps = Object.values(Game.creeps);

    creeps.forEach(creep => {
        creepCounter[creep.room.name] = creepCounter[creep.room.name] || {};
        (creepCounter[creep.room.name][creep.memory.role] = creepCounter[creep.room.name][creep.memory.role] || []).push(creep);
    });
    Events.emit("creep_role_count", creepCounter);

    creeps.forEach(creep => {
        handlers.find(handler => handler.accept(creep))?.update(creep);
    });

    creeps.forEach(creep => {
        handlers.find(handler => handler.accept(creep))?.execute(creep);
    });

    Game.spawns["Spawn1"]?.room.find(FIND_HOSTILE_CREEPS)
        .sort((a, b) => Utils.distance(Game.spawns["Spawn1"], a) - Utils.distance(Game.spawns["Spawn1"], b))
        .first()
        .ifPresent(h => {
            Game.spawns["Spawn1"]?.room.find<StructureTower>(FIND_STRUCTURES, { filter: object => object.structureType == STRUCTURE_TOWER })
                .forEach(t => {
                    t.attack(h);
                });
        })
        .orElseDo(() => {
            Game.spawns["Spawn1"]?.room.find(FIND_STRUCTURES)
                .filter(s => s.hits + 1000 < s.hitsMax)
                .first()
                .ifPresent(h => {
                    Game.spawns["Spawn1"]?.room.find<StructureTower>(FIND_STRUCTURES, { filter: object => object.structureType == STRUCTURE_TOWER })
                        .forEach(t => {
                            t.repair(h);
                        });
                });
        });

    let creepCount = creeps.length;


    let creepCounterElement = creepCounter[Game.spawns["Spawn1"].room.name] || {};
    if (creepCounterElement[Roles.WORKER_UNIVERSAL]?.length > 1 && Game.spawns["Spawn1"].room.energyCapacityAvailable > 550) {
        if (creepCounterElement[Roles.WORKER_UNIVERSAL].length < 6) {
            Game.spawns["Spawn1"].spawnCreep([MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, WORK, WORK, WORK, WORK], Game.time.toString(), {
                memory: {
                    status: 0,
                    role: Roles.WORKER_UNIVERSAL
                }
            });
        } else if (creepCounterElement[Roles.HARVESTER]?.length < 2) {
            HarvesterRole.spawn(Game.spawns["Spawn1"].room);
        } else if (creepCounterElement[Roles.HARVESTER]?.length > 0 && creepCounterElement[Roles.KEEPER]?.length < 1) {
            KeeperRole.spawn(Game.spawns["Spawn1"].room);
        } else if (creepCounterElement[Roles.WARRIOR]?.length < 4) {
            //WarriorRole.spawn(Game.spawns["Spawn1"].room);
        }
    } else if (creepCount < 8) {
        Game.spawns["Spawn1"].spawnCreep([MOVE, CARRY, CARRY, CARRY, WORK], Game.time.toString(), {
            memory: {
                status: 0,
                role: Roles.WORKER_UNIVERSAL
            }
        });
    }
    console.log(Game.cpu.getUsed());
});
