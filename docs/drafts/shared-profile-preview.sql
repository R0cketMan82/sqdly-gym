-- Review draft. The authoritative migration belongs in sportlinkvie/supabase/migrations.
-- Apply the function definition and its access changes in one transaction.
-- Replace only the implementation when shared.profiles becomes authoritative.
CREATE FUNCTION public.get_my_shared_profile()
RETURNS TABLE (
  member_number integer,
  display_name text,
  avatar_url text,
  city text,
  country_code text,
  saved_language text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    profile.member_number,
    profile.display_name,
    profile.avatar_url,
    profile.city,
    profile.country_code,
    CASE
      WHEN profile.notification_locale_selected_at IS NOT NULL
        AND profile.notification_locale IN ('en', 'de')
      THEN profile.notification_locale
      ELSE NULL
    END
  FROM public.profiles AS profile
  WHERE profile.id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION public.get_my_shared_profile()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_shared_profile() TO authenticated;

COMMENT ON FUNCTION public.get_my_shared_profile() IS
  'Returns only the caller''s approved shared profile fields from the legacy SQDLY profile during the compatibility phase.';
