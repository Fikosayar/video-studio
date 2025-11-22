import { SecurityError } from "../types";

// A small subset of common disposable email domains for demonstration
// In a real production app, this would be a much larger list or an API call
const BLOCKED_DOMAINS = [
  'temp-mail.org',
  '10minutemail.com',
  'yopmail.com',
  'mailinator.com',
  'guerrillamail.com',
  'sharklasers.com',
  'getnada.com',
  'dispostable.com',
  'throwawaymail.com',
  'tempmail.net'
];

// Mock CSRF Token Storage
const CSRF_STORAGE_KEY = 'x-csrf-token';

export const SecurityService = {
  /**
   * Generates a cryptographically strong pseudo-random token
   * Simulates a server issuing a CSRF token on initial page load
   */
  generateCsrfToken: (): string => {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem(CSRF_STORAGE_KEY, token);
    return token;
  },

  /**
   * Validates if the operation carries the correct token
   */
  validateCsrfToken: (): boolean => {
    const token = sessionStorage.getItem(CSRF_STORAGE_KEY);
    // In a real scenario, we would check if the request header matches this token
    // Here we just ensure a session exists to prevent cross-site scripting from stateless contexts
    return !!token;
  },

  /**
   * Checks if an email belongs to a disposable provider
   */
  validateEmailDomain: (email: string): boolean => {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return false;
    
    if (BLOCKED_DOMAINS.includes(domain)) {
      throw new SecurityError(`Access denied. The domain @${domain} is flagged as a temporary email provider.`);
    }
    return true;
  },

  /**
   * Sanitizes inputs to prevent basic XSS (simulated)
   */
  sanitizeInput: (input: string): string => {
    return input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
};