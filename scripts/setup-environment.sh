#!/bin/bash

# Pantry Buddy Pro - Environment Setup Script
# This script helps you configure your environment variables step by step

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

generate_secret() {
    openssl rand -base64 $1 2>/dev/null || python3 -c "import secrets; print(secrets.token_urlsafe($1))" 2>/dev/null || node -e "console.log(require('crypto').randomBytes($1).toString('base64'))"
}

# Main setup function
main() {
    echo -e "${BLUE}🚀 Pantry Buddy Pro - Environment Setup${NC}"
    echo "This script will help you configure your environment variables."
    echo ""
    
    # Check if .env.local already exists
    if [ -f ".env.local" ]; then
        print_warning ".env.local already exists!"
        read -p "Do you want to overwrite it? (y/N): " overwrite
        if [[ ! $overwrite =~ ^[Yy]$ ]]; then
            print_warning "Setup cancelled. You can manually edit .env.local"
            exit 0
        fi
    fi

    # Create .env.local from template
    if [ ! -f ".env.example" ]; then
        print_error ".env.example not found. Make sure you're in the project root directory."
        exit 1
    fi

    cp .env.example .env.local
    print_success "Created .env.local from template"

    print_header "Required Configuration"
    echo "We need to set up the required environment variables."
    echo "You can skip optional ones and set them later."
    echo ""

    # Supabase Configuration
    print_header "1. Supabase Database Setup"
    echo "First, you need a Supabase project. If you don't have one:"
    echo "1. Go to https://supabase.com"
    echo "2. Create a new project"
    echo "3. Go to Settings > API to find your keys"
    echo ""

    read -p "Enter your Supabase URL (https://your-project.supabase.co): " supabase_url
    if [[ $supabase_url =~ ^https:// ]]; then
        sed -i.bak "s|https://your-project.supabase.co|$supabase_url|g" .env.local
        print_success "Supabase URL configured"
    else
        print_error "Invalid Supabase URL. Please enter a valid HTTPS URL."
        return 1
    fi

    read -p "Enter your Supabase Anonymous Key: " supabase_anon_key
    if [ ! -z "$supabase_anon_key" ]; then
        sed -i.bak "s|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...|$supabase_anon_key|g" .env.local
        print_success "Supabase Anonymous Key configured"
    fi

    read -p "Enter your Supabase Service Role Key: " supabase_service_key
    if [ ! -z "$supabase_service_key" ]; then
        sed -i.bak "s|your-service-role-key-here|$supabase_service_key|g" .env.local
        print_success "Supabase Service Role Key configured"
    fi

    # Anthropic API Key
    print_header "2. AI Service Setup (Anthropic)"
    echo "You need an Anthropic API key for recipe generation:"
    echo "1. Go to https://console.anthropic.com"
    echo "2. Create an account and get your API key"
    echo ""

    read -p "Enter your Anthropic API Key (sk-ant-api03-...): " anthropic_key
    if [[ $anthropic_key =~ ^sk-ant- ]]; then
        sed -i.bak "s|sk-ant-api03-...|$anthropic_key|g" .env.local
        print_success "Anthropic API Key configured"
    else
        print_warning "API key format looks unusual. Make sure it's correct."
        if [ ! -z "$anthropic_key" ]; then
            sed -i.bak "s|sk-ant-api03-...|$anthropic_key|g" .env.local
        fi
    fi

    # Generate Security Keys
    print_header "3. Security Keys Generation"
    echo "Generating secure random keys for encryption and authentication..."

    # Generate encryption key
    encryption_key=$(generate_secret 32)
    sed -i.bak "s|your-32-character-encryption-key|$encryption_key|g" .env.local
    print_success "Generated ENCRYPTION_KEY"

    # Generate JWT secret
    jwt_secret=$(generate_secret 64)
    sed -i.bak "s|your-jwt-secret-here|$jwt_secret|g" .env.local
    print_success "Generated JWT_SECRET"

    # Generate session secret
    session_secret=$(generate_secret 32)
    sed -i.bak "s|your-session-secret-here|$session_secret|g" .env.local
    print_success "Generated SESSION_SECRET"

    # Environment Configuration
    print_header "4. Environment Configuration"
    echo "Configuring for local development..."

    # Set NODE_ENV to development for local
    sed -i.bak "s|NODE_ENV=development|NODE_ENV=development|g" .env.local
    print_success "Set NODE_ENV to development"

    # Optional Configuration
    print_header "5. Optional Configuration"
    echo "The following are optional but recommended for production:"
    echo ""

    read -p "Enter your app URL (default: http://localhost:3000): " app_url
    app_url=${app_url:-http://localhost:3000}
    sed -i.bak "s|http://localhost:3000|$app_url|g" .env.local
    print_success "App URL configured: $app_url"

    # Monitoring (optional)
    read -p "Enter Sentry DSN for error tracking (optional, press Enter to skip): " sentry_dsn
    if [ ! -z "$sentry_dsn" ]; then
        echo "SENTRY_DSN=$sentry_dsn" >> .env.local
        print_success "Sentry DSN configured"
    fi

    read -p "Enter Redis URL for production caching (optional, press Enter to skip): " redis_url
    if [ ! -z "$redis_url" ]; then
        echo "REDIS_URL=$redis_url" >> .env.local
        print_success "Redis URL configured"
    fi

    # Clean up backup files
    rm -f .env.local.bak

    print_header "Setup Complete!"
    print_success "Environment configuration completed successfully!"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Review your .env.local file and adjust any values if needed"
    echo "2. Set up your Supabase database by running the migrations"
    echo "3. Test your configuration with: npm run validate:prod"
    echo "4. Start development with: npm run dev"
    echo ""
    echo -e "${YELLOW}Security Reminders:${NC}"
    echo "• NEVER commit .env.local to version control"
    echo "• Use different keys for production deployment"
    echo "• Store production secrets in your hosting platform's secret manager"
    echo ""
    
    print_success "Your Pantry Buddy Pro is ready for development! 🎉"
}

# Check if running from correct directory
if [ ! -f "package.json" ] || ! grep -q "pantry-buddy" package.json; then
    print_error "Please run this script from the Pantry Buddy Pro project root directory"
    exit 1
fi

# Run main setup
main