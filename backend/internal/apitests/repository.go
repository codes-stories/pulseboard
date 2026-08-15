package apitests

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) available() error {
	if r == nil || r.db == nil {
		return ErrStoreUnavailable
	}
	return nil
}

const apiTestColumns = `id, user_id, name, method, url, headers, body, response_status, response_body, response_time_ms, created_at, updated_at`

func (r *Repository) Create(ctx context.Context, test *APITest) error {
	if err := r.available(); err != nil {
		return err
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO api_tests (`+apiTestColumns+`)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`, test.ID, test.UserID, test.Name, test.Method, test.URL, test.Headers,
		test.Body, test.ResponseStatus, test.ResponseBody, test.ResponseTimeMS,
		test.CreatedAt, test.UpdatedAt)
	return err
}

func (r *Repository) List(ctx context.Context, userID string) ([]APITest, error) {
	if err := r.available(); err != nil {
		return nil, err
	}

	rows, err := r.db.Query(ctx, `
		SELECT `+apiTestColumns+`
		FROM api_tests
		WHERE user_id = $1
		ORDER BY updated_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tests := make([]APITest, 0)
	for rows.Next() {
		test, err := scanAPITest(rows)
		if err != nil {
			return nil, err
		}
		tests = append(tests, *test)
	}
	return tests, rows.Err()
}

func (r *Repository) Get(ctx context.Context, id, userID string) (*APITest, error) {
	if err := r.available(); err != nil {
		return nil, err
	}

	row := r.db.QueryRow(ctx, `
		SELECT `+apiTestColumns+`
		FROM api_tests
		WHERE id = $1 AND user_id = $2
	`, id, userID)

	return scanAPITest(row)
}

func (r *Repository) Update(ctx context.Context, test *APITest) error {
	if err := r.available(); err != nil {
		return err
	}

	result, err := r.db.Exec(ctx, `
		UPDATE api_tests
		SET name = $3,
			method = $4,
			url = $5,
			headers = $6,
			body = $7,
			response_status = $8,
			response_body = $9,
			response_time_ms = $10,
			updated_at = now()
		WHERE id = $1 AND user_id = $2
	`, test.ID, test.UserID, test.Name, test.Method, test.URL, test.Headers,
		test.Body, test.ResponseStatus, test.ResponseBody, test.ResponseTimeMS)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrTestNotFound
	}
	return nil
}

func (r *Repository) Delete(ctx context.Context, id, userID string) error {
	if err := r.available(); err != nil {
		return err
	}

	result, err := r.db.Exec(ctx, `
		DELETE FROM api_tests
		WHERE id = $1 AND user_id = $2
	`, id, userID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrTestNotFound
	}
	return nil
}

func scanAPITest(row pgx.Row) (*APITest, error) {
	var test APITest
	var headers []byte
	if err := row.Scan(
		&test.ID, &test.UserID, &test.Name, &test.Method, &test.URL,
		&headers, &test.Body, &test.ResponseStatus, &test.ResponseBody,
		&test.ResponseTimeMS, &test.CreatedAt, &test.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTestNotFound
		}
		return nil, err
	}
	test.Headers = headers
	return &test, nil
}
