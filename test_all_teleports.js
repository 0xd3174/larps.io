const fs = require('fs');
const map = JSON.parse(fs.readFileSync('shared/map.json'));
let count = 0;
function findTeleports(layers) {
  for (const l of layers) {
    if (l.objects) {
      for (const o of l.objects) {
        if (o.properties && o.properties.some(p => p.name === 'target_x')) {
          console.log(`Found teleport ${o.name} in layer ${l.name}`);
          count++;
        }
      }
    }
    if (l.layers) findTeleports(l.layers);
  }
}
findTeleports(map.layers);
console.log(`Total teleports: ${count}`);
