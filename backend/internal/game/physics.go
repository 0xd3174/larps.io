package game

import (
	"math"
	"strings"

	"game-backend/internal/models"
)

// ResolveCircleAABB resolves collision between a circle (cx, cy, radius) 
// and an Axis-Aligned Bounding Box (rx, ry, rw, rh).
// It returns the new (cx, cy) and whether a collision occurred.
func ResolveCircleAABB(cx, cy, radius float64, rx, ry, rw, rh float64) (float64, float64, bool) {
	closestX := math.Max(rx, math.Min(cx, rx+rw))
	closestY := math.Max(ry, math.Min(cy, ry+rh))

	distanceX := cx - closestX
	distanceY := cy - closestY

	distanceSquared := distanceX*distanceX + distanceY*distanceY

	if distanceSquared < radius*radius {
		if distanceSquared == 0 {
			// Center of circle is inside the AABB. Find closest edge to push out.
			distToLeft := cx - rx
			distToRight := (rx + rw) - cx
			distToTop := cy - ry
			distToBottom := (ry + rh) - cy

			minDist := distToLeft
			pushX := -distToLeft
			pushY := 0.0

			if distToRight < minDist {
				minDist = distToRight
				pushX = distToRight
				pushY = 0.0
			}
			if distToTop < minDist {
				minDist = distToTop
				pushX = 0.0
				pushY = -distToTop
			}
			if distToBottom < minDist {
				pushX = 0.0
				pushY = distToBottom
			}

			// Add radius to push out completely
			if pushX > 0 { pushX += radius } else if pushX < 0 { pushX -= radius }
			if pushY > 0 { pushY += radius } else if pushY < 0 { pushY -= radius }

			return cx + pushX, cy + pushY, true
		}

		distance := math.Sqrt(distanceSquared)
		overlap := radius - distance

		nx := distanceX / distance
		ny := distanceY / distance

		return cx + nx*overlap, cy + ny*overlap, true
	}

	return cx, cy, false
}

// ResolveMapCollision checks a circle against all solid tiles and pushes it out.
// It returns the final resolved coordinates.
func ResolveMapCollision(gameMap *models.MapData, cx, cy, radius float64) (float64, float64) {
	if gameMap == nil {
		return cx, cy
	}

	left := int((cx - radius) / float64(gameMap.TileWidth))
	right := int((cx + radius) / float64(gameMap.TileWidth))
	top := int((cy - radius) / float64(gameMap.TileHeight))
	bottom := int((cy + radius) / float64(gameMap.TileHeight))

	for _, layer := range gameMap.Layers {
		if layer.Type == "tilelayer" && strings.HasSuffix(strings.ToLower(layer.Name), "_solid") {
			for ty := top; ty <= bottom; ty++ {
				for tx := left; tx <= right; tx++ {
					if tx >= 0 && tx < gameMap.Width && ty >= 0 && ty < gameMap.Height {
						idx := ty*gameMap.Width + tx
						if idx >= 0 && idx < len(layer.Data) && layer.Data[idx] != 0 {
							rx := float64(tx * gameMap.TileWidth)
							ry := float64(ty * gameMap.TileHeight)
							rw := float64(gameMap.TileWidth)
							rh := float64(gameMap.TileHeight)

							cx, cy, _ = ResolveCircleAABB(cx, cy, radius, rx, ry, rw, rh)
						}
					}
				}
			}
		}
	}
	return cx, cy
}

