# 📧 Email Configuration Fix Guide

## Issue: Confirmation emails direct to localhost:3000

When users sign up, Supabase sends confirmation emails that contain links pointing to `localhost:3000` instead of your production URL.

## Root Cause

The issue is in the Supabase project configuration where email templates use the Site URL setting.

## 🔧 Fix Steps

### 1. Update Environment Variables

**For Production Deployment:**

Update your production environment variables:

```bash
# Production URL (replace with your actual domain)
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

**For Development:**

```bash
# Development URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Configure Supabase Auth Settings

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication > Settings**
4. Update the following settings:

#### Site URL:

```
https://your-production-domain.com
```

#### Redirect URLs:

Add all your allowed redirect URLs:

```
http://localhost:3000/**
https://your-production-domain.com/**
https://your-staging-domain.com/**  (if you have staging)
```

### 3. Update Email Templates (Optional)

If you want to customize email templates:

1. Go to **Authentication > Email Templates**
2. For each template (Confirm signup, Invite user, Magic Link, etc.):
3. Update any hardcoded URLs to use: `{{ .SiteURL }}`

Example template fix:

```html
<!-- Before (hardcoded) -->
<a href="http://localhost:3000/auth/confirm?token={{ .Token }}">Confirm your email</a>

<!-- After (dynamic) -->
<a href="{{ .SiteURL }}/auth/confirm?token={{ .Token }}">Confirm your email</a>
```

### 4. Test Email Flow

1. Deploy your app with the new `NEXT_PUBLIC_APP_URL`
2. Create a test user account
3. Check that confirmation email links point to production URL
4. Verify the confirmation flow works end-to-end

## 🚀 Deployment Checklist

### Vercel Deployment:

1. Set environment variable in Vercel dashboard:
   ```
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```
2. Update Supabase Site URL to match
3. Add Vercel URL to Redirect URLs list

### Netlify Deployment:

1. Set environment variable in Netlify settings:
   ```
   NEXT_PUBLIC_APP_URL=https://your-app.netlify.app
   ```
2. Update Supabase settings accordingly

### Custom Domain:

1. Set your custom domain as the app URL:
   ```
   NEXT_PUBLIC_APP_URL=https://your-custom-domain.com
   ```
2. Update Supabase Site URL
3. Ensure SSL certificate is properly configured

## 🔍 Troubleshooting

### Still getting localhost URLs?

1. Check that environment variables are properly set in production
2. Verify Supabase Site URL is updated
3. Clear browser cache and try again
4. Check if you have multiple Supabase projects (dev/prod)

### Email not sending?

1. Check Supabase logs in dashboard
2. Verify SMTP settings (if using custom SMTP)
3. Check spam folder
4. Ensure domain has proper DNS records

### Redirect not working after confirmation?

1. Verify redirect URL is in allowed list
2. Check for typos in domain names
3. Ensure HTTPS/HTTP protocol matches

## 📋 Quick Fix Summary

1. **Set production environment variable:**

   ```bash
   NEXT_PUBLIC_APP_URL=https://your-production-domain.com
   ```

2. **Update Supabase Auth Settings:**
   - Site URL: `https://your-production-domain.com`
   - Add redirect URLs for all environments

3. **Deploy and test** the signup flow

## 🛡️ Security Notes

- Always use HTTPS for production URLs
- Only add trusted domains to redirect URLs list
- Regularly review and clean up old redirect URLs
- Use different Supabase projects for dev/staging/prod if possible

## 📞 Support

If you continue experiencing issues:

1. Check Supabase documentation on [Auth Configuration](https://supabase.com/docs/guides/auth/auth-deep-dive/auth-deep-dive)
2. Review your deployment platform's environment variable documentation
3. Contact your hosting provider if domain/SSL issues persist
