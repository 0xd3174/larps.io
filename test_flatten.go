package main

import (
	"encoding/json"
	"fmt"
	"os"
)

type PropertyData struct {
	Name  string      `json:"name"`
	Type  string      `json:"type"`
	Value interface{} `json:"value"`
}

type ObjectData struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"`
	X    float64 `json:"x"`
	Y    float64 `json:"y"`
	Width float64 `json:"width"`
	Height float64 `json:"height"`
	Properties []PropertyData `json:"properties"`
}

type LayerData struct {
	Name    string       `json:"name"`
	Type    string       `json:"type"`
	Objects []ObjectData `json:"objects,omitempty"`
	Layers  []LayerData  `json:"layers,omitempty"`
}

type MapData struct {
	Layers []LayerData `json:"layers"`
}

func flattenLayers(layers []LayerData) []LayerData {
	var flat []LayerData
	for _, l := range layers {
		if l.Type == "group" && len(l.Layers) > 0 {
			flat = append(flat, flattenLayers(l.Layers)...)
		} else {
			flat = append(flat, l)
		}
	}
	return flat
}

func main() {
	data, err := os.ReadFile("shared/map.json")
	if err != nil {
		panic(err)
	}
	var m MapData
	json.Unmarshal(data, &m)
	flat := flattenLayers(m.Layers)
	for _, l := range flat {
		if l.Name == "teleports" && l.Type == "objectgroup" {
			for _, o := range l.Objects {
				fmt.Printf("Teleport %s at %v, %v targeting %v\n", o.Name, o.X, o.Y, o.Properties)
			}
		}
	}
}
