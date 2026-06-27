const fs = require('fs');
const size = 32;
const total = size * size;

const bg = Array(total).fill(1);
const walls = Array(total).fill(0);

// Add border walls
for (let i = 0; i < size; i++) {
  walls[i] = 2; // top
  walls[total - size + i] = 2; // bottom
  walls[i * size] = 2; // left
  walls[i * size + size - 1] = 2; // right
}

const map = {
  width: size,
  height: size,
  tilewidth: 64,
  tileheight: 64,
  layers: [
    { type: "tilelayer", name: "Background", data: bg, visible: true, opacity: 1 },
    { type: "tilelayer", name: "Walls", data: walls, visible: true, opacity: 1 }
  ],
  tilesets: [
    {
      name: "spritesheet_tiles",
      image: "graphics/spritesheet_tiles.png",
      imagewidth: 1988,
      imageheight: 1470,
      tilewidth: 64,
      tileheight: 64,
      margin: 0,
      spacing: 0
    }
  ]
};

fs.writeFileSync('frontend/public/map.json', JSON.stringify(map));
console.log('Map generated');
