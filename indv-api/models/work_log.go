package models

import (
	"time"
)

type WorkLog struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Date        time.Time `json:"date" gorm:"not null;index"`
	StartTime   string    `json:"start_time" gorm:"not null"`
	EndTime     string    `json:"end_time"`
	Duration    int       `json:"duration"`
	ProjectID   uint      `json:"project_id" gorm:"not null;index"`
	Project     Project   `json:"project" gorm:"foreignKey:ProjectID"`
	CustomerID  *uint     `json:"customer_id" gorm:"index"`
	Customer    *Customer `json:"customer" gorm:"foreignKey:CustomerID"`
	JobCodeID   *uint     `json:"job_code_id" gorm:"index"`
	JobCode     *JobCode  `json:"job_code" gorm:"foreignKey:JobCodeID"`
	Description string    `json:"description" gorm:"not null"`
	Status      string    `json:"status" gorm:"default:new;index"`
	UserID      uint      `json:"user_id" gorm:"not null;index"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
