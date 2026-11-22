-- Review draft. Promote through the SQDLY migration history. Run the entire
-- file in one READ COMMITTED transaction as the trusted migration owner.
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE SCHEMA shared;
REVOKE ALL ON SCHEMA shared FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE shared.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  member_number integer UNIQUE,
  display_name text,
  avatar_url text,
  home_location_label text,
  country_code text,
  saved_language text CHECK (saved_language IN ('en', 'de'))
);
COMMENT ON COLUMN shared.profiles.home_location_label IS
  'Owner-only legacy home location label. A mini profile needs a separately verified locality.';
ALTER TABLE shared.profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE shared.profiles FROM PUBLIC, anon, authenticated, service_role;

-- Readers can continue during the copy. Writers queued behind this lock
-- resume with the trigger installed, or resume against the old schema on abort.
-- The CLI sends an implicit transaction batch. Take the lock inside a
-- procedural block so PostgreSQL accepts it in that batch as well.
DO $lock$
BEGIN
  LOCK TABLE public.profiles IN SHARE ROW EXCLUSIVE MODE;
END;
$lock$;

-- A single mapping for the initial copy and incremental writes. This private
-- view and its trigger are retired together when write ownership moves.
CREATE VIEW shared.legacy_profile_fields AS
SELECT id, member_number, display_name, avatar_url, city AS home_location_label, country_code,
       CASE WHEN notification_locale_selected_at IS NOT NULL
                  AND notification_locale IN ('en', 'de')
            THEN notification_locale END AS saved_language
FROM public.profiles;
REVOKE ALL ON TABLE shared.legacy_profile_fields FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION shared.copy_legacy_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO shared.profiles AS s
    (id, member_number, display_name, avatar_url, home_location_label, country_code, saved_language)
  SELECT p.id, p.member_number, p.display_name, p.avatar_url, p.home_location_label, p.country_code, p.saved_language
  FROM shared.legacy_profile_fields AS p WHERE p.id = NEW.id
  ON CONFLICT (id) DO UPDATE SET
    member_number = EXCLUDED.member_number, display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url, home_location_label = EXCLUDED.home_location_label,
    country_code = EXCLUDED.country_code, saved_language = EXCLUDED.saved_language
  WHERE (s.member_number, s.display_name, s.avatar_url, s.home_location_label, s.country_code, s.saved_language)
    IS DISTINCT FROM (EXCLUDED.member_number, EXCLUDED.display_name, EXCLUDED.avatar_url,
                      EXCLUDED.home_location_label, EXCLUDED.country_code, EXCLUDED.saved_language);
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION shared.copy_legacy_profile() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER copy_shared_profile AFTER INSERT OR UPDATE OF id, member_number,
  display_name, avatar_url, city, country_code, notification_locale, notification_locale_selected_at
  ON public.profiles FOR EACH ROW EXECUTE FUNCTION shared.copy_legacy_profile();

INSERT INTO shared.profiles (id, member_number, display_name, avatar_url, home_location_label, country_code, saved_language)
SELECT id, member_number, display_name, avatar_url, home_location_label, country_code, saved_language
FROM shared.legacy_profile_fields;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM shared.legacy_profile_fields AS p
    FULL JOIN shared.profiles AS s ON s.id = p.id
    WHERE p.id IS NULL OR s.id IS NULL OR
      (p.member_number, p.display_name, p.avatar_url, p.home_location_label, p.country_code, p.saved_language)
      IS DISTINCT FROM
      (s.member_number, s.display_name, s.avatar_url, s.home_location_label, s.country_code, s.saved_language)
  ) THEN
    RAISE EXCEPTION 'Shared profile backfill differs from the legacy profile contract';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_shared_profile()
RETURNS TABLE (member_number integer, display_name text, avatar_url text,
               city text, country_code text, saved_language text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.member_number, p.display_name, p.avatar_url, p.home_location_label, p.country_code, p.saved_language
  FROM shared.profiles AS p WHERE p.id = (SELECT auth.uid());
$$;
REVOKE ALL ON FUNCTION public.get_my_shared_profile() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_shared_profile() TO authenticated;
COMMENT ON FUNCTION public.get_my_shared_profile() IS
  'Returns the signed-in caller''s shared profile. SQDLY supplies edits during the transition.';
