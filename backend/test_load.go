package main

import (
	"fmt"
	"game-backend/internal/game"
)

func main() {
	m, err := game.LoadMap("../shared/map.json")
	if err != nil {
		panic(err)
	}
	teleports := game.GetTeleports(m)
	for _, t := range teleports {
		fmt.Printf("Teleport: %s (X: %v, Y: %v)\n", t.Name, t.X, t.Y)
	}
}
