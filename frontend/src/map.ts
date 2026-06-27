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
            tilesetImage = new Image();
            tilesetImage.src = '/' + ts.image;
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
