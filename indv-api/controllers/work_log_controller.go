package controllers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"indv-api/config"
	"indv-api/helpers"
	"indv-api/models"

	"github.com/gin-gonic/gin"
)

func parseTimeHHMM(s string) (int, int, error) {
	parts := strings.Split(s, ":")
	if len(parts) != 2 {
		return 0, 0, fmt.Errorf("invalid time format, expected HH:MM")
	}
	h, err := strconv.Atoi(parts[0])
	if err != nil || h < 0 || h > 23 {
		return 0, 0, fmt.Errorf("invalid hour")
	}
	m, err := strconv.Atoi(parts[1])
	if err != nil || m < 0 || m > 59 {
		return 0, 0, fmt.Errorf("invalid minute")
	}
	return h, m, nil
}

func calcDuration(startTime, endTime string) (int, error) {
	sh, sm, err := parseTimeHHMM(startTime)
	if err != nil {
		return 0, fmt.Errorf("start_time: %v", err)
	}
	eh, em, err := parseTimeHHMM(endTime)
	if err != nil {
		return 0, fmt.Errorf("end_time: %v", err)
	}
	startMin := sh*60 + sm
	endMin := eh*60 + em
	if endMin <= startMin {
		return 0, fmt.Errorf("end_time must be after start_time")
	}
	return endMin - startMin, nil
}

func isDateInWorkPeriod(date time.Time, userID uint) error {
	var wp models.WorkPeriodConfig
	result := config.DB.Where(
		"user_id = ? AND is_confirmed = ? AND start_date <= ? AND end_date >= ?",
		userID, true, date, date,
	).First(&wp)
	if result.Error != nil {
		return fmt.Errorf("date is not within any confirmed work period")
	}
	return nil
}

func isTimesheetLocked(date time.Time, userID uint) bool {
	var wp models.WorkPeriodConfig
	result := config.DB.Where(
		"user_id = ? AND is_confirmed = ? AND start_date <= ? AND end_date >= ?",
		userID, true, date, date,
	).First(&wp)
	if result.Error != nil {
		return false
	}
	var ts models.Timesheet
	result = config.DB.Where("work_period_id = ? AND user_id = ?", wp.ID, userID).First(&ts)
	if result.Error != nil {
		return false
	}
	return ts.Status == "done"
}

type WorkLogSummary struct {
	TotalDuration    int                    `json:"total_duration"`
	ProjectSummaries []ProjectDurationEntry `json:"project_summaries"`
}

type ProjectDurationEntry struct {
	ProjectID   uint   `json:"project_id"`
	ProjectName string `json:"project_name"`
	Duration    int    `json:"duration"`
}

func GetWorkLogs(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	params := helpers.GetPaginationParams(c)
	query := config.DB.Model(&models.WorkLog{}).Where("work_logs.user_id = ?", userID)

	// Filter by work period
	wpID := c.Query("work_period_id")
	if wpID != "" {
		var wp models.WorkPeriodConfig
		if err := config.DB.First(&wp, wpID).Error; err == nil {
			query = query.Where("work_logs.date >= ? AND work_logs.date <= ?", wp.StartDate, wp.EndDate)
		}
	}

	// Filter by exact date
	if dateStr := c.Query("date"); dateStr != "" {
		if d, err := time.Parse("2006-01-02", dateStr); err == nil {
			query = query.Where("work_logs.date = ?", d)
		}
	}

	// Filter by project
	if pid := c.Query("project_id"); pid != "" {
		query = query.Where("work_logs.project_id = ?", pid)
	}
	// Filter by customer
	if cid := c.Query("customer_id"); cid != "" {
		query = query.Where("work_logs.customer_id = ?", cid)
	}
	// Filter by status
	if params.Status != "" {
		query = query.Where("work_logs.status = ?", params.Status)
	}
	// Search
	if params.Search != "" {
		search := "%" + params.Search + "%"
		query = query.Where("work_logs.description ILIKE ?", search)
	}

	var total int64
	query.Count(&total)

	var logs []models.WorkLog
	query.Preload("Project").Preload("Customer").Preload("JobCode").
		Order("work_logs.date ASC, work_logs.start_time ASC").
		Offset(params.Offset()).Limit(params.PageSize).
		Find(&logs)

	c.JSON(http.StatusOK, helpers.NewPaginatedResponse(logs, total, params))
}

func GetWorkLogSummary(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	wpID := c.Query("work_period_id")
	if wpID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "work_period_id is required"})
		return
	}

	var wp models.WorkPeriodConfig
	if err := config.DB.First(&wp, wpID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work period not found"})
		return
	}

	var logs []models.WorkLog
	config.DB.Preload("Project").
		Where("user_id = ? AND date >= ? AND date <= ?", userID, wp.StartDate, wp.EndDate).
		Find(&logs)

	totalDuration := 0
	projectMap := make(map[uint]*ProjectDurationEntry)

	for _, l := range logs {
		totalDuration += l.Duration
		if entry, ok := projectMap[l.ProjectID]; ok {
			entry.Duration += l.Duration
		} else {
			projectMap[l.ProjectID] = &ProjectDurationEntry{
				ProjectID:   l.ProjectID,
				ProjectName: l.Project.Name,
				Duration:    l.Duration,
			}
		}
	}

	summaries := make([]ProjectDurationEntry, 0, len(projectMap))
	for _, v := range projectMap {
		summaries = append(summaries, *v)
	}

	c.JSON(http.StatusOK, gin.H{
		"data": WorkLogSummary{
			TotalDuration:    totalDuration,
			ProjectSummaries: summaries,
		},
	})
}

func GetWorkLog(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	id := c.Param("id")
	var log models.WorkLog
	if err := config.DB.Preload("Project").Preload("Customer").Preload("JobCode").
		Where("id = ? AND user_id = ?", id, userID).First(&log).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work log not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": log})
}

func GetLastUsedProject(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	var log models.WorkLog
	result := config.DB.Where("user_id = ?", userID).Order("created_at DESC").First(&log)
	if result.Error != nil {
		c.JSON(http.StatusOK, gin.H{"data": nil})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"project_id": log.ProjectID}})
}

func CreateWorkLog(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	var input struct {
		Date        string `json:"date"`
		StartTime   string `json:"start_time" binding:"required"`
		EndTime     string `json:"end_time"`
		ProjectID   uint   `json:"project_id" binding:"required"`
		CustomerID  *uint  `json:"customer_id"`
		JobCodeID   *uint  `json:"job_code_id"`
		RefID       string `json:"ref_id"`
		Description string `json:"description" binding:"required"`
		Status      string `json:"status"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse date
	var date time.Time
	if input.Date != "" {
		d, err := time.Parse("2006-01-02", input.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format, use YYYY-MM-DD"})
			return
		}
		date = d
	} else {
		now := time.Now()
		date = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	}

	// Validate date in work period
	if err := isDateInWorkPeriod(date, userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check timesheet lock
	if isTimesheetLocked(date, userID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Timesheet for this period is done. Cannot add work log."})
		return
	}

	// Validate times — duration calculated only when end_time is provided
	var duration int
	if input.EndTime != "" {
		d, err := calcDuration(input.StartTime, input.EndTime)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		duration = d
	}

	// Validate at least customer or job_code
	if input.CustomerID == nil && input.JobCodeID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one of customer_id or job_code_id is required"})
		return
	}

	// If job_code selected, auto-fill customer
	if input.JobCodeID != nil && *input.JobCodeID > 0 {
		var jc models.JobCode
		if err := config.DB.First(&jc, *input.JobCodeID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Job code not found"})
			return
		}
		input.CustomerID = &jc.CustomerID
	}

	status := input.Status
	if status == "" {
		status = "new"
	}
	validStatuses := map[string]bool{"new": true, "in_progress": true, "wait_for_test": true, "re_open": true, "done": true}
	if !validStatuses[status] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
		return
	}

	workLog := models.WorkLog{
		Date:        date,
		StartTime:   input.StartTime,
		EndTime:     input.EndTime,
		Duration:    duration,
		ProjectID:   input.ProjectID,
		CustomerID:  input.CustomerID,
		JobCodeID:   input.JobCodeID,
		RefID:       input.RefID,
		Description: input.Description,
		Status:      status,
		UserID:      userID,
	}

	if err := config.DB.Create(&workLog).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create work log"})
		return
	}

	config.DB.Preload("Project").Preload("Customer").Preload("JobCode").First(&workLog, workLog.ID)
	c.JSON(http.StatusCreated, gin.H{"data": workLog})
}

func UpdateWorkLog(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	id := c.Param("id")
	var workLog models.WorkLog
	if err := config.DB.Where("id = ? AND user_id = ?", id, userID).First(&workLog).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work log not found"})
		return
	}

	// Check timesheet lock
	if isTimesheetLocked(workLog.Date, userID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Timesheet for this period is done. Cannot edit work log."})
		return
	}

	var input struct {
		Date        string `json:"date"`
		StartTime   string `json:"start_time" binding:"required"`
		EndTime     string `json:"end_time"`
		ProjectID   uint   `json:"project_id" binding:"required"`
		CustomerID  *uint  `json:"customer_id"`
		JobCodeID   *uint  `json:"job_code_id"`
		RefID       string `json:"ref_id"`
		Description string `json:"description" binding:"required"`
		Status      string `json:"status"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse date
	var date time.Time
	if input.Date != "" {
		d, err := time.Parse("2006-01-02", input.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format, use YYYY-MM-DD"})
			return
		}
		date = d
	} else {
		date = workLog.Date
	}

	// Validate new date in work period
	if err := isDateInWorkPeriod(date, userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check timesheet lock on new date too
	if isTimesheetLocked(date, userID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Timesheet for the target period is done. Cannot move work log there."})
		return
	}

	var duration int
	if input.EndTime != "" {
		d, err := calcDuration(input.StartTime, input.EndTime)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		duration = d
	}

	if input.CustomerID == nil && input.JobCodeID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one of customer_id or job_code_id is required"})
		return
	}

	if input.JobCodeID != nil && *input.JobCodeID > 0 {
		var jc models.JobCode
		if err := config.DB.First(&jc, *input.JobCodeID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Job code not found"})
			return
		}
		input.CustomerID = &jc.CustomerID
	}

	status := input.Status
	if status == "" {
		status = workLog.Status
	}
	validStatuses := map[string]bool{"new": true, "in_progress": true, "wait_for_test": true, "re_open": true, "done": true}
	if !validStatuses[status] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
		return
	}

	workLog.Date = date
	workLog.StartTime = input.StartTime
	workLog.EndTime = input.EndTime
	workLog.Duration = duration
	workLog.ProjectID = input.ProjectID
	workLog.CustomerID = input.CustomerID
	workLog.JobCodeID = input.JobCodeID
	workLog.RefID = input.RefID
	workLog.Description = input.Description
	workLog.Status = status

	if err := config.DB.Save(&workLog).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update work log"})
		return
	}

	config.DB.Preload("Project").Preload("Customer").Preload("JobCode").First(&workLog, workLog.ID)
	c.JSON(http.StatusOK, gin.H{"data": workLog})
}

func DeleteWorkLog(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	id := c.Param("id")
	var workLog models.WorkLog
	if err := config.DB.Where("id = ? AND user_id = ?", id, userID).First(&workLog).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work log not found"})
		return
	}

	if isTimesheetLocked(workLog.Date, userID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Timesheet for this period is done. Cannot delete work log."})
		return
	}

	config.DB.Delete(&workLog)
	c.JSON(http.StatusOK, gin.H{"message": "Work log deleted"})
}
