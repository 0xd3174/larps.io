import { PlayerData } from './types';

export class Player {
    public id: string;
    public nickname: string;
    public x: number = 0;
    public y: number = 0;
    public role: string = 'waiting';
    public health: number = 100;
    public isHost: boolean = false;
    public isDead: boolean = false;
    public networkId: number = 0;
    public isLocal: boolean;

    constructor(id: string, nickname: string, isLocal: boolean = false) {
        this.id = id;
        this.nickname = nickname;
        this.isLocal = isLocal;
    }

    updateFromServer(data: PlayerData) {
        this.id = data.id;
        this.role = data.role;
        this.health = data.health;
        if (data.isHost !== undefined) this.isHost = data.isHost;
        if (data.networkId !== undefined) this.networkId = data.networkId;
        
        this.x = data.x;
        this.y = data.y;
    }
}
