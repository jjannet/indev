package main

import (
	"log"
	"os"

	"indv-api/config"
	"indv-api/controllers"
	"indv-api/middleware"
	"indv-api/models"
	"indv-api/seeds"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using system environment variables")
	}

	config.ConnectDatabase()
	models.AutoMigrate(config.DB)
	seeds.SeedAdminUser(config.DB)

	router := gin.Default()

	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:2002"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	router.Static("/uploads", "./uploads")

	api := router.Group("/api")
	{
		api.POST("/auth/login", controllers.Login)

		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/auth/profile", controllers.GetProfile)

			// Customer routes
			protected.GET("/customers", controllers.GetCustomers)
			protected.GET("/customers/active", controllers.GetActiveCustomers)
			protected.GET("/customers/:id", controllers.GetCustomer)
			protected.POST("/customers", controllers.CreateCustomer)
			protected.PUT("/customers/:id", controllers.UpdateCustomer)
			protected.DELETE("/customers/:id", controllers.DeleteCustomer)

			// Project routes
			protected.GET("/projects", controllers.GetProjects)
			protected.GET("/projects/active", controllers.GetActiveProjects)
			protected.GET("/projects/:id", controllers.GetProject)
			protected.POST("/projects", controllers.CreateProject)
			protected.PUT("/projects/:id", controllers.UpdateProject)
			protected.DELETE("/projects/:id", controllers.DeleteProject)

			// Job Code routes
			protected.GET("/job-codes", controllers.GetJobCodes)
			protected.GET("/job-codes/:id", controllers.GetJobCode)
			protected.POST("/job-codes", controllers.CreateJobCode)
			protected.PUT("/job-codes/:id", controllers.UpdateJobCode)
			protected.DELETE("/job-codes/:id", controllers.DeleteJobCode)

			// Work Period Config routes
			protected.GET("/work-period-configs", controllers.GetWorkPeriodConfigs)
			protected.GET("/work-period-configs/default", controllers.GetOrCreateDefaultWorkPeriod)
			protected.GET("/work-period-configs/:id", controllers.GetWorkPeriodConfig)
			protected.POST("/work-period-configs", controllers.CreateWorkPeriodConfig)
			protected.PUT("/work-period-configs/:id", controllers.UpdateWorkPeriodConfig)
			protected.DELETE("/work-period-configs/:id", controllers.DeleteWorkPeriodConfig)

			// Work Log routes
			protected.GET("/work-logs", controllers.GetWorkLogs)
			protected.GET("/work-logs/summary", controllers.GetWorkLogSummary)
			protected.GET("/work-logs/last-project", controllers.GetLastUsedProject)
			protected.GET("/work-logs/:id", controllers.GetWorkLog)
			protected.POST("/work-logs", controllers.CreateWorkLog)
			protected.PUT("/work-logs/:id", controllers.UpdateWorkLog)
			protected.DELETE("/work-logs/:id", controllers.DeleteWorkLog)

			// Timesheet routes
			protected.GET("/timesheets/:work_period_id", controllers.GetTimesheetByPeriod)
			protected.PUT("/timesheets/:work_period_id/status", controllers.UpdateTimesheetStatus)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
