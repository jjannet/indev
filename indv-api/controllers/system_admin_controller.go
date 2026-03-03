package controllers

import (
	"net/http"

	"indv-api/config"
	"indv-api/helpers"
	"indv-api/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

func GetUsers(c *gin.Context) {
	params := helpers.GetPaginationParams(c)

	var total int64
	query := config.DB.Model(&models.User{})

	if params.Search != "" {
		search := "%" + params.Search + "%"
		query = query.Where("full_name ILIKE ? OR email ILIKE ?", search, search)
	}
	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}

	query.Count(&total)

	var users []models.User
	query.Order(params.SortBy + " " + params.SortDir).
		Offset(params.Offset()).
		Limit(params.PageSize).
		Find(&users)

	c.JSON(http.StatusOK, helpers.NewPaginatedResponse(users, total, params))
}

func GetUser(c *gin.Context) {
	id := c.Param("id")

	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": user})
}

func CreateUser(c *gin.Context) {
	var input struct {
		FullName      string `json:"full_name" binding:"required"`
		Email         string `json:"email" binding:"required,email"`
		Password      string `json:"password" binding:"required,min=8"`
		IsSystemAdmin bool   `json:"is_system_admin"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existing models.User
	if err := config.DB.Where("email = ?", input.Email).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
		return
	}

	user := models.User{
		FullName:      input.FullName,
		Email:         input.Email,
		Password:      input.Password,
		Role:          "user",
		IsSystemAdmin: input.IsSystemAdmin,
		Status:        "active",
	}

	if err := user.HashPassword(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	if err := config.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": user})
}

func UpdateUser(c *gin.Context) {
	currentUserID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	id := c.Param("id")

	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var input struct {
		FullName      string `json:"full_name"`
		Password      string `json:"password"`
		IsSystemAdmin *bool  `json:"is_system_admin"`
		Status        string `json:"status"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.IsSystemAdmin != nil && user.ID == currentUserID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot change your own admin status"})
		return
	}

	if input.FullName != "" {
		user.FullName = input.FullName
	}

	if input.Status != "" {
		if user.ID == currentUserID && input.Status == "inactive" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot deactivate your own account"})
			return
		}
		user.Status = input.Status
	}

	if input.IsSystemAdmin != nil {
		if !*input.IsSystemAdmin && user.IsSystemAdmin {
			var adminCount int64
			config.DB.Model(&models.User{}).Where("is_system_admin = ? AND status = ?", true, "active").Count(&adminCount)
			if adminCount <= 1 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot remove the last system admin"})
				return
			}
		}
		user.IsSystemAdmin = *input.IsSystemAdmin
	}

	if input.Password != "" {
		if len(input.Password) < 8 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Password must be at least 8 characters"})
			return
		}
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}
		user.Password = string(hashedPassword)
		user.ForceResetPassword = true
	}

	config.DB.Save(&user)
	c.JSON(http.StatusOK, gin.H{"data": user})
}

func DeleteUser(c *gin.Context) {
	currentUserID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	id := c.Param("id")

	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if user.ID == currentUserID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete your own account"})
		return
	}

	if user.IsSystemAdmin {
		var adminCount int64
		config.DB.Model(&models.User{}).Where("is_system_admin = ? AND status = ?", true, "active").Count(&adminCount)
		if adminCount <= 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete the last system admin"})
			return
		}
	}

	config.DB.Model(&user).Update("status", "inactive")
	c.JSON(http.StatusOK, gin.H{"message": "User deactivated"})
}
