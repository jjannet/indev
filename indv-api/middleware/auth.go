package middleware

import (
	"net/http"
	"os"
	"strings"

	"indv-api/config"
	"indv-api/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Bearer token is required"})
			c.Abort()
			return
		}

		secret := os.Getenv("JWT_SECRET")
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(secret), nil
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

		userID := claims["user_id"]
		c.Set("user_id", userID)
		c.Set("email", claims["email"])

		var user models.User
		if err := config.DB.First(&user, userID).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			c.Abort()
			return
		}

		if user.Status != "active" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Account is inactive"})
			c.Abort()
			return
		}

		c.Set("is_system_admin", user.IsSystemAdmin)
		c.Set("force_reset_password", user.ForceResetPassword)
		c.Next()
	}
}

func ForceResetMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		forceReset, exists := c.Get("force_reset_password")
		if exists && forceReset.(bool) {
			if !strings.HasPrefix(c.Request.URL.Path, "/api/auth/reset-password") {
				c.JSON(http.StatusForbidden, gin.H{"error": "กรุณาเปลี่ยนรหัสผ่านก่อนใช้งาน"})
				c.Abort()
				return
			}
		}
		c.Next()
	}
}

func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		isAdmin, exists := c.Get("is_system_admin")
		if !exists || !isAdmin.(bool) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
			c.Abort()
			return
		}
		c.Next()
	}
}
