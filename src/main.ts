import { ErrorMapper } from "utils/ErrorMapper";
import { Roles } from "./units/Role";
import { WorkerRole } from "./units/WorkerRole";
import { WarriorRole } from "./units/WarriorRole";
import "./ext.ts";
import { HarvesterRole } from "./units/HarvesterRole";
import { KeeperRole } from "./units/KeeperRole";
import { Utils } from "./utils/Utils";
import { Events } from "./lib/Events";
import { ClaimerRole } from "./units/ClaimerRole";

let handlers = [new WorkerRole(), new WarriorRole(), new HarvesterRole(), new KeeperRole(), new ClaimerRole()];

console.log("INIT")
Object.values(Game.creeps).forEach(creep => {
    handlers.find(handler => handler.accept(creep))?.init(creep);
});


export const loop = ErrorMapper.wrapLoop(() => {
    for (const name in Memory.creeps) {
        if (!(name in Game.creeps)) {
            handlers.find(handler => handler?.died(Memory.creeps[name]));
            delete Memory.creeps[name];
        }
    }

    var creepCounter: { [roomName: string]: { [role: number]: Creep[] } } = {};

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

    for (let spawnKey in Game.spawns) {
        let spawn = Game.spawns[spawnKey];
        spawn?.room.find(FIND_HOSTILE_CREEPS)
            .sort((a, b) => Utils.distance(spawn, a) - Utils.distance(spawn, b))
            .first()
            .ifPresent(h => {
                spawn?.room.find<StructureTower>(FIND_STRUCTURES, { filter: object => object.structureType == STRUCTURE_TOWER })
                    .forEach(t => {
                        t.attack(h);
                    });
            })
            .orElseDo(() => {
                spawn?.room.find(FIND_STRUCTURES)
                    .filter(s => s.hits + 1000 < s.hitsMax && s.hits < 100000)
                    .first()
                    .ifPresent(h => {
                        spawn?.room.find<StructureTower>(FIND_STRUCTURES, { filter: object => object.structureType == STRUCTURE_TOWER })
                            .forEach(t => {
                                t.repair(h);
                            });
                    });
            });
    }

    //TOD redesign
    Object.values(Game.spawns)
        .forEach(spawn => {
            let roomCreepCounter = creepCounter[spawn.room.name] || {};
            if (spawn.room.energyCapacityAvailable >= 550) {
                if ((roomCreepCounter[Roles.WORKER]?.length || 0) < 6) {
                    WorkerRole.spawn(spawn.room, roomCreepCounter);
                } else if ((roomCreepCounter[Roles.HARVESTER]?.length || 0) < 2) {
                    HarvesterRole.spawn(spawn.room);
                } else if (roomCreepCounter[Roles.HARVESTER]?.length > 0 && (roomCreepCounter[Roles.KEEPER]?.length || 0) < 1) {
                    KeeperRole.spawn(spawn.room);
                } else if (roomCreepCounter[Roles.WARRIOR]?.length < 4) {
                    //WarriorRole.spawn(spawn);
                }
            } else if ((roomCreepCounter[Roles.WORKER]?.length || 0) < 8) {
                WorkerRole.spawn(spawn.room, roomCreepCounter)
            }
        });
    console.log(Game.cpu.getUsed());
});
