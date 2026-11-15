export const ALGORITHM_OPERATIONS: Record<string, string[]> = {
  RSA: ['encrypt', 'decrypt', 'sign', 'verify', 'key_generation'],
  'AES-128': ['encrypt', 'decrypt'],
  'AES-256': ['encrypt', 'decrypt'],
  DES: ['encrypt', 'decrypt'],
  '3DES': ['encrypt', 'decrypt'],
  'MD5': ['hash'],
  'SHA-1': ['hash'],
  'SHA-256': ['hash'],
  'SHA-384': ['hash'],
  'SHA-512': ['hash'],
  ECDSA: ['sign', 'verify', 'key_generation'],
  ECDH: ['key_exchange'],
  'ChaCha20': ['encrypt', 'decrypt'],
  'Poly1305': ['mac'],
  'HMAC': ['mac'],
  'PBKDF2': ['key_derivation'],
  'bcrypt': ['key_derivation'],
  'scrypt': ['key_derivation'],
  'Argon2': ['key_derivation'],
  'DSA': ['sign', 'verify'],
  'DH': ['key_exchange'],
  'RC4': ['encrypt', 'decrypt'],
  'Blowfish': ['encrypt', 'decrypt'],
  'ML-KEM': ['key_encapsulation'],
  'ML-DSA': ['sign', 'verify'],
  'SLH-DSA': ['sign', 'verify'],
};

export const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
  INFO: '#3b82f6',
};

export const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  accepted: 'Accepted Risk',
  mitigated: 'Mitigated',
  false_positive: 'False Positive',
  pending: 'Pending',
  scanning: 'Scanning',
  completed: 'Completed',
  failed: 'Failed',
  draft: 'Draft',
  in_progress: 'In Progress',
  passed: 'Passed',
  skipped: 'Skipped',
};

export const NIST_STANDARDS = [
  {
    id: 'FIPS-203',
    title: 'FIPS 203 — ML-KEM',
    description: 'Module-Lattice-Based Key-Encapsulation Mechanism Standard',
    replaces: ['RSA key exchange', 'ECDH', 'DH'],
    algorithms: ['ML-KEM-512', 'ML-KEM-768', 'ML-KEM-1024'],
    published: '2024-08-13',
    status: 'final',
    quantum_safe: true,
  },
  {
    id: 'FIPS-204',
    title: 'FIPS 204 — ML-DSA',
    description: 'Module-Lattice-Based Digital Signature Standard',
    replaces: ['RSA signatures', 'ECDSA', 'DSA'],
    algorithms: ['ML-DSA-44', 'ML-DSA-65', 'ML-DSA-87'],
    published: '2024-08-13',
    status: 'final',
    quantum_safe: true,
  },
  {
    id: 'FIPS-205',
    title: 'FIPS 205 — SLH-DSA',
    description: 'Stateless Hash-Based Digital Signature Standard',
    replaces: ['RSA signatures', 'ECDSA', 'DSA'],
    algorithms: ['SLH-DSA-SHA2-128s', 'SLH-DSA-SHA2-192s', 'SLH-DSA-SHA2-256s'],
    published: '2024-08-13',
    status: 'final',
    quantum_safe: true,
  },
  {
    id: 'SP-800-131A',
    title: 'SP 800-131A Rev. 2',
    description: 'Transitioning the Use of Cryptographic Algorithms and Key Lengths',
    deprecated: ['SHA-1', 'RSA-1024', 'DES', '2TDEA', 'DSA-1024'],
    disallowed: ['MD5', 'RC4', 'DES', 'RC2'],
    published: '2019-03-21',
    status: 'active',
    quantum_safe: false,
  },
];

export const REPLACEMENT_CANDIDATES: Record<string, Array<{
  algorithm: string;
  security_level: string;
  key_size: string;
  performance: string;
  nist_status: string;
  quantum_safe: boolean;
  recommendation: string;
}>> = {
  RSA: [
    {
      algorithm: 'ML-KEM-768',
      security_level: 'AES-192 equivalent',
      key_size: '1184 bytes',
      performance: 'Fast',
      nist_status: 'FIPS 203 (Final)',
      quantum_safe: true,
      recommendation: 'Primary recommendation for key exchange',
    },
    {
      algorithm: 'ML-DSA-65',
      security_level: 'AES-192 equivalent',
      key_size: '1952 bytes',
      performance: 'Fast',
      nist_status: 'FIPS 204 (Final)',
      quantum_safe: true,
      recommendation: 'Primary recommendation for signatures',
    },
  ],
  ECDSA: [
    {
      algorithm: 'ML-DSA-65',
      security_level: 'AES-192 equivalent',
      key_size: '1952 bytes',
      performance: 'Fast',
      nist_status: 'FIPS 204 (Final)',
      quantum_safe: true,
      recommendation: 'Drop-in replacement for ECDSA',
    },
    {
      algorithm: 'SLH-DSA-SHA2-192s',
      security_level: 'AES-192 equivalent',
      key_size: '48 bytes',
      performance: 'Slow (signing)',
      nist_status: 'FIPS 205 (Final)',
      quantum_safe: true,
      recommendation: 'Conservative choice, hash-based',
    },
  ],
  'SHA-1': [
    {
      algorithm: 'SHA-256',
      security_level: '128-bit',
      key_size: '256-bit output',
      performance: 'Very Fast',
      nist_status: 'FIPS 180-4 (Approved)',
      quantum_safe: false,
      recommendation: 'Immediate replacement',
    },
    {
      algorithm: 'SHA-3-256',
      security_level: '128-bit',
      key_size: '256-bit output',
      performance: 'Fast',
      nist_status: 'FIPS 202 (Final)',
      quantum_safe: false,
      recommendation: 'Modern alternative',
    },
  ],
  MD5: [
    {
      algorithm: 'SHA-256',
      security_level: '128-bit',
      key_size: '256-bit output',
      performance: 'Very Fast',
      nist_status: 'FIPS 180-4 (Approved)',
      quantum_safe: false,
      recommendation: 'Immediate replacement',
    },
  ],
  DES: [
    {
      algorithm: 'AES-256',
      security_level: '256-bit',
      key_size: '256-bit',
      performance: 'Very Fast (hardware)',
      nist_status: 'FIPS 197 (Approved)',
      quantum_safe: false,
      recommendation: 'Immediate replacement',
    },
  ],
  'AES-128': [
    {
      algorithm: 'AES-256',
      security_level: '256-bit',
      key_size: '256-bit',
      performance: 'Very Fast',
      nist_status: 'FIPS 197 (Approved)',
      quantum_safe: false,
      recommendation: 'Upgrade key size for post-quantum resistance',
    },
  ],
  ECDH: [
    {
      algorithm: 'ML-KEM-768',
      security_level: 'AES-192 equivalent',
      key_size: '1184 bytes',
      performance: 'Fast',
      nist_status: 'FIPS 203 (Final)',
      quantum_safe: true,
      recommendation: 'Primary post-quantum KEM',
    },
  ],
};
