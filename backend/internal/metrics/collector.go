package metrics

import (
	"runtime"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Collector struct {
	pool      *pgxpool.Pool
	startTime time.Time
}

func NewCollector(pool *pgxpool.Pool) *Collector {
	return &Collector{pool: pool, startTime: time.Now()}
}

func (c *Collector) Collect() *MetricsSnapshot {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	snap := &MetricsSnapshot{
		GoRoutines:    runtime.NumGoroutine(),
		MemoryAlloc:   m.Alloc,
		MemorySys:     m.Sys,
		HeapAlloc:     m.HeapAlloc,
		HeapSys:       m.HeapSys,
		HeapObjects:   m.HeapObjects,
		GCCycles:      m.NumGC,
		GCPauseTotal:  m.PauseTotalNs,
		NumCPU:        runtime.NumCPU(),
		UptimeSeconds: time.Since(c.startTime).Seconds(),
		CollectedAt:   time.Now().UTC(),
	}

	if c.pool != nil {
		stat := c.pool.Stat()
		snap.DBPool = &DBPoolStats{
			TotalConns:    stat.TotalConns(),
			IdleConns:     stat.IdleConns(),
			AcquiredConns: stat.AcquiredConns(),
			MaxConns:      stat.MaxConns(),
		}
	}

	return snap
}
