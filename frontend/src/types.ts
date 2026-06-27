export interface Player {
    id: string;
    nickname: string;
    isHost: boolean;
    x: number;
    y: number;
    role: string;
    health: number;
}

export interface RoomData {
    id: string | null;
    state: string;
    timeLeft: number;
    players: Player[];
}

export interface Me {
    id: string | null;
    nickname: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    speed: number;
}
