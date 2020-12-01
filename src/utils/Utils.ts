export class Utils {
    public static distanceBetweenPoints(x1: number, x2: number, y1: number, y2: number): number {
        return Math.round(Math.hypot(x1 - x2, y1 - y2));
    }

    public static distanceBetweenPosition(a: RoomPosition, b: RoomPosition): number {
        return Math.round(Math.hypot(a.x - b.x, a.y - b.y));
    }

    public static distance(a: RoomObject, b: RoomObject): number {
        return this.distanceBetweenPosition(a.pos, b.pos);
    }

    public static sourceInRange(a: RoomObject, b: RoomObject): boolean {
        if (b == undefined) return false;
        return this.distance(a, b) <= 1;
    }

    public static workInRange(a: RoomObject, b: RoomObject): boolean {
        if (b == undefined) return false;

        var range = 1;
        if (b instanceof Structure) {
            if (b.structureType == STRUCTURE_CONTROLLER) {
                range = 3;
            } else if (b.structureType == STRUCTURE_EXTENSION) {
                range = 1;
            }
        } else if (b instanceof ConstructionSite) {
            range = 3;
        }

        return this.distance(a, b) <= range;
    }

    public static constructionInRange(a: RoomObject, b: RoomObject): boolean {
        if (b == undefined) return false;
        return this.distance(a, b) <= 3;
    }

    public static acceptGoods(target: RoomObject) {
        if (target instanceof Structure) {
            if (target.structureType == STRUCTURE_CONTROLLER) {
                return true;
            } else if ((target instanceof StructureSpawn || target instanceof StructureExtension) && target.store.getFreeCapacity(RESOURCE_ENERGY) > 40) {
                return true;
            }
        }

        return false;
    }
}