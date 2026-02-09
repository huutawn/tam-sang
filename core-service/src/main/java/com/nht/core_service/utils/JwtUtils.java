package com.nht.core_service.utils;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import com.nht.core_service.exception.AppException;
import com.nht.core_service.exception.ErrorCode;

import lombok.extern.slf4j.Slf4j;

/**
 * Utility class for JWT token operations
 */
@Component
@Slf4j
public class JwtUtils {

    /**
     * Extract the subject (email) from the current JWT token in the security context
     * 
     * @return the subject/email from the token
     * @throws AppException if no authentication is found or token is invalid
     */
    public static String getSubjectFromToken() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            log.error("No authentication found in security context");
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        Object principal = authentication.getPrincipal();
        
        if (!(principal instanceof Jwt)) {
            log.error("Principal is not a JWT token");
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        Jwt jwt = (Jwt) principal;
        String subject = jwt.getSubject();
        
        if (subject == null || subject.isEmpty()) {
            log.error("Subject not found in JWT token");
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        log.debug("Extracted subject from token: {}", subject);
        return subject;
    }

    /**
     * Extract the email from the current JWT token in the security context
     * This is an alias for getSubjectFromToken() as the subject typically contains the email
     * 
     * @return the email from the token
     * @throws AppException if no authentication is found or token is invalid
     */
    public static String getEmailFromToken() {
        return getSubjectFromToken();
    }

    /**
     * Extract a specific claim from the current JWT token
     * 
     * @param claimName the name of the claim to extract
     * @return the claim value as a String, or null if not found
     * @throws AppException if no authentication is found or token is invalid
     */
    public static String getClaimFromToken(String claimName) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            log.error("No authentication found in security context");
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        Object principal = authentication.getPrincipal();
        
        if (!(principal instanceof Jwt)) {
            log.error("Principal is not a JWT token");
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        Jwt jwt = (Jwt) principal;
        Object claim = jwt.getClaim(claimName);
        
        return claim != null ? claim.toString() : null;
    }

    /**
     * Get the user ID from the current JWT token
     * 
     * @return the user ID from the token
     * @throws AppException if no authentication is found or token is invalid
     */
    public static String getUserIdFromToken() {
        String userId = getClaimFromToken("user_id");
        
        if (userId == null || userId.isEmpty()) {
            log.error("User ID not found in JWT token");
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        
        return userId;
    }
}
