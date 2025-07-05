package main

import (
	"database/sql"
	"log"
	"os"
	"os/exec"

	"github.com/gakwaya-panel/api/internal/handlers"
	"github.com/gakwaya-panel/api/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/mattn/go-sqlite3"
	// cors "github.com/rs/cors/wrapper/gin"
)

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		// c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func main() {
	// Load environment variables
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, using environment variables")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "sqlite.db"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Enable Docker BuildKit if possible
	enableBuildkitScript := "../scripts/enable_buildkit.sh"
	if _, err := os.Stat(enableBuildkitScript); err == nil {
		cmd := exec.Command("bash", enableBuildkitScript)
		output, err := cmd.CombinedOutput()
		if err != nil {
			log.Printf("[WARN] Failed to enable BuildKit: %v\n%s", err, string(output))
		} else {
			log.Printf("[INFO] BuildKit enabled: %s", string(output))
		}
	}

	// Connect to SQLite
	db, err := sql.Open("sqlite3", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Run migrations
	if err := runMigrations(db); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	// Simple ping to check DB connection
	if err := db.Ping(); err != nil {
		log.Fatalf("Database connection error: %v", err)
	}

	r := gin.Default()
	r.Use(CORSMiddleware())

	// Health check endpoint
	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// User registration endpoint
	r.POST("/api/register", handlers.RegisterUser(db))

	// User login endpoint
	r.POST("/api/login", handlers.LoginUser(db))

	// Authenticated user info endpoint
	r.GET("/api/me", handlers.JWTAuthMiddleware(), handlers.MeHandler())

	// Example protected endpoint
	r.GET("/api/protected", handlers.JWTAuthMiddleware(), handlers.ProtectedHandler())

	// Application CRUD endpoints (protected)
	appGroup := r.Group("/api/applications", handlers.JWTAuthMiddleware())
	{
		appGroup.POST("", handlers.CreateApplication(db))
		appGroup.GET("", handlers.ListApplications(db))
		appGroup.GET(":id", handlers.GetApplication(db))
		appGroup.PUT(":id", handlers.UpdateApplication(db))
		appGroup.DELETE(":id", handlers.DeleteApplication(db))
		appGroup.POST(":id/deploy", handlers.DeployApplication(db))
		appGroup.POST(":id/deploy-from-git", handlers.DeployFromGit(db))
	}

	// Docker integration endpoints (protected)
	dockerGroup := r.Group("/api/docker", handlers.JWTAuthMiddleware())
	{
		dockerGroup.GET("/containers", handlers.ListDockerContainers())
		dockerGroup.POST("/run", handlers.RunDockerContainer(db))
		dockerGroup.POST("/stop/:id", handlers.StopDockerContainer())
		dockerGroup.DELETE("/remove/:id", handlers.RemoveDockerContainer())
		dockerGroup.GET("/logs/:id", handlers.GetDockerContainerLogs())
		dockerGroup.POST("/prune", handlers.DockerSystemPrune())
		dockerGroup.POST("/prune-all", handlers.DockerSystemPruneAll())
		dockerGroup.GET("/info", handlers.DockerSystemInfo())
		dockerGroup.POST("/restart/:id", handlers.RestartDockerContainer())
		dockerGroup.GET("/inspect/:id", handlers.InspectDockerContainer())
		dockerGroup.GET("/stats/:id", handlers.StatsDockerContainer())
		dockerGroup.POST("/exec/:id", handlers.ExecDockerContainer())
		dockerGroup.GET("/terminal/:id", handlers.TerminalDockerContainer())
	}

	log.Printf("Starting server on :%s", port)
	r.Run(":" + port)
}

func runMigrations(db *sql.DB) error {
	return models.Migrate(db)
}
