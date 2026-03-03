package models

import (
	"log"

	"gorm.io/gorm"
)

func AutoMigrate(db *gorm.DB) {
	err := db.AutoMigrate(
		&User{},
		&Customer{},
		&Project{},
		&ProjectCustomer{},
		&JobCode{},
		&WorkPeriodConfig{},
		&WorkLog{},
		&Timesheet{},
	)
	if err != nil {
		log.Fatalf("Failed to auto-migrate: %v", err)
	}
	log.Println("Database migration completed")
}
