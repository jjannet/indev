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

	// One-time migration: convert old work_period_configs columns to new schema
	if db.Migrator().HasColumn(&WorkPeriodConfig{}, "status") {
		// Set is_confirmed = true for all rows that had status = 'active'
		db.Exec("UPDATE work_period_configs SET is_confirmed = true WHERE status = 'active'")
		db.Migrator().DropColumn(&WorkPeriodConfig{}, "status")
		db.Migrator().DropColumn(&WorkPeriodConfig{}, "is_default")
		db.Migrator().DropColumn(&WorkPeriodConfig{}, "description")
		log.Println("Migrated work_period_configs: removed status/is_default/description, using is_confirmed")
	}

	log.Println("Database migration completed")
}
