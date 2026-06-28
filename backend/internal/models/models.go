package models

import (
	"sync"

	"github.com/gorilla/websocket"
)

type MapData struct {
	Width      int         `json:"width"`
	Height     int         `json:"height"`
	TileWidth  int         `json:"tilewidth"`
	TileHeight int         `json:"tileheight"`
	Layers     []LayerData `json:"layers"`
}

type LayerData struct {
	Name    string       `json:"name"`
	Type    string       `json:"type"` // "tilelayer" or "objectgroup"
	Data    []int        `json:"data,omitempty"`
	Objects []ObjectData `json:"objects,omitempty"`
}

type ObjectData struct {
	ID         int            `json:"id"`
	Name       string         `json:"name"`
	Type       string         `json:"type"`
	X          float64        `json:"x"`
	Y          float64        `json:"y"`
	Width      float64        `json:"width"`
	Height     float64        `json:"height"`
	Properties []PropertyData `json:"properties,omitempty"`
}

type PropertyData struct {
	Name  string      `json:"name"`
	Type  string      `json:"type"`
	Value interface{} `json:"value"`
}

type Manager struct {
	Rooms   map[string]*Room
	IpRooms map[string]string // IP -> RoomID
	Mu      sync.RWMutex
}

type Room struct {
	ID         string
	HostIP     string
	State      string // "lobby", "playing"
	TimeLeft   float64
	Clients    map[*Client]bool
	Broadcast  chan []byte
	Register   chan *Client
	Unregister chan *Client
	Manager    *Manager
	Mu         sync.Mutex
}

type Client struct {
	ID       string
	Room     *Room
	Conn     *websocket.Conn
	Send     chan []byte
	IP       string
	Nickname string
	Role     string
	Health   float64
	X, Y     float64
}
