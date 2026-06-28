
import { MapData } from './types';

export class MapManager {
    public mapData: MapData | null = null;
    public tilesetImage: HTMLImageElement | null = null;
    public width: number = 2000;
    public height: number = 2000;

    async load() {
        try {
            const res = await fetch('/api/map');
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

}
