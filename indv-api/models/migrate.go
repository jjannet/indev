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

	// One-time migration: ensure at least one system admin exists
	var adminCount int64
	db.Model(&User{}).Where("is_system_admin = ?", true).Count(&adminCount)
	if adminCount == 0 {
		// Set the first user as system admin
		var firstUser User
		if err := db.Order("id ASC").First(&firstUser).Error; err == nil {
			db.Model(&firstUser).Updates(map[string]interface{}{
				"is_system_admin": true,
				"status":          "active",
			})
			log.Printf("Migrated: set user #%d (%s) as system admin", firstUser.ID, firstUser.Email)
		}
	}

	log.Println("Database migration completed")
}
