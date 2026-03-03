package models

import (
	"time"
)

type WorkPeriodConfig struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Year        int       `json:"year" gorm:"not null;index"`
	Month       int       `json:"month" gorm:"not null;index"`
	StartDate   time.Time `json:"start_date" gorm:"not null"`
	EndDate     time.Time `json:"end_date" gorm:"not null"`
	IsDefault   bool      `json:"is_default" gorm:"default:false"`
	Status      string    `json:"status" gorm:"default:active;index"`
	Description string    `json:"description"`
	UserID      uint      `json:"user_id" gorm:"not null;index"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
