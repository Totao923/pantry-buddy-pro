# 🔧 Environment Variables Setup Guide

This guide shows you exactly how to configure your environment variables for Pantry Buddy Pro.

## 🚀 Quick Setup (Automated)

Run the automated setup script:

```bash
cd "/Users/user/pantry buddy"
./scripts/setup-environment.sh
```

The script will guide you through each step and automatically generate secure keys.

## 📝 Manual Setup

If you prefer to set up manually:

### Step 1: Create Environment File

```bash
cp .env.example .env.local
```

### Step 2: Get Required Services

#### A. Supabase Database (Required)

1. **Go to [Supabase](https://supabase.com)**
2. **Create a new project**
3. **Go to Settings → API**
4. **Copy these values:**
   - Project URL (looks like: `https://abcdefgh.supabase.co`)
   - `anon` `public` key (starts with `eyJhbGciOiJIUzI1NiI...`)
   - `service_role` `secret` key (starts with `eyJhbGciOiJIUzI1NiI...`)

#### B. Anthropic API Key (Required)

1. **Go to [Anthropic Console](https://console.anthropic.com)**
2. **Create an account**
3. **Generate API key** (starts with `sk-ant-api03-...`)

### Step 3: Configure .env.local

Open `.env.local` and replace these values:

```env
# Replace these with your actual values:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Step 4: Generate Security Keys

Generate secure random keys for encryption:

```bash
# Encryption key (32 bytes)
openssl rand -base64 32

# JWT secret (64 bytes)
openssl rand -base64 64

# Session secret (32 bytes)
openssl rand -base64 32
```

Add these to your `.env.local`:

```env
ENCRYPTION_KEY=your-generated-32-byte-key
JWT_SECRET=your-generated-64-byte-key
SESSION_SECRET=your-generated-32-byte-key
```

### Step 5: Set Environment Type

For local development:

```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🔍 Verify Your Setup

Test your configuration:

```bash
npm run validate:prod
```

This will check that all required variables are set correctly.

## 📋 Complete Example .env.local

Here's what your final `.env.local` should look like:

```env
# Database
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MjA0MjQ5OTMsImV4cCI6MTkzNTk2NTU5M30.example
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTYyMDQyNDk5MywiZXhwIjoxOTM1OTY1NTkzfQ.example

# AI Service
ANTHROPIC_API_KEY=sk-ant-api03-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Security (generate these with openssl rand -base64)
ENCRYPTION_KEY=tK2Kx8vN3pL9mR7qW6eY1uI5oP8aS4dF
JWT_SECRET=jH3nM9qR7tV2xZ5bC8fG1kN4oP7sU6wA9dE3hJ6lO2rT5yI8uB4nQ7zX1vC6fM9k
SESSION_SECRET=gF4jH7nM2qT5yI8uB1dE6hJ9lO3rV6xZ

# Environment
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional (for production)
# SENTRY_DSN=https://your-sentry-dsn
# REDIS_URL=redis://localhost:6379
```

## ⚠️ Security Warnings

### 🚨 Critical Security Rules:

1. **NEVER commit `.env.local` to git** (it's already in .gitignore)
2. **Use different keys for production** - generate new ones for production deployment
3. **The `SUPABASE_SERVICE_ROLE_KEY` is extremely sensitive** - it has admin access
4. **Keep your `ANTHROPIC_API_KEY` secret** - it's tied to billing

### 🔐 Production Deployment:

For production (Vercel, Railway, etc.), set these as **environment variables** in your hosting platform's dashboard, not in a file.

## 🆘 Troubleshooting

### Common Issues:

**"Missing environment variables" error:**

- Make sure you copied all required variables
- Check for typos in variable names
- Ensure no extra spaces around the `=` sign

**"Invalid Supabase URL" error:**

- URL must start with `https://`
- URL should end with `.supabase.co`

**"Authentication failed" errors:**

- Double-check your Supabase keys
- Make sure you're using the correct project keys
- Verify the anon key vs service role key

**API rate limit errors:**

- Check your Anthropic API key is valid
- Verify you have credits/quota remaining

## 🎯 Next Steps

Once your environment is configured:

1. **Start the development server:**

   ```bash
   npm run dev
   ```

2. **Set up your database:**
   - Run the Supabase migrations (if needed)
   - Visit your Supabase dashboard to set up tables

3. **Test the application:**
   - Go to http://localhost:3000
   - Try creating an account
   - Test recipe generation

4. **Deploy to production:**
   - Follow the `DEPLOYMENT.md` guide
   - Set up production environment variables in your hosting platform

## 📞 Need Help?

If you run into issues:

1. Check the validation output: `npm run validate:prod`
2. Review this guide step by step
3. Check the browser console for specific error messages
4. Verify all your API keys are active and have proper permissions
