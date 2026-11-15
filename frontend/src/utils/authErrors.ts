/**
 * Human-friendly Firebase & Authentication Error Formatter.
 * Strips raw Firebase SDK technical errors and presents clear, actionable guidance.
 */

export function formatAuthError(err: any): { title: string; message: string; isDomainError: boolean } {
  if (!err) {
    return { title: 'Authentication Error', message: 'An unexpected error occurred.', isDomainError: false };
  }

  const code: string = (err.code || '').toLowerCase();
  const rawMsg: string = (err.message || '').toLowerCase();

  // 1. Unauthorized Domain error (Vercel / custom domain not yet in Firebase whitelist)
  if (code.includes('unauthorized-domain') || rawMsg.includes('unauthorized-domain')) {
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'your-domain.vercel.app';
    return {
      title: 'Domain Authorization Required',
      message: `The domain "${currentHost}" has not been added to your Firebase Authorized Domains yet. You can bypass this instantly or whitelist it in Firebase Console.`,
      isDomainError: true,
    };
  }

  // 2. Invalid credentials or user not found
  if (
    code.includes('invalid-credential') ||
    code.includes('user-not-found') ||
    code.includes('wrong-password') ||
    rawMsg.includes('invalid-credential')
  ) {
    return {
      title: 'Invalid Credentials',
      message: 'The email address or password entered does not match our records. Please verify or use Quick Access.',
      isDomainError: false,
    };
  }

  // 3. Email already in use
  if (code.includes('email-already-in-use') || rawMsg.includes('email-already-in-use')) {
    return {
      title: 'Account Already Exists',
      message: 'An enterprise account with this email address already exists. Please sign in instead.',
      isDomainError: false,
    };
  }

  // 4. Weak password
  if (code.includes('weak-password') || rawMsg.includes('weak-password')) {
    return {
      title: 'Password Too Short',
      message: 'Password must be at least 6 characters long.',
      isDomainError: false,
    };
  }

  // 5. Invalid email format
  if (code.includes('invalid-email') || rawMsg.includes('invalid-email')) {
    return {
      title: 'Invalid Email Address',
      message: 'Please enter a valid corporate or personal email address (e.g. name@company.com).',
      isDomainError: false,
    };
  }

  // 6. Popup closed or blocked
  if (code.includes('popup-closed-by-user') || rawMsg.includes('popup-closed')) {
    return {
      title: 'Sign-In Cancelled',
      message: 'The Google authentication window was closed before completion.',
      isDomainError: false,
    };
  }

  if (code.includes('popup-blocked') || rawMsg.includes('popup-blocked')) {
    return {
      title: 'Popup Blocked',
      message: 'Your browser blocked the Google authentication popup. Please allow popups or use 1-Click Access.',
      isDomainError: false,
    };
  }

  // 7. Network issues
  if (code.includes('network-request-failed') || rawMsg.includes('network')) {
    return {
      title: 'Network Connection Issue',
      message: 'Unable to reach the authentication service. Please check your internet connection or use Instant Demo mode.',
      isDomainError: false,
    };
  }

  // 8. Rate limiting
  if (code.includes('too-many-requests') || rawMsg.includes('too-many-requests')) {
    return {
      title: 'Too Many Attempts',
      message: 'Access temporarily restricted due to repeated attempts. Please wait a minute or use Instant Demo mode.',
      isDomainError: false,
    };
  }

  // 9. Generic cleanup: Strip "Firebase: Error (...)."
  let cleaned = err.message || 'Authentication failed. Please try again.';
  cleaned = cleaned.replace(/^Firebase:\s*Error\s*\(([^)]+)\)\.?/i, '$1');
  cleaned = cleaned.replace(/^Firebase:\s*/i, '');
  cleaned = cleaned.replace(/auth\//i, '');
  cleaned = cleaned.replace(/-/g, ' ');

  // Capitalize first character
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  return {
    title: 'Authentication Error',
    message: cleaned,
    isDomainError: false,
  };
}
