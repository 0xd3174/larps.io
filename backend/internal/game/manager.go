package game

import (
	"encoding/hex"
	"math/rand"

	"game-backend/internal/app"
	"game-backend/internal/models"
)

func CreateRoom(a *app.App, ip string, settings models.RoomSettings) (string, error) {
	a.Manager.Mu.Lock()
	defer a.Manager.Mu.Unlock()

	if oldRoomID, exists := a.Manager.IpRooms[ip]; exists {
		delete(a.Manager.Rooms, oldRoomID)
		delete(a.Manager.IpRooms, ip)
	}

	bytes := make([]byte, 3)
	rand.Read(bytes)
	roomID := hex.EncodeToString(bytes) // 6 char hex

	room := &models.Room{
		ID:         roomID,
		HostIP:     ip,
		State:      "lobby",
		Clients:    make(map[*models.Client]bool),
		Broadcast:  make(chan []byte),
		Register:   make(chan *models.Client),
		Unregister: make(chan *models.Client),
		Manager:    a.Manager,
		Settings:   settings,
	}

	a.Manager.Rooms[roomID] = room
	a.Manager.IpRooms[ip] = roomID

	go RunRoom(room, a)

	return roomID, nil
}

func GetRoomByIP(a *app.App, ip string) string {
	a.Manager.Mu.RLock()
	defer a.Manager.Mu.RUnlock()
	return a.Manager.IpRooms[ip]
}

func RemoveRoom(a *app.App, roomID string) {
	a.Manager.Mu.Lock()
	defer a.Manager.Mu.Unlock()

	if room, exists := a.Manager.Rooms[roomID]; exists {
		delete(a.Manager.IpRooms, room.HostIP)
		delete(a.Manager.Rooms, roomID)
	}
}

func ChangeHost(a *app.App, roomID, oldIP, newIP string) {
	a.Manager.Mu.Lock()
	defer a.Manager.Mu.Unlock()
	delete(a.Manager.IpRooms, oldIP)
	a.Manager.IpRooms[newIP] = roomID
}
