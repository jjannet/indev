package models

import (
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type User struct {
	ID                 uint           `json:"id" gorm:"primaryKey"`
	Email              string         `json:"email" gorm:"uniqueIndex;not null"`
	Password           string         `json:"-" gorm:"not null"`
	FullName           string         `json:"full_name"`
	Role               string         `json:"role" gorm:"default:admin"`
	IsSystemAdmin      bool           `json:"is_system_admin" gorm:"default:false"`
	ForceResetPassword bool           `json:"force_reset_password" gorm:"default:false"`
	Status             string         `json:"status" gorm:"default:active;index"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
	DeletedAt          gorm.DeletedAt `json:"-" gorm:"index"`
}

func (u *User) HashPassword() error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.Password = string(hashedPassword)
	return nil
}

func (u *User) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
	return err == nil
}
