-- Reset y recrear todo limpio
-- Corre esto en Supabase SQL Editor

DROP TABLE IF EXISTS daily_audio CASCADE;
DROP TABLE IF EXISTS user_events CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS articles CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user CASCADE;

-- Articles (processed daily by cron pipeline)
CREATE TABLE articles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  summary       text NOT NULL,
  source_name   text,
  source_url    text,
  image_url     text,
  category      text CHECK (category IN ('pol','eco','int','ai','tec','dep','cien','esp','sal')),
  subcategory   text,
  tags          text[],
  city_relevance text CHECK (city_relevance IN ('cdmx','nacional','global')),
  published_at  timestamptz,
  created_at    timestamptz DEFAULT now(),
  is_good_news  boolean DEFAULT false
);

CREATE INDEX articles_category_idx ON articles(category);
CREATE INDEX articles_published_at_idx ON articles(published_at DESC);

-- Users (extends Supabase auth.users)
CREATE TABLE users (
  id            uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  city          text DEFAULT 'cdmx',
  notif_hour    int DEFAULT 7,
  audio_enabled boolean DEFAULT true,
  spoiler_free  boolean DEFAULT false,
  good_news_guaranteed boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- User preferences per category/subcategory/entity
CREATE TABLE user_preferences (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES users(id) ON DELETE CASCADE,
  category      text,
  subcategory   text,
  entity        text,
  weight        float DEFAULT 1.0 CHECK (weight >= 0.0 AND weight <= 1.0)
);

CREATE INDEX user_preferences_user_id_idx ON user_preferences(user_id);

-- Behavioral events for implicit personalization
CREATE TABLE user_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES users(id) ON DELETE CASCADE,
  article_id    uuid REFERENCES articles(id) ON DELETE CASCADE,
  event_type    text CHECK (event_type IN ('view','read_full','skip','audio_played','share')),
  seconds_spent int,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX user_events_user_id_idx ON user_events(user_id);
CREATE INDEX user_events_created_at_idx ON user_events(created_at DESC);

-- Daily audio per user
CREATE TABLE daily_audio (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES users(id) ON DELETE CASCADE,
  date          date NOT NULL,
  audio_url     text,
  duration_sec  int,
  script        text,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_audio ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read/write own profile" ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can read/write own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can read/write own events" ON user_events
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can read own audio" ON daily_audio
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Articles are public" ON articles
  FOR SELECT USING (true);

-- Trigger: auto-crear perfil al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
