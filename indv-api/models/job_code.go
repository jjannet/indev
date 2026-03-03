package models

import (
	"time"
)

type JobCode struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Code        string    `json:"code" gorm:"not null;index"`
	Name        string    `json:"name" gorm:"not null"`
	Type        string    `json:"type" gorm:"not null;default:billable"`
	Status      string    `json:"status" gorm:"default:active;index"`
	Description string    `json:"description"`
	CustomerID  uint      `json:"customer_id" gorm:"not null;index"`
	Customer    Customer  `json:"customer" gorm:"foreignKey:CustomerID"`
	ProjectID   uint      `json:"project_id" gorm:"not null;index"`
	Project     Project   `json:"project" gorm:"foreignKey:ProjectID"`
	UserID      uint      `json:"user_id" gorm:"not null;index"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
