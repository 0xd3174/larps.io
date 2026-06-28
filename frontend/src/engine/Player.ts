import { CONFIG } from '../config';

export class Player {
    public id: string;
    public nickname: string;
    public x: number = 0;
    public y: number = 0;
    public role: string = 'waiting';
    public health: number = 100;
    public isHost: boolean = false;
    public isLocal: boolean;

    public vx: number = 0;
    public vy: number = 0;

    constructor(id: string, nickname: string, isLocal: boolean = false) {
        this.id = id;
        this.nickname = nickname;
        this.isLocal = isLocal;
    }

    updateFromServer(data: any) {
        this.id = data.id;
        this.role = data.role;
        this.health = data.health;
        this.isHost = data.isHost;
        
        if (this.isLocal) {
            const distSq = (this.x - data.x)**2 + (this.y - data.y)**2;
            if (distSq > CONFIG.NETWORK.TELEPORT_DISTANCE_SQ) {
                this.x = data.x;
                this.y = data.y;
            }
        } else {
            this.x = data.x;
            this.y = data.y;
        }
    }
}
