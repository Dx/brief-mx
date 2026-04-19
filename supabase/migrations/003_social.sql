-- brief.mx — Social features: likes + comments
-- Corre esto en Supabase SQL Editor

CREATE TABLE article_likes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  article_url text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, article_url)
);

CREATE INDEX article_likes_url_idx ON article_likes(article_url);

CREATE TABLE article_comments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES users(id) ON DELETE CASCADE,
  article_url   text NOT NULL,
  article_title text,
  content       text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX article_comments_url_idx ON article_comments(article_url);

-- RLS
ALTER TABLE article_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own likes" ON article_likes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Comments are public read" ON article_comments
  FOR SELECT USING (true);

CREATE POLICY "Users write own comments" ON article_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own comments" ON article_comments
  FOR DELETE USING (auth.uid() = user_id);
