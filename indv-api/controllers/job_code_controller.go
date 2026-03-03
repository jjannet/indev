package controllers

import (
	"net/http"

	"indv-api/config"
	"indv-api/helpers"
	"indv-api/models"

	"github.com/gin-gonic/gin"
)

func GetJobCodes(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	params := helpers.GetPaginationParams(c)
	var jobCodes []models.JobCode
	var total int64

	query := config.DB.Where("job_codes.user_id = ?", userID)

	if params.Search != "" {
		search := "%" + params.Search + "%"
		query = query.Where("(job_codes.name ILIKE ? OR job_codes.code ILIKE ?)", search, search)
	}
	if params.Status != "" {
		query = query.Where("job_codes.status = ?", params.Status)
	}

	customerID := c.Query("customer_id")
	if customerID != "" {
		query = query.Where("job_codes.customer_id = ?", customerID)
	}

	projectID := c.Query("project_id")
	if projectID != "" {
		query = query.Where("job_codes.project_id = ?", projectID)
	}

	query.Model(&models.JobCode{}).Count(&total)

	query.Preload("Customer").Preload("Project").
		Order("job_codes." + params.SortBy + " " + params.SortDir).
		Offset(params.Offset()).
		Limit(params.PageSize).
		Find(&jobCodes)

	c.JSON(http.StatusOK, helpers.NewPaginatedResponse(jobCodes, total, params))
}

func GetJobCode(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	var jobCode models.JobCode
	if err := config.DB.Preload("Customer").Preload("Project").
		Where("id = ? AND user_id = ?", c.Param("id"), userID).First(&jobCode).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job Code not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": jobCode})
}

func CreateJobCode(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	var input struct {
		Code        string `json:"code" binding:"required"`
		Name        string `json:"name" binding:"required"`
		Type        string `json:"type" binding:"required"`
		CustomerID  uint   `json:"customer_id" binding:"required"`
		ProjectID   uint   `json:"project_id" binding:"required"`
		Status      string `json:"status"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Code, Name, Type, Customer and Project are required"})
		return
	}

	if input.Type != "billable" && input.Type != "non-billable" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Type must be 'billable' or 'non-billable'"})
		return
	}

	var existsCode int64
	config.DB.Model(&models.JobCode{}).
		Where("code = ? AND customer_id = ? AND project_id = ? AND user_id = ?",
			input.Code, input.CustomerID, input.ProjectID, userID).
		Count(&existsCode)
	if existsCode > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Job Code already exists for this Customer and Project"})
		return
	}

	jobCode := models.JobCode{
		Code:        input.Code,
		Name:        input.Name,
		Type:        input.Type,
		Status:      "active",
		Description: input.Description,
		CustomerID:  input.CustomerID,
		ProjectID:   input.ProjectID,
		UserID:      userID,
	}
	if input.Status != "" {
		jobCode.Status = input.Status
	}

	if err := config.DB.Create(&jobCode).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create job code"})
		return
	}

	config.DB.Preload("Customer").Preload("Project").First(&jobCode, jobCode.ID)
	c.JSON(http.StatusCreated, gin.H{"data": jobCode})
}

func UpdateJobCode(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	var jobCode models.JobCode
	if err := config.DB.Where("id = ? AND user_id = ?", c.Param("id"), userID).First(&jobCode).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job Code not found"})
		return
	}

	var input struct {
		Code        string `json:"code"`
		Name        string `json:"name"`
		Type        string `json:"type"`
		CustomerID  uint   `json:"customer_id"`
		ProjectID   uint   `json:"project_id"`
		Status      string `json:"status"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	if input.Type != "" && input.Type != "billable" && input.Type != "non-billable" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Type must be 'billable' or 'non-billable'"})
		return
	}

	custID := jobCode.CustomerID
	projID := jobCode.ProjectID
	if input.CustomerID > 0 {
		custID = input.CustomerID
	}
	if input.ProjectID > 0 {
		projID = input.ProjectID
	}

	if input.Code != "" && (input.Code != jobCode.Code || custID != jobCode.CustomerID || projID != jobCode.ProjectID) {
		var exists int64
		config.DB.Model(&models.JobCode{}).
			Where("code = ? AND customer_id = ? AND project_id = ? AND user_id = ? AND id != ?",
				input.Code, custID, projID, userID, jobCode.ID).
			Count(&exists)
		if exists > 0 {
			c.JSON(http.StatusConflict, gin.H{"error": "Job Code already exists for this Customer and Project"})
			return
		}
	}

	updates := map[string]interface{}{
		"code":        input.Code,
		"name":        input.Name,
		"type":        input.Type,
		"status":      input.Status,
		"description": input.Description,
	}
	if input.CustomerID > 0 {
		updates["customer_id"] = input.CustomerID
	}
	if input.ProjectID > 0 {
		updates["project_id"] = input.ProjectID
	}

	config.DB.Model(&jobCode).Updates(updates)

	config.DB.Preload("Customer").Preload("Project").First(&jobCode, jobCode.ID)
	c.JSON(http.StatusOK, gin.H{"data": jobCode})
}

func DeleteJobCode(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	var jobCode models.JobCode
	if err := config.DB.Where("id = ? AND user_id = ?", c.Param("id"), userID).First(&jobCode).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job Code not found"})
		return
	}

	config.DB.Model(&jobCode).Update("status", "inactive")
	c.JSON(http.StatusOK, gin.H{"message": "Job Code deactivated"})
}
