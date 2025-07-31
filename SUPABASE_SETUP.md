# Supabase Setup Guide for Pantry Buddy Pro

This guide will help you set up authentication, database storage, and security using Supabase.

## 🚀 Quick Setup (5 minutes)

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click "New Project"
3. Choose your organization and enter project details:
   - **Name**: `pantry-buddy-pro`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
4. Wait 2-3 minutes for project creation

### 2. Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (starts with `https://`)
   - **anon public** key (starts with `eyJ`)
   - **service_role** key (starts with `eyJ`)

### 3. Configure Environment Variables

Create `.env.local` in your project root:

```env
# Copy from .env.example and add your Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Generate random 32+ character strings for these
NEXTAUTH_SECRET=your-secret-key-minimum-32-characters-long
ENCRYPTION_KEY=your-32-character-encryption-key-here

# Keep your existing AI settings
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
AI_PROVIDER=anthropic
ENABLE_AI_RECIPES=true
```

### 4. Set Up Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the entire contents of `lib/supabase/schema.sql`
4. Click "Run" to create all tables and security policies

### 5. Configure Authentication

1. In Supabase dashboard, go to **Authentication** → **Settings**
2. Under **General settings**, configure:
   - **Site URL**: `http://localhost:3000` (development)
   - **Redirect URLs**: Add `http://localhost:3000/**`
3. Under **Email templates**, customize if desired
4. **Optional**: Enable social providers (Google, GitHub, etc.)

### 6. Install Dependencies & Start

```bash
npm install
npm run dev
```

🎉 **Done!** Your app now has authentication, database storage, and security!

---

## 📊 What You Get

### ✅ **Authentication System**

- Email/password authentication
- User registration and login
- Password reset functionality
- Protected routes and components
- User profile management

### ✅ **Database Storage**

- User profiles and preferences
- Pantry inventory with sync across devices
- Recipe storage and ratings
- Usage tracking for subscription management
- AI response caching for cost optimization

### ✅ **Security Features**

- Row Level Security (RLS) - users only see their data
- Server-side API protection
- Encrypted sensitive data
- Input validation and sanitization
- CSRF protection

### ✅ **Subscription Management**

- Free tier: 50 pantry items, 5 AI recipes/day
- Premium tiers with usage tracking
- Feature gating based on subscription
- Usage analytics and billing support

---

## 🔧 Advanced Configuration

### Social Authentication (Optional)

To enable Google sign-in:

1. **Google Console Setup**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized origins: `https://your-project-id.supabase.co`
   - Add redirect URIs: `https://your-project-id.supabase.co/auth/v1/callback`

2. **Supabase Configuration**:
   - In Supabase Dashboard → Authentication → Providers
   - Enable Google provider
   - Add your Google Client ID and Secret

3. **Environment Variables**:
   ```env
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
   ```

### Email Configuration (Optional)

For custom email templates and SMTP:

1. **Supabase Dashboard** → Authentication → Settings → SMTP Settings
2. Configure your SMTP provider (SendGrid, Mailgun, etc.)
3. Customize email templates in Authentication → Email Templates

### File Storage (Optional)

For recipe image uploads:

1. **Supabase Dashboard** → Storage
2. Create bucket: `recipe-images`
3. Set up RLS policies for secure file access
4. Configure in your app:
   ```typescript
   const { data, error } = await supabase.storage
     .from('recipe-images')
     .upload(`${userId}/${recipeId}.jpg`, file);
   ```

---

## 🛡️ Security Best Practices

### Row Level Security Policies

Our schema includes comprehensive RLS policies:

```sql
-- Users can only access their own data
CREATE POLICY "Users can manage own pantry items" ON public.pantry_items
    FOR ALL USING (auth.uid() = user_id);

-- System can manage cache and usage tracking
CREATE POLICY "System can manage ai cache" ON public.ai_cache
    FOR ALL USING (true);
```

### API Security

1. **Never expose service role key** client-side
2. **Validate all inputs** before database operations
3. **Use server-side functions** for sensitive operations
4. **Monitor usage** to prevent abuse

### Data Protection

- **Encryption**: Sensitive data encrypted at rest
- **Anonymization**: User data can be anonymized on request
- **Backup**: Automatic daily backups included
- **GDPR Compliance**: Built-in data export/deletion

---

## 📈 Monitoring & Analytics

### Built-in Analytics

The schema includes usage tracking:

```sql
-- Track daily usage per user
INSERT INTO public.usage_tracking (user_id, recipe_generations, ai_requests)
VALUES (user_id, 1, 1)
ON CONFLICT (user_id, date)
DO UPDATE SET recipe_generations = usage_tracking.recipe_generations + 1;
```

### Supabase Dashboard

Monitor your app in real-time:

- **Database**: Query performance, table sizes, connections
- **Authentication**: User signups, login rates, sessions
- **Storage**: File uploads, bandwidth usage
- **Edge Functions**: Invocation counts, errors, latency

### Custom Analytics

Add to your app:

```typescript
// Track feature usage
const trackFeatureUsage = async (feature: string) => {
  await supabase.from('usage_tracking').upsert({
    user_id: user.id,
    date: new Date().toISOString().split('T')[0],
    [`${feature}_usage`]: sql`${feature}_usage + 1`,
  });
};
```

---

## 🚀 Production Deployment

### Environment Setup

```env
# Production environment
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXTAUTH_URL=https://your-domain.com

# Use strong secrets in production
NEXTAUTH_SECRET=production-secret-64-characters-long-minimum-for-security
ENCRYPTION_KEY=production-encryption-key-32-chars-min

# Supabase production project
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-key
```

### Database Migration

1. Export schema from development
2. Apply to production Supabase project
3. Test all functionality thoroughly
4. Set up monitoring and alerts

### Performance Optimization

1. **Enable database indexes** (included in schema)
2. **Use connection pooling** for high traffic
3. **Implement caching** for frequently accessed data
4. **Monitor query performance** in Supabase dashboard

---

## 🔍 Troubleshooting

### Common Issues

**"Missing Supabase URL" Error**

- Check `.env.local` file exists and has correct values
- Restart development server after adding env vars

**Authentication Not Working**

- Verify Site URL and Redirect URLs in Supabase dashboard
- Check browser console for CORS errors
- Ensure email confirmation is disabled for development

**Database Connection Issues**

- Check Supabase project status in dashboard
- Verify RLS policies allow user access
- Check network connectivity

**Permission Denied Errors**

- Review RLS policies in database
- Check user authentication status
- Verify user ID matches in policies

### Debug Mode

Enable debug logging:

```env
NEXT_PUBLIC_SUPABASE_DEBUG=true
```

### Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord Community](https://discord.supabase.com)
- [GitHub Issues](https://github.com/supabase/supabase/issues)
- Project-specific issues: Check your repository issues

---

## 💰 Cost Management

### Free Tier Limits

- **Database**: 500MB storage, 2 concurrent connections
- **Authentication**: 50,000 monthly active users
- **Storage**: 1GB file storage
- **Edge Functions**: 500,000 invocations/month

### Optimization Tips

1. **Use AI caching** to reduce API costs
2. **Implement pagination** for large datasets
3. **Clean up expired cache** regularly
4. **Monitor usage** in Supabase dashboard
5. **Optimize queries** using EXPLAIN ANALYZE

### Scaling Strategy

1. **Pro Plan** ($25/month): More resources, priority support
2. **Team Plan** ($599/month): Dedicated resources, advanced features
3. **Enterprise**: Custom pricing for high-scale applications

---

Ready to transform your Pantry Buddy into a production-ready app! 🚀
