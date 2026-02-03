# Troubleshooting Profile Issues

## Problem: User Logged In But No Profile

If you're getting a 406 error or "Profile not found" after login:

### 1. Check if Trigger is Working

Run this in Supabase SQL Editor:

```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check if function exists
SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
```

### 2. Manually Create Missing Profiles

If users signed up but profiles weren't created:

```sql
-- Find users without profiles
SELECT u.id, u.email
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Create missing profiles manually
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  u.id, 
  u.email,
  u.raw_user_meta_data->>'full_name' as full_name,
  COALESCE(u.raw_user_meta_data->>'role', 'USER') as role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Create missing wallets
INSERT INTO public.wallets (user_id, balance)
SELECT u.id, 0
FROM auth.users u
LEFT JOIN public.wallets w ON u.id = w.user_id
WHERE w.user_id IS NULL;

-- Create missing mentor_profiles for mentors
INSERT INTO public.mentor_profiles (id)
SELECT p.id
FROM public.profiles p
LEFT JOIN public.mentor_profiles m ON p.id = m.id
WHERE p.role = 'MENTOR' AND m.id IS NULL;
```

### 3. Recreate the Trigger

If the trigger doesn't exist or isn't working:

```sql
-- Drop old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate function
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    COALESCE(new.raw_user_meta_data->>'role', 'USER')
  );
  
  -- Create wallet
  INSERT INTO public.wallets (user_id, balance) 
  VALUES (new.id, 0);
  
  -- Create mentor_profile if role is MENTOR
  IF (new.raw_user_meta_data->>'role' = 'MENTOR') THEN
    INSERT INTO public.mentor_profiles (id) VALUES (new.id);
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE PROCEDURE public.handle_new_user();
```

### 4. Test the Setup

Sign up a new user and verify:

```sql
-- Check if profile was created
SELECT * FROM profiles WHERE email = 'test@example.com';

-- Check if wallet was created  
SELECT * FROM wallets WHERE user_id = (
  SELECT id FROM profiles WHERE email = 'test@example.com'
);
```

---

## Current Fix

The app now:
- ✅ Auto-logs out users without profiles
- ✅ Shows helpful error message
- ✅ Redirects to signup
- ✅ Prevents accessing app without profile

But you still need to ensure the trigger is working for future signups!
