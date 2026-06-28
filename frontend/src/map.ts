import { setMapSize } from './state';

export let mapData: any = null;
export let tilesetImage: HTMLImageElement | null = null;

export async function loadMap() {
    try {
        const res = await fetch('/map.json');
        if (!res.ok) return;
        mapData = await res.json();

        if (mapData && mapData.tilesets && mapData.tilesets.length > 0) {
            const ts = mapData.tilesets[0];
            const imageName = ts.image.split(/[/\\]/).pop();
            tilesetImage = new Image();
            tilesetImage.src = '/graphics/' + imageName;
            await new Promise((resolve) => {
                tilesetImage!.onload = resolve;
                tilesetImage!.onerror = resolve; // Continue even if missing
            });
            
            // Update physical boundaries
            setMapSize(mapData.width * mapData.tilewidth, mapData.height * mapData.tileheight);
        }
    } catch (e) {
        console.error("Failed to load map.json", e);
    }
}

export function isWall(x: number, y: number): boolean {
    if (!mapData) return false;
    const tw = mapData.tilewidth;
    const th = mapData.tileheight;
    
    const left = Math.floor((x - 20) / tw);
    const right = Math.floor((x + 20) / tw);
    const top = Math.floor((y - 20) / th);
    const bottom = Math.floor((y + 20) / th);

    const wallsLayer = mapData.layers.find((l: any) => l.name === 'Walls');
    if (!wallsLayer) return false;

    for (let ty = top; ty <= bottom; ty++) {
        for (let tx = left; tx <= right; tx++) {
            if (tx >= 0 && tx < mapData.width && ty >= 0 && ty < mapData.height) {
                const idx = ty * mapData.width + tx;
                if (wallsLayer.data[idx] !== 0) {
                    return true;
                }
            }
        }
    }
    return false;
}
