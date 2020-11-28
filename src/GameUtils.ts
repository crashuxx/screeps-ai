export class GameUtils {
    private static constructionsAndControllerMap: { [roomName: string]: Structure[] } = {};

    public static constructionsAndController(room: Room): Structure[] {
        if (this.constructionsAndControllerMap[room.name] != undefined) {
            return this.constructionsAndControllerMap[room.name];
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
}