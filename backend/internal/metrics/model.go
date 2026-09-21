package metrics

import "time"

type SystemMetricsRecord struct {
	ID          string                 `json:"id"`
	AgentID     string                 `json:"agent_id"`
	Metrics     map[string]interface{} `json:"metrics"`
	CollectedAt time.Time              `json:"collected_at"`
	CreatedAt   time.Time              `json:"created_at"`
}

type MetricsSnapshot struct {
	GoRoutines    int          `json:"go_routines"`
	MemoryAlloc   uint64       `json:"memory_alloc_bytes"`
	MemorySys     uint64       `json:"memory_sys_bytes"`
	HeapAlloc     uint64       `json:"heap_alloc_bytes"`
	HeapSys       uint64       `json:"heap_sys_bytes"`
	HeapObjects   uint64       `json:"heap_objects"`
	GCCycles      uint32       `json:"gc_cycles"`
	GCPauseTotal  uint64       `json:"gc_pause_total_ns"`
	NumCPU        int          `json:"num_cpu"`
	UptimeSeconds float64      `json:"uptime_seconds"`
	DBPool        *DBPoolStats `json:"db_pool,omitempty"`
	CollectedAt   time.Time    `json:"collected_at"`
}

type DBPoolStats struct {
	TotalConns    int32 `json:"total_conns"`
	IdleConns     int32 `json:"idle_conns"`
	AcquiredConns int32 `json:"acquired_conns"`
	MaxConns      int32 `json:"max_conns"`
}

type SystemMetricsResponse struct {
	ID          string                 `json:"id"`
	AgentID     string                 `json:"agent_id"`
	Metrics     map[string]interface{} `json:"metrics"`
	CollectedAt time.Time              `json:"collected_at"`
	CreatedAt   time.Time              `json:"created_at"`
}

type SystemMetricsListResponse struct {
	Metrics []SystemMetricsResponse `json:"metrics"`
}
