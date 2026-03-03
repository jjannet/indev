package models

import (
	"time"
)

type Project struct {
	ID          uint       `json:"id" gorm:"primaryKey"`
	Code        string     `json:"code" gorm:"not null;index"`
	Name        string     `json:"name" gorm:"not null"`
	StartDate   *time.Time `json:"start_date"`
	EndDate     *time.Time `json:"end_date"`
	Status      string     `json:"status" gorm:"default:active;index"`
	Description string     `json:"description"`
	UserID      uint       `json:"user_id" gorm:"not null;index"`
	Customers   []Customer `json:"customers" gorm:"many2many:project_customers;"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type ProjectCustomer struct {
	ProjectID  uint `json:"project_id" gorm:"primaryKey"`
	CustomerID uint `json:"customer_id" gorm:"primaryKey"`
}
