const fs = require('fs');
const map = JSON.parse(fs.readFileSync('shared/map.json'));
function checkOffsets(layers) {
  for (const l of layers) {
    if (l.offsetx || l.offsety || l.x || l.y) {
      console.log(`${l.name} has offset: x=${l.x} y=${l.y} offsetx=${l.offsetx} offsety=${l.offsety}`);
    }
    if (l.layers) checkOffsets(l.layers);
  }
}
checkOffsets(map.layers);
