package controllers

import (
	"net/http"

	"indv-api/config"
	"indv-api/helpers"
	"indv-api/models"

	"github.com/gin-gonic/gin"
)

type DailySummaryEntry struct {
	Date     string           `json:"date"`
	Duration int              `json:"duration"`
	Logs     []models.WorkLog `json:"logs"`
}

type TimesheetSummary struct {
	Timesheet      models.Timesheet        `json:"timesheet"`
	WorkPeriod     models.WorkPeriodConfig `json:"work_period"`
	TotalDuration  int                     `json:"total_duration"`
	DailySummaries []DailySummaryEntry     `json:"daily_summaries"`
	ProjectSummary []ProjectDurationEntry  `json:"project_summary"`
	JobCodeSummary []JobCodeDurationEntry  `json:"job_code_summary"`
}

type JobCodeDurationEntry struct {
	JobCodeID   *uint  `json:"job_code_id"`
	JobCodeName string `json:"job_code_name"`
	Duration    int    `json:"duration"`
}

func GetTimesheetByPeriod(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	wpID := c.Param("work_period_id")

	var wp models.WorkPeriodConfig
	if err := config.DB.Where("id = ? AND user_id = ?", wpID, userID).First(&wp).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work period not found"})
		return
	}

	// Get or create timesheet
	var ts models.Timesheet
	result := config.DB.Where("work_period_id = ? AND user_id = ?", wp.ID, userID).First(&ts)
	if result.Error != nil {
		ts = models.Timesheet{
			WorkPeriodID: wp.ID,
			UserID:       userID,
			Status:       "in_progress",
		}
		config.DB.Create(&ts)
	}
	ts.WorkPeriod = wp

	// Get all work logs in this period
	var logs []models.WorkLog
	config.DB.Preload("Project").Preload("Customer").Preload("JobCode").
		Where("user_id = ? AND date >= ? AND date <= ?", userID, wp.StartDate, wp.EndDate).
		Order("date ASC, start_time ASC").
		Find(&logs)

	// Build daily summaries
	dailyMap := make(map[string]*DailySummaryEntry)
	var dailyOrder []string
	totalDuration := 0
	projectMap := make(map[uint]*ProjectDurationEntry)
	jobCodeMap := make(map[uint]*JobCodeDurationEntry)

	for _, l := range logs {
		dateStr := l.Date.Format("2006-01-02")
		totalDuration += l.Duration

		if _, ok := dailyMap[dateStr]; !ok {
			dailyMap[dateStr] = &DailySummaryEntry{Date: dateStr}
			dailyOrder = append(dailyOrder, dateStr)
		}
		entry := dailyMap[dateStr]
		entry.Duration += l.Duration
		entry.Logs = append(entry.Logs, l)

		// Project summary
		if pe, ok := projectMap[l.ProjectID]; ok {
			pe.Duration += l.Duration
		} else {
			projectMap[l.ProjectID] = &ProjectDurationEntry{
				ProjectID:   l.ProjectID,
				ProjectName: l.Project.Name,
				Duration:    l.Duration,
			}
		}

		// JobCode summary
		var jcKey uint
		var jcName string
		if l.JobCodeID != nil {
			jcKey = *l.JobCodeID
			if l.JobCode != nil {
				jcName = l.JobCode.Name
			}
		}
		if je, ok := jobCodeMap[jcKey]; ok {
			je.Duration += l.Duration
		} else {
			jobCodeMap[jcKey] = &JobCodeDurationEntry{
				JobCodeID:   l.JobCodeID,
				JobCodeName: jcName,
				Duration:    l.Duration,
			}
		}
	}

	dailySummaries := make([]DailySummaryEntry, 0, len(dailyOrder))
	for _, d := range dailyOrder {
		dailySummaries = append(dailySummaries, *dailyMap[d])
	}

	projectSummary := make([]ProjectDurationEntry, 0, len(projectMap))
	for _, v := range projectMap {
		projectSummary = append(projectSummary, *v)
	}

	jobCodeSummary := make([]JobCodeDurationEntry, 0, len(jobCodeMap))
	for _, v := range jobCodeMap {
		jobCodeSummary = append(jobCodeSummary, *v)
	}

	c.JSON(http.StatusOK, gin.H{
		"data": TimesheetSummary{
			Timesheet:      ts,
			WorkPeriod:     wp,
			TotalDuration:  totalDuration,
			DailySummaries: dailySummaries,
			ProjectSummary: projectSummary,
			JobCodeSummary: jobCodeSummary,
		},
	})
}

func UpdateTimesheetStatus(c *gin.Context) {
	userID, ok := helpers.GetUserID(c)
	if !ok {
		return
	}

	wpID := c.Param("work_period_id")

	var wp models.WorkPeriodConfig
	if err := config.DB.Where("id = ? AND user_id = ?", wpID, userID).First(&wp).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work period not found"})
		return
	}

	var input struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Status != "in_progress" && input.Status != "done" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Status must be in_progress or done"})
		return
	}

	// Validate all work logs have job_code before closing
	if input.Status == "done" {
		var logsWithoutJC []models.WorkLog
		config.DB.Where("user_id = ? AND date >= ? AND date <= ? AND (job_code_id IS NULL OR job_code_id = 0)",
			userID, wp.StartDate, wp.EndDate).
			Order("date ASC, start_time ASC").
			Find(&logsWithoutJC)

		if len(logsWithoutJC) > 0 {
			type MissingEntry struct {
				ID          uint   `json:"id"`
				Date        string `json:"date"`
				Description string `json:"description"`
			}
			missing := make([]MissingEntry, len(logsWithoutJC))
			for i, l := range logsWithoutJC {
				missing[i] = MissingEntry{
					ID:          l.ID,
					Date:        l.Date.Format("2006-01-02"),
					Description: l.Description,
				}
			}
			c.JSON(http.StatusBadRequest, gin.H{
				"error":            "Cannot close timesheet. Some work logs are missing a Job Code.",
				"missing_job_code": missing,
			})
			return
		}
	}

	var ts models.Timesheet
	result := config.DB.Where("work_period_id = ? AND user_id = ?", wp.ID, userID).First(&ts)
	if result.Error != nil {
		ts = models.Timesheet{
			WorkPeriodID: wp.ID,
			UserID:       userID,
			Status:       input.Status,
		}
		config.DB.Create(&ts)
	} else {
		ts.Status = input.Status
		config.DB.Save(&ts)
	}

	ts.WorkPeriod = wp
	c.JSON(http.StatusOK, gin.H{"data": ts})
}
