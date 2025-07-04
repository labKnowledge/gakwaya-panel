package handlers

import (
	"database/sql"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=32"`
	Password string `json:"password" binding:"required,min=6,max=64"`
}

type RegisterResponse struct {
	ID        int64     `json:"id"`
	Username  string    `json:"username"`
	CreatedAt time.Time `json:"created_at"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token string `json:"token"`
}

func RegisterUser(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req RegisterRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}

		result, err := db.Exec(
			"INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
			req.Username, string(hash), time.Now(),
		)
		if err != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Username already exists or DB error"})
			return
		}

		id, _ := result.LastInsertId()
		c.JSON(http.StatusCreated, RegisterResponse{
			ID:        id,
			Username:  req.Username,
			CreatedAt: time.Now(),
		})
	}
}

func LoginUser(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var id int64
		var username, passwordHash string
		var createdAt time.Time
		err := db.QueryRow("SELECT id, username, password_hash, created_at FROM users WHERE username = ?", req.Username).Scan(&id, &username, &passwordHash, &createdAt)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
			return
		}

		jwtSecret := os.Getenv("JWT_SECRET")
		if jwtSecret == "" {
			jwtSecret = "dev_secret_change_me" // fallback for dev
		}

		// Create JWT token
		claims := jwt.MapClaims{
			"user_id":  id,
			"username": username,
			"exp":      time.Now().Add(24 * time.Hour).Unix(),
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenString, err := token.SignedString([]byte(jwtSecret))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}

		c.JSON(http.StatusOK, LoginResponse{Token: tokenString})
	}
}

// JWTAuthMiddleware validates JWT and sets user info in context
func JWTAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.GetHeader("Authorization")
		if len(tokenString) > 7 && tokenString[:7] == "Bearer " {
			tokenString = tokenString[7:]
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing or invalid Authorization header"})
			c.Abort()
			return
		}

		jwtSecret := os.Getenv("JWT_SECRET")
		if jwtSecret == "" {
			jwtSecret = "dev_secret_change_me"
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(jwtSecret), nil
		})
		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}

		c.Set("user_id", claims["user_id"])
		c.Set("username", claims["username"])
		c.Next()
	}
}

// MeHandler returns info about the current authenticated user
func MeHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("user_id")
		username, _ := c.Get("username")
		c.JSON(http.StatusOK, gin.H{
			"user_id":  userID,
			"username": username,
		})
	}
}

// ProtectedHandler returns a message and user info for authenticated users
func ProtectedHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("user_id")
		username, _ := c.Get("username")
		c.JSON(http.StatusOK, gin.H{
			"message":  "You have accessed a protected endpoint!",
			"user_id":  userID,
			"username": username,
		})
	}
}
