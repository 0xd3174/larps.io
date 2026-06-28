package game

import (
	"encoding/json"
	"os"
)

type SharedConfig struct {
	PlayerRadius float64 `json:"PLAYER_RADIUS"`
	PlayerSpeed  float64 `json:"PLAYER_SPEED"`
}

var Config = SharedConfig{
	PlayerRadius: 20, // default fallback
	PlayerSpeed:  250,
}

func LoadConfig(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, &Config)
}
