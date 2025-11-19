package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	_ "github.com/lib/pq"
)

type ProcessingMessage struct {
	PhotoID      string    `json:"photoId"`
	PhotoKey     string    `json:"photoKey"`
	Location     *Location `json:"location"`
	DetectedText string    `json:"detectedText"`
	Timestamp    string    `json:"timestamp"`
}

type Location struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type Deal struct {
	ID           string     `json:"id"`
	PhotoID      string     `json:"photoId"`
	BusinessName string     `json:"businessName"`
	DealText     string     `json:"dealText"`
	Price        float64    `json:"price"`
	ExpiresAt    *time.Time `json:"expiresAt"`
	Latitude     float64    `json:"latitude"`
	Longitude    float64    `json:"longitude"`
	Timestamp    string     `json:"timestamp"`
}

var db *sql.DB

func init() {
	var err error
	dbURL := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=require",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_NAME"))

	db, err = sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
}

func handler(ctx context.Context, sqsEvent events.SQSEvent) error {
	for _, record := range sqsEvent.Records {
		var msg ProcessingMessage
		if err := json.Unmarshal([]byte(record.Body), &msg); err != nil {
			log.Printf("Error unmarshaling message: %v", err)
			continue
		}

		deal := processDeal(msg)
		if err := saveDeal(deal); err != nil {
			log.Printf("Error saving deal: %v", err)
			continue
		}

		log.Printf("Successfully processed deal for photo %s", msg.PhotoID)
	}

	return nil
}

func processDeal(msg ProcessingMessage) Deal {
	deal := Deal{
		PhotoID:   msg.PhotoID,
		Timestamp: msg.Timestamp,
	}

	if msg.Location != nil {
		deal.Latitude = msg.Location.Latitude
		deal.Longitude = msg.Location.Longitude
	}

	text := strings.ToLower(msg.DetectedText)
	
	// Extract price
	priceRegex := regexp.MustCompile(`\$(\d+(?:\.\d{2})?)`)
	if matches := priceRegex.FindStringSubmatch(text); len(matches) > 1 {
		if price, err := strconv.ParseFloat(matches[1], 64); err == nil {
			deal.Price = price
		}
	}

	// Extract business name
	businessRegex := regexp.MustCompile(`([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)`)
	if matches := businessRegex.FindStringSubmatch(msg.DetectedText); len(matches) > 1 {
		deal.BusinessName = matches[1]
	}

	// Extract expiration date
	deal.ExpiresAt = extractExpirationDate(msg.DetectedText)

	deal.DealText = msg.DetectedText
	return deal
}

func extractExpirationDate(text string) *time.Time {
	// Common expiration patterns
	patterns := []string{
		// "expires 12/31/2024", "exp 12/31/24"
		`(?i)exp(?:ires?)?\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})`,
		// "valid until 12/31/2024"
		`(?i)valid\s+until\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})`,
		// "good through 12/31/2024"
		`(?i)good\s+through\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})`,
		// "offer ends 12/31/2024"
		`(?i)(?:offer\s+)?ends?\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})`,
		// Standalone date patterns
		`(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})`,
	}

	for _, pattern := range patterns {
		regex := regexp.MustCompile(pattern)
		if matches := regex.FindStringSubmatch(text); len(matches) > 1 {
			dateStr := matches[1]
			
			// Try different date formats
			formats := []string{
				"1/2/2006",
				"01/02/2006",
				"1/2/06",
				"01/02/06",
				"1-2-2006",
				"01-02-2006",
				"1-2-06",
				"01-02-06",
			}

			for _, format := range formats {
				if parsedTime, err := time.Parse(format, dateStr); err == nil {
					// If year is 2-digit and < 50, assume 20xx, else 19xx
					if parsedTime.Year() < 1950 {
						parsedTime = parsedTime.AddDate(100, 0, 0)
					}
					return &parsedTime
				}
			}
		}
	}

	return nil
}

func saveDeal(deal Deal) error {
	query := `
		INSERT INTO deals (photo_id, business_name, deal_text, price, expires_at, latitude, longitude, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id`

	var id string
	err := db.QueryRow(query,
		deal.PhotoID,
		deal.BusinessName,
		deal.DealText,
		deal.Price,
		deal.ExpiresAt,
		deal.Latitude,
		deal.Longitude,
		deal.Timestamp,
	).Scan(&id)

	if err != nil {
		return fmt.Errorf("failed to insert deal: %w", err)
	}

	deal.ID = id
	return nil
}

func main() {
	lambda.Start(handler)
}
