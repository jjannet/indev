package models

import (
	"time"
)

type Timesheet struct {
	ID           uint             `json:"id" gorm:"primaryKey"`
	WorkPeriodID uint             `json:"work_period_id" gorm:"not null;index"`
	WorkPeriod   WorkPeriodConfig `json:"work_period" gorm:"foreignKey:WorkPeriodID"`
	UserID       uint             `json:"user_id" gorm:"not null;index"`
	Status       string           `json:"status" gorm:"default:in_progress;index"`
	CreatedAt    time.Time        `json:"created_at"`
	UpdatedAt    time.Time        `json:"updated_at"`
}
