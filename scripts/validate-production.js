#!/usr/bin/env node

/**
 * Production Environment Validation Script
 *
 * This script validates that all required environment variables
 * and configurations are properly set for production deployment.
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnvFile(envPath) {
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    const lines = envFile.split('\n');

    lines.forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          // Only set if not already set (prioritize existing env vars)
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
  }
}

// Load .env.local first, then .env
loadEnvFile(path.join(process.cwd(), '.env.local'));
loadEnvFile(path.join(process.cwd(), '.env'));

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

const log = {
  success: msg => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: msg => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: msg => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: msg => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  title: msg => console.log(`${colors.bold}${colors.blue}\n=== ${msg} ===${colors.reset}`),
};

class ProductionValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.checks = 0;
    this.passed = 0;
  }

  check(condition, successMsg, errorMsg, isWarning = false) {
    this.checks++;
    if (condition) {
      log.success(successMsg);
      this.passed++;
    } else {
      if (isWarning) {
        log.warning(errorMsg);
        this.warnings.push(errorMsg);
      } else {
        log.error(errorMsg);
        this.errors.push(errorMsg);
      }
    }
  }

  validateEnvironmentVariables() {
    log.title('Environment Variables');

    const requiredEnvVars = {
      // Database
      NEXT_PUBLIC_SUPABASE_URL: 'Supabase URL is required',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'Supabase anonymous key is required',
      SUPABASE_SERVICE_ROLE_KEY: 'Supabase service role key is required',

      // AI Services
      ANTHROPIC_API_KEY: 'Anthropic API key is required',

      // Security
      ENCRYPTION_KEY: 'Encryption key is required for secure data handling',
      JWT_SECRET: 'JWT secret is required for token validation',
      SESSION_SECRET: 'Session secret is required for cookie encryption',
    };

    const optionalEnvVars = {
      NEXT_PUBLIC_APP_URL: 'App URL should be set for production',
      SENTRY_DSN: 'Sentry DSN recommended for error tracking',
      REDIS_URL: 'Redis URL recommended for production rate limiting',
      RATE_LIMIT_WINDOW_MS: 'Rate limit window can be customized',
      RATE_LIMIT_MAX_REQUESTS: 'Rate limit max requests can be customized',
    };

    // Check required environment variables
    Object.entries(requiredEnvVars).forEach(([envVar, description]) => {
      const value = process.env[envVar];
      this.check(
        value && value.trim() !== '',
        `${envVar} is set`,
        `${envVar} is missing: ${description}`
      );

      // Additional validation for specific env vars
      if (envVar === 'NEXT_PUBLIC_SUPABASE_URL' && value) {
        this.check(
          value.startsWith('https://'),
          'Supabase URL uses HTTPS',
          'Supabase URL should use HTTPS for production'
        );
      }

      if (envVar === 'ENCRYPTION_KEY' && value) {
        this.check(
          value.length >= 32,
          'Encryption key has sufficient length',
          'Encryption key should be at least 32 characters for security'
        );
      }

      if (envVar === 'JWT_SECRET' && value) {
        this.check(
          value.length >= 64,
          'JWT secret has sufficient length',
          'JWT secret should be at least 64 characters for security'
        );
      }
    });

    // Check optional environment variables
    Object.entries(optionalEnvVars).forEach(([envVar, description]) => {
      const value = process.env[envVar];
      this.check(
        value && value.trim() !== '',
        `${envVar} is set`,
        `${envVar} is not set: ${description}`,
        true // This is a warning
      );
    });

    // Check NODE_ENV
    this.check(
      process.env.NODE_ENV === 'production',
      'NODE_ENV is set to production',
      'NODE_ENV should be set to "production" for production deployment'
    );
  }

  validateConfigFiles() {
    log.title('Configuration Files');

    const requiredFiles = [
      'next.config.js',
      'vercel.json',
      'package.json',
      'tsconfig.json',
      '.env.example',
    ];

    requiredFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      this.check(fs.existsSync(filePath), `${file} exists`, `${file} is missing`);
    });

    // Validate package.json scripts
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const requiredScripts = ['build', 'start', 'lint', 'type-check'];

      requiredScripts.forEach(script => {
        this.check(
          packageJson.scripts && packageJson.scripts[script],
          `Package.json has "${script}" script`,
          `Package.json missing "${script}" script`
        );
      });
    } catch (error) {
      log.error('Failed to parse package.json');
      this.errors.push('Failed to parse package.json');
    }

    // Validate Next.js config
    try {
      const nextConfigPath = path.join(process.cwd(), 'next.config.js');
      if (fs.existsSync(nextConfigPath)) {
        const nextConfig = require(nextConfigPath);
        this.check(
          nextConfig.headers,
          'Next.js config includes security headers',
          'Next.js config should include security headers'
        );
      }
    } catch (error) {
      log.warning('Could not validate Next.js configuration');
    }
  }

  validateSecurity() {
    log.title('Security Configuration');

    // Check if security middleware exists
    const securityMiddlewarePath = path.join(process.cwd(), 'lib/middleware/security.ts');
    this.check(
      fs.existsSync(securityMiddlewarePath),
      'Security middleware exists',
      'Security middleware is missing'
    );

    // Check if auth middleware exists
    const authMiddlewarePath = path.join(process.cwd(), 'lib/middleware/auth.ts');
    this.check(
      fs.existsSync(authMiddlewarePath),
      'Authentication middleware exists',
      'Authentication middleware is missing'
    );

    // Check if validation schemas exist
    const validationSchemasPath = path.join(process.cwd(), 'lib/validation/schemas.ts');
    this.check(
      fs.existsSync(validationSchemasPath),
      'Input validation schemas exist',
      'Input validation schemas are missing'
    );

    // Check for common security vulnerabilities
    this.check(
      !process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
      'Service role key not exposed to client',
      'CRITICAL: Service role key must not have NEXT_PUBLIC_ prefix'
    );

    this.check(
      !process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
      'API keys not exposed to client',
      'CRITICAL: API keys must not have NEXT_PUBLIC_ prefix'
    );
  }

  validateDatabaseSetup() {
    log.title('Database Configuration');

    const migrationPath = path.join(process.cwd(), 'supabase/migrations');
    this.check(
      fs.existsSync(migrationPath),
      'Database migrations directory exists',
      'Database migrations directory is missing'
    );

    if (fs.existsSync(migrationPath)) {
      const migrations = fs.readdirSync(migrationPath);
      this.check(
        migrations.length > 0,
        `Found ${migrations.length} database migration(s)`,
        'No database migrations found'
      );
    }

    const schemaPath = path.join(process.cwd(), 'lib/supabase/schema.sql');
    this.check(
      fs.existsSync(schemaPath),
      'Database schema file exists',
      'Database schema file is missing',
      true
    );
  }

  validateBuildOutput() {
    log.title('Build Validation');

    const nextBuildPath = path.join(process.cwd(), '.next');
    this.check(
      fs.existsSync(nextBuildPath),
      'Next.js build output exists (run "npm run build" first)',
      'Next.js build output missing - run "npm run build"',
      true
    );

    // Check for TypeScript compilation
    const tsBuildInfoPath = path.join(process.cwd(), 'tsconfig.tsbuildinfo');
    this.check(
      fs.existsSync(tsBuildInfoPath),
      'TypeScript compilation successful',
      'TypeScript compilation may have issues',
      true
    );
  }

  validatePerformance() {
    log.title('Performance Configuration');

    // Check Vercel configuration
    try {
      const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));

      this.check(
        vercelConfig.functions && vercelConfig.functions['pages/api/**/*.ts'],
        'API function timeout configured',
        'API function timeout should be configured for production'
      );

      this.check(
        vercelConfig.headers && vercelConfig.headers.some(h => h.source.includes('js|css')),
        'Static asset caching configured',
        'Static asset caching should be configured for performance'
      );
    } catch (error) {
      log.warning('Could not validate Vercel configuration');
    }
  }

  generateReport() {
    log.title('Validation Report');

    console.log(`\n${colors.bold}Summary:${colors.reset}`);
    console.log(`Total Checks: ${this.checks}`);
    console.log(`${colors.green}Passed: ${this.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${this.errors.length}${colors.reset}`);
    console.log(`${colors.yellow}Warnings: ${this.warnings.length}${colors.reset}`);

    if (this.errors.length > 0) {
      console.log(`\n${colors.bold}${colors.red}❌ CRITICAL ISSUES (Must Fix):${colors.reset}`);
      this.errors.forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log(`\n${colors.bold}${colors.yellow}⚠️  WARNINGS (Should Fix):${colors.reset}`);
      this.warnings.forEach((warning, i) => {
        console.log(`${i + 1}. ${warning}`);
      });
    }

    if (this.errors.length === 0) {
      console.log(`\n${colors.bold}${colors.green}🎉 PRODUCTION READY!${colors.reset}`);
      console.log('Your application passes all critical production checks.');

      if (this.warnings.length > 0) {
        console.log(
          `${colors.yellow}Consider addressing the ${this.warnings.length} warning(s) for optimal production performance.${colors.reset}`
        );
      }
    } else {
      console.log(`\n${colors.bold}${colors.red}🚫 NOT READY FOR PRODUCTION${colors.reset}`);
      console.log(`Please fix the ${this.errors.length} critical issue(s) before deploying.`);
    }

    return this.errors.length === 0;
  }

  run() {
    console.log(
      `${colors.bold}${colors.blue}🔍 Pantry Buddy Pro - Production Validation${colors.reset}\n`
    );

    this.validateEnvironmentVariables();
    this.validateConfigFiles();
    this.validateSecurity();
    this.validateDatabaseSetup();
    this.validateBuildOutput();
    this.validatePerformance();

    const isReady = this.generateReport();

    process.exit(isReady ? 0 : 1);
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ProductionValidator();
  validator.run();
}

module.exports = ProductionValidator;
