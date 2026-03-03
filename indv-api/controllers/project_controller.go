package controllers

import (
	"net/http"
	"time"

	"indv-api/config"
	"indv-api/helpers"
	"indv-api/models"

	"github.com/gin-gonic/gin"
)

func GetProjects(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	params := helpers.GetPaginationParams(c)
	var projects []models.Project
	var total int64

	query := config.DB.Where("projects.user_id = ?", userID)

	if params.Search != "" {
		search := "%" + params.Search + "%"
		query = query.Where("(projects.name ILIKE ? OR projects.code ILIKE ?)", search, search)
	}
	if params.Status != "" {
		query = query.Where("projects.status = ?", params.Status)
	}

	customerID := c.Query("customer_id")
	if customerID != "" {
		query = query.Joins("JOIN project_customers ON project_customers.project_id = projects.id").
			Where("project_customers.customer_id = ?", customerID)
	}

	query.Model(&models.Project{}).Count(&total)

	query.Preload("Customers").
		Order("projects." + params.SortBy + " " + params.SortDir).
		Offset(params.Offset()).
		Limit(params.PageSize).
		Find(&projects)

	c.JSON(http.StatusOK, helpers.NewPaginatedResponse(projects, total, params))
}

func GetProject(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	var project models.Project
	if err := config.DB.Preload("Customers").Where("id = ? AND user_id = ?", c.Param("id"), userID).First(&project).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": project})
}

func GetActiveProjects(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	query := config.DB.Where("projects.user_id = ? AND projects.status = ?", userID, "active")

	customerID := c.Query("customer_id")
	if customerID != "" {
		query = query.Joins("JOIN project_customers ON project_customers.project_id = projects.id").
			Where("project_customers.customer_id = ?", customerID)
	}

	var projects []models.Project
	query.Order("name asc").Find(&projects)

	c.JSON(http.StatusOK, gin.H{"data": projects})
}

func CreateProject(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	var input struct {
		Code        string `json:"code" binding:"required"`
		Name        string `json:"name" binding:"required"`
		StartDate   string `json:"start_date"`
		EndDate     string `json:"end_date"`
		Status      string `json:"status"`
		Description string `json:"description"`
		CustomerIDs []uint `json:"customer_ids"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Code and Name are required"})
		return
	}

	var exists int64
	config.DB.Model(&models.Project{}).Where("code = ? AND user_id = ?", input.Code, userID).Count(&exists)
	if exists > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Project code already exists"})
		return
	}

	project := models.Project{
		Code:        input.Code,
		Name:        input.Name,
		Status:      "active",
		Description: input.Description,
		UserID:      userID,
	}
	if input.Status != "" {
		project.Status = input.Status
	}

	if input.StartDate != "" {
		t, err := parseDate(input.StartDate)
		if err == nil {
			project.StartDate = &t
		}
	}
	if input.EndDate != "" {
		t, err := parseDate(input.EndDate)
		if err == nil {
			project.EndDate = &t
		}
	}

	if len(input.CustomerIDs) > 0 {
		var customers []models.Customer
		config.DB.Where("id IN ? AND user_id = ?", input.CustomerIDs, userID).Find(&customers)
		project.Customers = customers
	}

	if err := config.DB.Create(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create project"})
		return
	}

	config.DB.Preload("Customers").First(&project, project.ID)
	c.JSON(http.StatusCreated, gin.H{"data": project})
}

func UpdateProject(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	var project models.Project
	if err := config.DB.Where("id = ? AND user_id = ?", c.Param("id"), userID).First(&project).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	var input struct {
		Code        string `json:"code"`
		Name        string `json:"name"`
		StartDate   string `json:"start_date"`
		EndDate     string `json:"end_date"`
		Status      string `json:"status"`
		Description string `json:"description"`
		CustomerIDs []uint `json:"customer_ids"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	if input.Code != "" && input.Code != project.Code {
		var exists int64
		config.DB.Model(&models.Project{}).Where("code = ? AND user_id = ? AND id != ?", input.Code, userID, project.ID).Count(&exists)
		if exists > 0 {
			c.JSON(http.StatusConflict, gin.H{"error": "Project code already exists"})
			return
		}
	}

	updates := map[string]interface{}{
		"code":        input.Code,
		"name":        input.Name,
		"status":      input.Status,
		"description": input.Description,
	}

	if input.StartDate != "" {
		t, err := parseDate(input.StartDate)
		if err == nil {
			updates["start_date"] = t
		}
	}
	if input.EndDate != "" {
		t, err := parseDate(input.EndDate)
		if err == nil {
			updates["end_date"] = t
		}
	}

	config.DB.Model(&project).Updates(updates)

	if input.CustomerIDs != nil {
		var customers []models.Customer
		if len(input.CustomerIDs) > 0 {
			config.DB.Where("id IN ? AND user_id = ?", input.CustomerIDs, userID).Find(&customers)
		}
		config.DB.Model(&project).Association("Customers").Replace(customers)
	}

	config.DB.Preload("Customers").First(&project, project.ID)
	c.JSON(http.StatusOK, gin.H{"data": project})
}

func DeleteProject(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	var project models.Project
	if err := config.DB.Where("id = ? AND user_id = ?", c.Param("id"), userID).First(&project).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	config.DB.Model(&project).Update("status", "inactive")
	c.JSON(http.StatusOK, gin.H{"message": "Project deactivated"})
}

func parseDate(s string) (time.Time, error) {
	return time.Parse("2006-01-02", s)
}
