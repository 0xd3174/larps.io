package game

import (
	"encoding/json"
	"os"
	"strings"

	"game-backend/internal/models"
)

func flattenLayers(layers []models.LayerData) []models.LayerData {
	var flat []models.LayerData
	for _, l := range layers {
		if l.Type == "group" && len(l.Layers) > 0 {
			flat = append(flat, flattenLayers(l.Layers)...)
		} else {
			flat = append(flat, l)
		}
	}
	return flat
}

func LoadMap(path string) (*models.MapData, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var m models.MapData
	if err := json.Unmarshal(data, &m); err != nil {
		return nil, err
	}
	m.Layers = flattenLayers(m.Layers)
	return &m, nil
}

func IsWall(gameMap *models.MapData, x, y float64) bool {
	if gameMap == nil {
		return false
	}

	left := int((x - Config.PlayerRadius) / float64(gameMap.TileWidth))
	right := int((x + Config.PlayerRadius) / float64(gameMap.TileWidth))
	top := int((y - Config.PlayerRadius) / float64(gameMap.TileHeight))
	bottom := int((y + Config.PlayerRadius) / float64(gameMap.TileHeight))

	for _, layer := range gameMap.Layers {
		if layer.Type == "tilelayer" && strings.HasSuffix(strings.ToLower(layer.Name), "_solid") {
			for ty := top; ty <= bottom; ty++ {
				for tx := left; tx <= right; tx++ {
					if tx >= 0 && tx < gameMap.Width && ty >= 0 && ty < gameMap.Height {
						idx := ty*gameMap.Width + tx
						if idx >= 0 && idx < len(layer.Data) && layer.Data[idx] != 0 {
							return true
						}
					}
				}
			}
		}
	}
	return false
}

func GetSpawnPoints(gameMap *models.MapData, role string) []models.ObjectData {
	var spawns []models.ObjectData
	if gameMap == nil {
		return spawns
	}
	for _, layer := range gameMap.Layers {
		if layer.Name == "spawns" && layer.Type == "objectgroup" {
			for _, obj := range layer.Objects {
				if obj.Name == role {
					spawns = append(spawns, obj)
				}
			}
		}
	}
	return spawns
}

func GetTeleports(gameMap *models.MapData) []models.ObjectData {
	var teleports []models.ObjectData
	if gameMap == nil {
		return teleports
	}
	for _, layer := range gameMap.Layers {
		if layer.Name == "teleports" && layer.Type == "objectgroup" {
			teleports = append(teleports, layer.Objects...)
		}
	}
	return teleports
}

func CheckTeleport(gameMap *models.MapData, x, y float64) (float64, float64, bool) {
	if gameMap == nil {
		return x, y, false
	}
	teleports := GetTeleports(gameMap)
	for _, t := range teleports {
		// AABB collision with the center of the player
		if x >= t.X && x <= t.X+t.Width && y >= t.Y && y <= t.Y+t.Height {
			var targetX, targetY float64
			var hasX, hasY bool
			for _, p := range t.Properties {
				if p.Name == "target_x" {
					if val, ok := p.Value.(float64); ok {
						targetX = val
						hasX = true
					}
				}
				if p.Name == "target_y" {
					if val, ok := p.Value.(float64); ok {
						targetY = val
						hasY = true
					}
				}
			}
			if hasX && hasY {
				return targetX, targetY, true
			}
		}
	}
	return x, y, false
}
