# Supabase Setup for TradeGuru

## 🚀 Quick Setup Steps

### 1. Disable Email Confirmation (For Instant Signup)

Go to your Supabase Dashboard:
- **Authentication** → **Providers** → **Email**
- **UNCHECK** "Confirm email"
- Click **Save**

This allows users to signup and immediately access the dashboard without email verification.

---

### 2. Run the Database Schema

Copy the entire `schema.sql` file and run it in:
- **SQL Editor** → **New Query** → Paste → **Run**

---

### 3. Enable Realtime for Chat

- **Database** → **Replication**
- Find `messages` table
- Toggle **ON** the Realtime switch

---

### 4. Verify Trigger is Working

Run this to check:

```sql
-- Check trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Test signup by creating a user in dashboard
-- Then check if profile was created
SELECT * FROM profiles ORDER BY created_at DESC LIMIT 5;
```

---

## 🐛 If Users Can't Signup (422 Error)

**This means the email is already registered.**

### Check Existing Users:
```sql
SELECT id, email, created_at FROM auth.users;
```

### Delete User to Re-signup:
```sql
DELETE FROM auth.users WHERE email = 'test@example.com';
```

---

## 🔧 Create Missing Profiles for Existing Users

If you have users but no profiles:

```sql
-- Create missing profiles
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  u.id, 
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'role', 'USER')
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Create missing wallets
INSERT INTO public.wallets (user_id, balance)
SELECT u.id, 1000
FROM auth.users u
LEFT JOIN public.wallets w ON u.id = w.user_id
WHERE w.user_id IS NULL;
```

---

## ✅ Test Signup Flow

1. Make sure email confirmation is **OFF**
2. Try signing up with a **NEW email** (not used before)
3. Should redirect to `/dashboard` or `/mentor` instantly
4. Check profile, wallet, and mentor_profile tables to verify data was created

---

## 🔐 Environment Variables

Make sure `.env` has:
```
VITE_SUPABASE_URL=https://rymllkrwnnmibkkgfkkc.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_GEMINI_API_KEY=your_gemini_key
```
