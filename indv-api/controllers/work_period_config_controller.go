package controllers

import (
	"net/http"
	"strconv"
	"time"

	"indv-api/config"
	"indv-api/helpers"
	"indv-api/models"

	"github.com/gin-gonic/gin"
)

// GetWorkPeriodsByYear auto-generates 12 months for the given year if they don't exist,
// then returns all 12 months sorted by month ASC.
func GetWorkPeriodsByYear(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	yearStr := c.DefaultQuery("year", strconv.Itoa(time.Now().Year()))
	year, err := strconv.Atoi(yearStr)
	if err != nil || year < 2000 || year > 2100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid year"})
		return
	}

	// Find which months already exist for this year+user
	var existing []models.WorkPeriodConfig
	config.DB.Where("year = ? AND user_id = ?", year, userID).Find(&existing)

	existingMonths := make(map[int]bool)
	for _, e := range existing {
		existingMonths[e.Month] = true
	}

	// Auto-generate any missing months
	for m := 1; m <= 12; m++ {
		if existingMonths[m] {
			continue
		}
		startDate := time.Date(year, time.Month(m), 1, 0, 0, 0, 0, time.UTC)
		endDate := startDate.AddDate(0, 1, -1)
		cfg := models.WorkPeriodConfig{
			Year:        year,
			Month:       m,
			StartDate:   startDate,
			EndDate:     endDate,
			IsConfirmed: false,
			UserID:      userID,
		}
		config.DB.Create(&cfg)
	}

	// Fetch all 12 months
	var configs []models.WorkPeriodConfig
	config.DB.Where("year = ? AND user_id = ?", year, userID).
		Order("month ASC").
		Find(&configs)

	// For each month, check if its timesheet is done (locked)
	type PeriodWithLock struct {
		models.WorkPeriodConfig
		IsLocked bool `json:"is_locked"`
	}

	result := make([]PeriodWithLock, 0, len(configs))
	for _, cfg := range configs {
		var ts models.Timesheet
		locked := false
		if err := config.DB.Where("work_period_id = ? AND user_id = ?", cfg.ID, userID).First(&ts).Error; err == nil {
			if ts.Status == "done" {
				locked = true
			}
		}
		result = append(result, PeriodWithLock{
			WorkPeriodConfig: cfg,
			IsLocked:         locked,
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

// GetWorkPeriodConfigs returns paginated list (kept for backward compatibility with work-log dropdown)
func GetWorkPeriodConfigs(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	params := helpers.GetPaginationParams(c)
	var configs []models.WorkPeriodConfig
	var total int64

	query := config.DB.Where("user_id = ?", userID)

	if params.Status == "confirmed" {
		query = query.Where("is_confirmed = ?", true)
	} else if params.Status == "pending" {
		query = query.Where("is_confirmed = ?", false)
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

// GetWorkPeriodConfig returns a single work period config by ID
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

// UpdateWorkPeriodConfig updates start_date and/or end_date for a work period
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

	// Check if timesheet is done → locked
	var ts models.Timesheet
	if err := config.DB.Where("work_period_id = ? AND user_id = ?", cfg.ID, userID).First(&ts).Error; err == nil {
		if ts.Status == "done" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Cannot modify a locked work period (timesheet is done)"})
			return
		}
	}

	var input struct {
		StartDate string `json:"start_date"`
		EndDate   string `json:"end_date"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	startDate := cfg.StartDate
	endDate := cfg.EndDate

	if input.StartDate != "" {
		t, err := time.Parse("2006-01-02", input.StartDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format (use YYYY-MM-DD)"})
			return
		}
		// Validate: start_date must be in the same month
		if int(t.Month()) != cfg.Month || t.Year() != cfg.Year {
			c.JSON(http.StatusBadRequest, gin.H{"error": "start_date must be within the same month"})
			return
		}
		startDate = t
	}

	if input.EndDate != "" {
		t, err := time.Parse("2006-01-02", input.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_date format (use YYYY-MM-DD)"})
			return
		}
		// Validate: end_date must be in the same month
		if int(t.Month()) != cfg.Month || t.Year() != cfg.Year {
			c.JSON(http.StatusBadRequest, gin.H{"error": "end_date must be within the same month"})
			return
		}
		endDate = t
	}

	if endDate.Before(startDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "end_date must be >= start_date"})
		return
	}

	config.DB.Model(&cfg).Updates(map[string]interface{}{
		"start_date": startDate,
		"end_date":   endDate,
	})

	config.DB.First(&cfg, cfg.ID)
	c.JSON(http.StatusOK, gin.H{"data": cfg})
}

// ConfirmWorkPeriod sets is_confirmed = true
func ConfirmWorkPeriod(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	var cfg models.WorkPeriodConfig
	if err := config.DB.Where("id = ? AND user_id = ?", c.Param("id"), userID).First(&cfg).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work Period Config not found"})
		return
	}

	// Check if timesheet is done → locked
	var ts models.Timesheet
	if err := config.DB.Where("work_period_id = ? AND user_id = ?", cfg.ID, userID).First(&ts).Error; err == nil {
		if ts.Status == "done" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Cannot modify a locked work period (timesheet is done)"})
			return
		}
	}

	config.DB.Model(&cfg).Update("is_confirmed", true)
	cfg.IsConfirmed = true
	c.JSON(http.StatusOK, gin.H{"data": cfg})
}
