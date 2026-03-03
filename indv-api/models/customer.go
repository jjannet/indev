package models

import (
	"time"
)

type Customer struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Code        string    `json:"code" gorm:"not null;index"`
	Name        string    `json:"name" gorm:"not null"`
	ShortName   string    `json:"short_name"`
	Status      string    `json:"status" gorm:"default:active;index"`
	Description string    `json:"description"`
	UserID      uint      `json:"user_id" gorm:"not null;index"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
