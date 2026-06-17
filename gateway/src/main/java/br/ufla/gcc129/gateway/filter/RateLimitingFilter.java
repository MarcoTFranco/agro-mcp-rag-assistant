package br.ufla.gcc129.gateway.filter;

import com.google.common.cache.CacheBuilder;
import com.google.common.cache.LoadingCache;
import io.github.resilience4j.ratelimiter.RateLimiter;
import io.github.resilience4j.ratelimiter.RateLimiterConfig;
import io.github.resilience4j.ratelimiter.RateLimiterRegistry;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private final RateLimiterRegistry rateLimiterRegistry;
    private final LoadingCache<String, RateLimiter> rateLimiters;

    @Value("${gateway.rate-limit.requests-per-second:10}")
    private int requestsPerSecond;

    public RateLimitingFilter(RateLimiterRegistry rateLimiterRegistry) {
        this.rateLimiterRegistry = rateLimiterRegistry;
        this.rateLimiters = CacheBuilder.newBuilder()
                .expireAfterAccess(1, TimeUnit.HOURS)
                .build(new com.google.common.cache.CacheLoader<String, RateLimiter>() {
                    @Override
                    public RateLimiter load(String clientIp) {
                        RateLimiterConfig config = RateLimiterConfig.custom()
                                .limitRefreshPeriod(Duration.ofSeconds(1))
                                .limitForPeriod(requestsPerSecond)
                                .timeoutDuration(Duration.ofMillis(0))
                                .build();

                        return rateLimiterRegistry.rateLimiter("ip-" + clientIp, config);
                    }
                });
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String clientIp = extractClientIp(request);
        RateLimiter rateLimiter = rateLimiters.getUnchecked(clientIp);

        if (rateLimiter.acquirePermission()) {
            filterChain.doFilter(request, response);
        } else {
            log.warn("Rate limit exceeded for IP: {}", clientIp);
            response.setStatus(429); // Too Many Requests
            response.setHeader("Retry-After", "1");
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"Rate limit exceeded. Max " + requestsPerSecond + " requests per second.\"}");
        }
    }

    private String extractClientIp(HttpServletRequest request) {
        // Check for X-Forwarded-For header (when behind a proxy)
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isEmpty()) {
            // X-Forwarded-For can contain multiple IPs, take the first one
            return forwardedFor.split(",")[0].trim();
        }

        // Check for X-Real-IP header
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isEmpty()) {
            return realIp;
        }

        // Fall back to direct client IP
        return request.getRemoteAddr();
    }
}
