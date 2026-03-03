package controllers

import (
	"net/http"

	"indv-api/config"
	"indv-api/helpers"
	"indv-api/models"

	"github.com/gin-gonic/gin"
)

func GetCustomers(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	params := helpers.GetPaginationParams(c)
	var customers []models.Customer
	var total int64

	query := config.DB.Where("user_id = ?", userID)

	if params.Search != "" {
		search := "%" + params.Search + "%"
		query = query.Where("(name ILIKE ? OR code ILIKE ?)", search, search)
	}
	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}

	query.Model(&models.Customer{}).Count(&total)

	query.Order(params.SortBy + " " + params.SortDir).
		Offset(params.Offset()).
		Limit(params.PageSize).
		Find(&customers)

	c.JSON(http.StatusOK, helpers.NewPaginatedResponse(customers, total, params))
}

func GetCustomer(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	var customer models.Customer
	if err := config.DB.Where("id = ? AND user_id = ?", c.Param("id"), userID).First(&customer).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Customer not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": customer})
}

func GetActiveCustomers(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	var customers []models.Customer
	config.DB.Where("user_id = ? AND status = ?", userID, "active").
		Order("name asc").
		Find(&customers)

	c.JSON(http.StatusOK, gin.H{"data": customers})
}

func CreateCustomer(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	var input struct {
		Code        string `json:"code" binding:"required"`
		Name        string `json:"name" binding:"required"`
		ShortName   string `json:"short_name"`
		Status      string `json:"status"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Code and Name are required"})
		return
	}

	var exists int64
	config.DB.Model(&models.Customer{}).Where("code = ? AND user_id = ?", input.Code, userID).Count(&exists)
	if exists > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Customer code already exists"})
		return
	}

	customer := models.Customer{
		Code:        input.Code,
		Name:        input.Name,
		ShortName:   input.ShortName,
		Status:      "active",
		Description: input.Description,
		UserID:      userID,
	}
	if input.Status != "" {
		customer.Status = input.Status
	}

	if err := config.DB.Create(&customer).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create customer"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": customer})
}

func UpdateCustomer(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	var customer models.Customer
	if err := config.DB.Where("id = ? AND user_id = ?", c.Param("id"), userID).First(&customer).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Customer not found"})
		return
	}

	var input struct {
		Code        string `json:"code"`
		Name        string `json:"name"`
		ShortName   string `json:"short_name"`
		Status      string `json:"status"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	if input.Code != "" && input.Code != customer.Code {
		var exists int64
		config.DB.Model(&models.Customer{}).Where("code = ? AND user_id = ? AND id != ?", input.Code, userID, customer.ID).Count(&exists)
		if exists > 0 {
			c.JSON(http.StatusConflict, gin.H{"error": "Customer code already exists"})
			return
		}
	}

	config.DB.Model(&customer).Updates(map[string]interface{}{
		"code":        input.Code,
		"name":        input.Name,
		"short_name":  input.ShortName,
		"status":      input.Status,
		"description": input.Description,
	})

	c.JSON(http.StatusOK, gin.H{"data": customer})
}

func DeleteCustomer(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	var customer models.Customer
	if err := config.DB.Where("id = ? AND user_id = ?", c.Param("id"), userID).First(&customer).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Customer not found"})
		return
	}

	config.DB.Model(&customer).Update("status", "inactive")
	c.JSON(http.StatusOK, gin.H{"message": "Customer deactivated"})
}
