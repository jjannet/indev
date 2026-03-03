package controllers

import (
	"fmt"
	"net/http"
	"time"

	"indv-api/config"
	"indv-api/helpers"
	"indv-api/models"

	"github.com/gin-gonic/gin"
)

func GetWorkPeriodConfigs(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	params := helpers.GetPaginationParams(c)
	var configs []models.WorkPeriodConfig
	var total int64

	query := config.DB.Where("user_id = ?", userID)

	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}

	year := c.Query("year")
	if year != "" {
		query = query.Where("year = ?", year)
	}

	query.Model(&models.WorkPeriodConfig{}).Count(&total)

	query.Order("year desc, month desc").
		Offset(params.Offset()).
		Limit(params.PageSize).
		Find(&configs)

	c.JSON(http.StatusOK, helpers.NewPaginatedResponse(configs, total, params))
}

func GetWorkPeriodConfig(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	var cfg models.WorkPeriodConfig
	if err := config.DB.Where("id = ? AND user_id = ?", c.Param("id"), userID).First(&cfg).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work Period Config not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": cfg})
}

func GetOrCreateDefaultWorkPeriod(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	year := c.Query("year")
	month := c.Query("month")
	if year == "" || month == "" {
		now := time.Now()
		year = fmt.Sprintf("%d", now.Year())
		month = fmt.Sprintf("%d", int(now.Month()))
	}

	var cfg models.WorkPeriodConfig
	err := config.DB.Where("year = ? AND month = ? AND user_id = ? AND status = ?",
		year, month, userID, "active").First(&cfg).Error

	if err != nil {
		y, _ := time.Parse("2006", year)
		m, _ := time.Parse("1", month)
		startDate := time.Date(y.Year(), m.Month(), 1, 0, 0, 0, 0, time.UTC)
		endDate := startDate.AddDate(0, 1, -1)

		cfg = models.WorkPeriodConfig{
			Year:      y.Year(),
			Month:     int(m.Month()),
			StartDate: startDate,
			EndDate:   endDate,
			IsDefault: true,
			Status:    "active",
			UserID:    userID,
		}
		config.DB.Create(&cfg)
	}

	c.JSON(http.StatusOK, gin.H{"data": cfg})
}

func CreateWorkPeriodConfig(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	var input struct {
		Year        int    `json:"year" binding:"required"`
		Month       int    `json:"month" binding:"required"`
		StartDate   string `json:"start_date" binding:"required"`
		EndDate     string `json:"end_date" binding:"required"`
		IsDefault   bool   `json:"is_default"`
		Status      string `json:"status"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Year, Month, StartDate and EndDate are required"})
		return
	}

	if input.Month < 1 || input.Month > 12 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Month must be between 1 and 12"})
		return
	}

	startDate, err := time.Parse("2006-01-02", input.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format (use YYYY-MM-DD)"})
		return
	}
	endDate, err := time.Parse("2006-01-02", input.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_date format (use YYYY-MM-DD)"})
		return
	}

	if endDate.Before(startDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "end_date must be after start_date"})
		return
	}

	var overlap int64
	config.DB.Model(&models.WorkPeriodConfig{}).
		Where("year = ? AND month = ? AND user_id = ? AND status = ?",
			input.Year, input.Month, userID, "active").
		Where("(start_date <= ? AND end_date >= ?)", endDate, startDate).
		Count(&overlap)
	if overlap > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Overlapping work period config exists for this month"})
		return
	}

	cfg := models.WorkPeriodConfig{
		Year:        input.Year,
		Month:       input.Month,
		StartDate:   startDate,
		EndDate:     endDate,
		IsDefault:   input.IsDefault,
		Status:      "active",
		Description: input.Description,
		UserID:      userID,
	}
	if input.Status != "" {
		cfg.Status = input.Status
	}

	if err := config.DB.Create(&cfg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create work period config"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": cfg})
}

func UpdateWorkPeriodConfig(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	var cfg models.WorkPeriodConfig
	if err := config.DB.Where("id = ? AND user_id = ?", c.Param("id"), userID).First(&cfg).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work Period Config not found"})
		return
	}

	var input struct {
		Year        int    `json:"year"`
		Month       int    `json:"month"`
		StartDate   string `json:"start_date"`
		EndDate     string `json:"end_date"`
		IsDefault   *bool  `json:"is_default"`
		Status      string `json:"status"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	updates := map[string]interface{}{}

	year := cfg.Year
	month := cfg.Month
	startDate := cfg.StartDate
	endDate := cfg.EndDate

	if input.Year > 0 {
		year = input.Year
		updates["year"] = input.Year
	}
	if input.Month >= 1 && input.Month <= 12 {
		month = input.Month
		updates["month"] = input.Month
	}
	if input.StartDate != "" {
		t, err := time.Parse("2006-01-02", input.StartDate)
		if err == nil {
			startDate = t
			updates["start_date"] = t
		}
	}
	if input.EndDate != "" {
		t, err := time.Parse("2006-01-02", input.EndDate)
		if err == nil {
			endDate = t
			updates["end_date"] = t
		}
	}
	if input.IsDefault != nil {
		updates["is_default"] = *input.IsDefault
	}
	if input.Status != "" {
		updates["status"] = input.Status
	}
	if input.Description != "" {
		updates["description"] = input.Description
	}

	if endDate.Before(startDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "end_date must be after start_date"})
		return
	}

	var overlap int64
	config.DB.Model(&models.WorkPeriodConfig{}).
		Where("year = ? AND month = ? AND user_id = ? AND status = ? AND id != ?",
			year, month, userID, "active", cfg.ID).
		Where("(start_date <= ? AND end_date >= ?)", endDate, startDate).
		Count(&overlap)
	if overlap > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Overlapping work period config exists for this month"})
		return
	}

	config.DB.Model(&cfg).Updates(updates)
	c.JSON(http.StatusOK, gin.H{"data": cfg})
}

func DeleteWorkPeriodConfig(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	var cfg models.WorkPeriodConfig
	if err := config.DB.Where("id = ? AND user_id = ?", c.Param("id"), userID).First(&cfg).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work Period Config not found"})
		return
	}

	config.DB.Model(&cfg).Update("status", "inactive")
	c.JSON(http.StatusOK, gin.H{"message": "Work Period Config deactivated"})
}
