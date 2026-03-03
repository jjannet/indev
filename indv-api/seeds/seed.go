package seeds

import (
	"log"

	"indv-api/models"

	"gorm.io/gorm"
)

func SeedAdminUser(db *gorm.DB) {
	var count int64
	db.Model(&models.User{}).Count(&count)
	if count > 0 {
		return
	}

	admin := models.User{
		Email:         "admin@indev.com",
		Password:      "admin1234",
		FullName:      "System Admin",
		Role:          "admin",
		IsSystemAdmin: true,
		Status:        "active",
	}

	if err := admin.HashPassword(); err != nil {
		log.Printf("Failed to hash admin password: %v", err)
		return
	}

	result := db.Create(&admin)
	if result.Error != nil {
		log.Printf("Failed to seed admin user: %v", result.Error)
		return
	}

	log.Println("Admin user seeded: admin@indev.com / admin1234")
}
