export interface PlayerData {
    id: string;
    nickname: string;
    isHost: boolean;
    x: number;
    y: number;
    role: string;
    health: number;
}

export interface StateMessage {
    type: 'state';
    roomState: string;
    timeLeft: number;
    players: PlayerData[];
}

export interface ChatMessage {
    type: 'chat';
    sender: string;
    text: string;
}

export interface MoveMessage {
    type: 'move';
    nickname: string;
    x: number;
    y: number;
}

export type ServerMessage = StateMessage | ChatMessage | MoveMessage;

export interface MapLayer {
    name: string;
    type: string;
    data: number[];
    width: number;
    height: number;
    x: number;
    y: number;
}

export interface Tileset {
    image: string;
    imagewidth: number;
    imageheight: number;
    tilewidth: number;
    tileheight: number;
    columns?: number;
    firstgid?: number;
}

export interface MapData {
    width: number;
    height: number;
    tilewidth: number;
    tileheight: number;
    layers: MapLayer[];
    tilesets: Tileset[];
}
