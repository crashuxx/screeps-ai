import { Optional } from "./ext";

export class GameUtils {
    private static constructionsAndControllerMap: { [roomName: string]: Structure[] } = {};
    private static repairStructureMap: { [roomName: string]: Structure[] } = {};

    public static constructionsAndController(room: Room): Structure[] {
        if (this.constructionsAndControllerMap[room.name] != undefined) {
            //return this.constructionsAndControllerMap[room.name];
        }

        let objects: Structure[] = [];

        if (room.controller != undefined) {
            objects.push(room.controller);
        }

        for (let value of Object.values(Game.constructionSites)) {
            if (value.room?.name == room.name) {
                // @ts-ignore
                objects.push(value);
            }
        }

        this.constructionsAndControllerMap[room.name] = objects;
        return objects;
    }

    public static constructionsAndControllerAndExtension(room: Room): Structure[] {
        let objects = [...this.constructionsAndController(room)];
        for (let value of Object.values(Game.structures)) {
            if (value.structureType == STRUCTURE_EXTENSION && value.room?.name == room.name) {
                if ((<StructureExtension>value).store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                    // @ts-ignore
                    objects.push(value);
                }
            }
        }
        return objects;
    }

    public static constructionsAndControllerAndExtensionAndSpawn(room: Room): Structure[] {
        let objects: Structure[] = [];

        for (let spawnName in Game.spawns) {
            let spawn = Game.spawns[spawnName];
            if (spawn.room.name == room.name) {
                if (spawn.store.getFreeCapacity(RESOURCE_ENERGY) != 0) {
                    objects.push(spawn);
                }
            }
        }

        objects.push(...this.constructionsAndControllerAndExtension(room));

        return objects;
    }

    public static findStructuresForRepair(room: Room): Structure[] {
        if (this.repairStructureMap[room.name] != undefined) {
            //return this.repairStructureMap[room.name];
        }

        let objects: Structure[] = [];

        let roads = room.find(FIND_STRUCTURES, { filter: s => s.structureType == STRUCTURE_ROAD || s.structureType == STRUCTURE_CONTAINER });
        for (let structure of roads) {
            if (structure.room?.name == room.name) {
                if ((structure.hits + 1000) < structure.hitsMax) {
                    objects.push(structure);
                }
            }
        }

        objects.sort((a, b) => a.hits - b.hits);

        this.repairStructureMap[room.name] = objects;
        return objects;
    }

    public static getObjectById<T>(id: string | undefined): Optional<T> {
        if (id == undefined) {
            // @ts-ignore
            return Optional.optionalOfNull;
        }

        return Optional.ofNullable(Game.getObjectById(id));
    }
}