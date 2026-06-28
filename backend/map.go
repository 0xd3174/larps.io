package main

import (
	"encoding/json"
	"os"
)

type MapData struct {
	Width      int         `json:"width"`
	Height     int         `json:"height"`
	TileWidth  int         `json:"tilewidth"`
	TileHeight int         `json:"tileheight"`
	Layers     []LayerData `json:"layers"`
}

type LayerData struct {
	Name string `json:"name"`
	Data []int  `json:"data"`
}

var GameMap *MapData

func LoadMap(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	var m MapData
	if err := json.Unmarshal(data, &m); err != nil {
		return err
	}
	GameMap = &m
	return nil
}

func IsWall(x, y float64) bool {
	if GameMap == nil {
		return false
	}

	left := int((x - 20) / float64(GameMap.TileWidth))
	right := int((x + 20) / float64(GameMap.TileWidth))
	top := int((y - 20) / float64(GameMap.TileHeight))
	bottom := int((y + 20) / float64(GameMap.TileHeight))

	for _, layer := range GameMap.Layers {
		if layer.Name == "Walls" {
			for ty := top; ty <= bottom; ty++ {
				for tx := left; tx <= right; tx++ {
					if tx >= 0 && tx < GameMap.Width && ty >= 0 && ty < GameMap.Height {
						idx := ty*GameMap.Width + tx
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
