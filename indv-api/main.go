package main

import (
	"log"
	"os"
	"strings"

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
	envFile := os.Getenv("ENV_FILE")
	if envFile == "" {
		envFile = ".env.development"
	}
	if err := godotenv.Load(envFile); err != nil {
		log.Printf("Warning: %s not found, using system environment variables", envFile)
	}

	config.ConnectDatabase()
	models.AutoMigrate(config.DB)
	seeds.SeedAdminUser(config.DB)

	router := gin.Default()

	allowedOrigins := os.Getenv("CORS_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "http://localhost:2002"
	}
	origins := strings.Split(allowedOrigins, ",")

	router.Use(cors.New(cors.Config{
		AllowOrigins:     origins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	router.Static("/uploads", "./uploads")

	api := router.Group("/api")
	{
		// Public routes
		api.POST("/auth/login", controllers.Login)
		api.POST("/auth/register", controllers.Register)

		// Auth required (but allow force-reset users to access reset endpoint)
		auth := api.Group("/")
		auth.Use(middleware.AuthMiddleware())
		{
			auth.GET("/auth/profile", controllers.GetProfile)
			auth.PUT("/auth/reset-password", controllers.ForceResetPassword)
			auth.PUT("/auth/change-password", controllers.ChangePassword)
		}

		// Auth + ForceReset check (blocks all if force_reset_password=true)
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware(), middleware.ForceResetMiddleware())
		{
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
			protected.GET("/work-period-configs/year", controllers.GetWorkPeriodsByYear)
			protected.GET("/work-period-configs/:id", controllers.GetWorkPeriodConfig)
			protected.PUT("/work-period-configs/:id", controllers.UpdateWorkPeriodConfig)
			protected.PUT("/work-period-configs/:id/confirm", controllers.ConfirmWorkPeriod)

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

		// System Admin routes (Auth + ForceReset + Admin)
		admin := api.Group("/system-admin")
		admin.Use(middleware.AuthMiddleware(), middleware.ForceResetMiddleware(), middleware.AdminMiddleware())
		{
			admin.GET("/users", controllers.GetUsers)
			admin.GET("/users/:id", controllers.GetUser)
			admin.POST("/users", controllers.CreateUser)
			admin.PUT("/users/:id", controllers.UpdateUser)
			admin.DELETE("/users/:id", controllers.DeleteUser)
		}
	}

	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "2001"
	}

	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
