/*
@copyright: 2026 PulseBoard Inc.
@author: Gaurav Kumar
@description: Middleware for blocking IP addresses based on a configurable blocklist. This middleware checks incoming requests against a list of blocked IPs and denies access if a match is found. The blocklist can be managed through the admin interface, allowing administrators to add or remove IP addresses as needed.
*/

package auth

import (
	"net/http"
)


// Only allowed the IPs in the blocklist will be blocked, all other IPs will be allowed
func (s *Service) IPBlockMiddleware(next http.Handler) http.Handler {
	
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr
		if s.isIPBlocked(ip) {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}