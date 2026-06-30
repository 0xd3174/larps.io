const fs = require('fs');
const map = JSON.parse(fs.readFileSync('shared/map.json'));
function printGroups(layers, path, totalX, totalY) {
  for (const layer of layers) {
    if (layer.type === 'group') {
      const x = layer.x || 0;
      const y = layer.y || 0;
      const ox = layer.offsetx || 0;
      const oy = layer.offsety || 0;
      const p = path ? path + '.' + layer.name : layer.name;
      const nx = totalX + x + ox;
      const ny = totalY + y + oy;
      console.log(`Group: ${p} at X:${nx} Y:${ny}`);
      if (layer.layers) printGroups(layer.layers, p, nx, ny);
    }
  }
}
printGroups(map.layers, '', 0, 0);
