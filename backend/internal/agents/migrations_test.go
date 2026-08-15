package agents

import "testing"

const sampleMigration = `-- +goose Up
CREATE TABLE foo (id text PRIMARY KEY);
CREATE INDEX idx ON foo (id);

-- +goose Down
DROP TABLE IF EXISTS foo;
`

func TestMigrationSectionExtractsUpAndDown(t *testing.T) {
	up := migrationSection(sampleMigration, true)
	if up != "CREATE TABLE foo (id text PRIMARY KEY);\nCREATE INDEX idx ON foo (id);" {
		t.Fatalf("unexpected up section: %q", up)
	}

	down := migrationSection(sampleMigration, false)
	if down != "DROP TABLE IF EXISTS foo;" {
		t.Fatalf("unexpected down section: %q", down)
	}
}

func TestMigrationSectionNoMarkers(t *testing.T) {
	if section := migrationSection("-- plain comment\nSELECT 1;", true); section != "" {
		t.Fatalf("expected empty section without goose markers, got %q", section)
	}
}
