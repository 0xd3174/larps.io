import { CONFIG } from '../config';
import { MapData } from './types';

export class MapManager {
    public mapData: MapData | null = null;
    public tilesetImage: HTMLImageElement | null = null;
    public width: number = 2000;
    public height: number = 2000;

    async load() {
        try {
            const res = await fetch('/map.json');
            this.mapData = await res.json();
            
            if (this.mapData.tilesets && this.mapData.tilesets.length > 0) {
                const ts = this.mapData.tilesets[0];
                let imagePath = ts.image;
                
                if (imagePath.includes('frontend/public/')) {
                    imagePath = imagePath.substring(imagePath.indexOf('frontend/public/') + 15);
                } else if (imagePath.includes('public/')) {
                    imagePath = imagePath.substring(imagePath.indexOf('public/') + 6);
                } else if (!imagePath.startsWith('/')) {
                    imagePath = '/' + imagePath;
                }

                this.tilesetImage = new Image();
                this.tilesetImage.src = imagePath;
                
                this.width = this.mapData.width * this.mapData.tilewidth;
                this.height = this.mapData.height * this.mapData.tileheight;
            }
        } catch (e) {
            console.error("Failed to load map.json", e);
        }
    }

    isWall(x: number, y: number): boolean {
        if (!this.mapData) return false;
        const tw = this.mapData.tilewidth;
        const th = this.mapData.tileheight;
        
        const left = Math.floor((x - CONFIG.PLAYER_RADIUS) / tw);
        const right = Math.floor((x + CONFIG.PLAYER_RADIUS) / tw);
        const top = Math.floor((y - CONFIG.PLAYER_RADIUS) / th);
        const bottom = Math.floor((y + CONFIG.PLAYER_RADIUS) / th);

        const wallsLayer = this.mapData.layers.find(l => l.name === 'Walls');
        if (!wallsLayer) return false;

        for (let ty = top; ty <= bottom; ty++) {
            for (let tx = left; tx <= right; tx++) {
                if (tx >= 0 && tx < this.mapData.width && ty >= 0 && ty < this.mapData.height) {
                    const idx = ty * this.mapData.width + tx;
                    if (wallsLayer.data[idx] !== 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
