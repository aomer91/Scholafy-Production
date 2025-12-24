-- ==========================================
-- 1. DATABASE RESET (Ordered for Relationships)
-- ==========================================
DROP TABLE IF EXISTS lesson_history CASCADE;
DROP TABLE IF EXISTS live_sessions CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;

-- ==========================================
-- 2. CORE TABLES (Master Data)
-- ==========================================

CREATE TABLE badges (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL
);

CREATE TABLE quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    text TEXT NOT NULL,
    source TEXT NOT NULL
);

CREATE TABLE lessons (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    year INTEGER NOT NULL,
    subject TEXT NOT NULL,
    curriculum_strand TEXT NOT NULL,
    goal TEXT NOT NULL,
    video TEXT NOT NULL,
    estimated_minutes INTEGER NOT NULL,
    starter_policy JSONB DEFAULT '{"require": "all", "minScore": 1}'::jsonb,
    exit_policy JSONB DEFAULT '{"require": "all", "minScore": 0.8}'::jsonb,
    starters JSONB DEFAULT '[]'::jsonb,
    questions JSONB DEFAULT '[]'::jsonb,
    exits JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. USER TABLES (Relational)
-- ==========================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    year_group INTEGER NOT NULL,
    streak_days INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    badges JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, lesson_id)
);

CREATE TABLE live_sessions (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    mode TEXT NOT NULL DEFAULT 'idle',
    t NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    q_text TEXT,
    stats JSONB DEFAULT '{}'::jsonb,
    history JSONB DEFAULT '[]'::jsonb,
    last_update TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lesson_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    score_percent INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    records JSONB DEFAULT '[]'::jsonb,
    badges_earned JSONB DEFAULT '[]'::jsonb,
    
    -- Diagnostic / AI Insight Columns
    effort_grade TEXT,
    focus_index INTEGER,
    mastery_level TEXT,
    insight_text TEXT,
    
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4. REALTIME CONFIGURATION
-- ==========================================

-- Enable Realtime for the tables used in Parent Peek
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE live_sessions, profiles, assignments, lesson_history;
COMMIT;

ALTER TABLE live_sessions REPLICA IDENTITY FULL;

-- ==========================================
-- 5. AUTOMATIC PROFILE CREATION TRIGGER
-- ==========================================

-- This function runs every time a new user signs up via Email/Password
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, year_group, streak_days, xp, level, badges)
  VALUES (
    new.id, -- Maps the Auth User ID to the Profile ID
    new.raw_user_meta_data->>'name', -- Extracts 'name' passed from the frontend
    (new.raw_user_meta_data->>'year_group')::INTEGER, -- Extracts 'year_group' passed from the frontend
    0,
    0,
    1,
    '[]'::jsonb
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The actual trigger that attaches the function to the auth.users table
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 6. SEED DATA
-- ==========================================

INSERT INTO badges (id, name, description, icon, color) VALUES
-- Mastery Achievement Levels
('diamond_crown', 'The Diamond Crown', 'Comprehensive mastery and high precision (90%+)', '💎', 'bg-blue-300'),
('gold_medal', 'The Gold Medal', 'Working At the required level (65%-89%)', '🥇', 'bg-yellow-500'),
('silver_shield', 'The Silver Shield', 'Understanding the basics (35%-64%)', '🛡️', 'bg-slate-400'),
('bronze_key', 'The Bronze Key', 'Foundations; needs more practice (< 35%)', '🔑', 'bg-orange-700'),

-- Rewarding the "How"
('laser_eye', 'The Laser Eye', 'Awarded for zero "Lost" alerts (high focus)', '👁️', 'bg-red-500'),
('accuracy_pro', 'The Accuracy Pro', 'Awarded for zero flash guesses (methodical)', '🎯', 'bg-green-500'),

-- Legacy/Other
('first_steps', 'First Steps', 'Complete your first lesson', '🚀', 'bg-blue-500'),
('math_whiz', 'Number Ninja', 'Complete 3 Maths lessons', '📐', 'bg-blue-400'),
('streak_3', 'On Fire', 'Reach a 3-day streak', '🔥', 'bg-orange-500');

INSERT INTO quotes (text, source) VALUES
('Seek knowledge from the cradle to the grave.', 'Prophet Muhammad (ﷺ)'),
('Knowledge is the life of the mind.', 'Abu Bakr (RA)'),
('The expert in anything was once a beginner.', 'Helen Hayes');

INSERT INTO lessons (id, title, year, subject, curriculum_strand, goal, video, estimated_minutes, starters, questions, exits) VALUES
(
    'maths_y3_add_2digit',
    '2-Digit Addition (Column Method)',
    3,
    'Mathematics',
    'Number - Addition & Subtraction',
    'Add numbers with up to three digits',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    15,
    '[{"id":"st1","type":"choice","prompt":"What is 10 + 10?","options":[{"label":"20","correct":true},{"label":"30","correct":false}]}]'::jsonb,
    '[{"id":"q1","type":"choice","time":5,"prompt":"Which column do we add first?","options":[{"label":"Ones","correct":true},{"label":"Tens","correct":false}]}]'::jsonb,
    '[{"id":"ex1","type":"choice","prompt":"Select correct: 23 + 12","options":[{"label":"35","correct":true},{"label":"45","correct":false}]}]'::jsonb
),
(
    'sci_y3_plants',
    'Parts of a Flowering Plant',
    3,
    'Science',
    'Plants - Functions of Parts',
    'Identify roots, stem, leaves and flowers',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    8,
    '[]'::jsonb,
    '[{"id":"sq1","type":"choice","time":4,"prompt":"Which part absorbs water?","options":[{"label":"Roots","correct":true},{"label":"Flower","correct":false}]}]'::jsonb,
    '[]'::jsonb
);

-- ==========================================
-- 7. SECURITY POLICIES
-- ==========================================
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read" ON lessons FOR SELECT USING (true);
CREATE POLICY "Public Read Badges" ON badges FOR SELECT USING (true);
CREATE POLICY "Public Read Quotes" ON quotes FOR SELECT USING (true);

-- Allow users to read/update ONLY their own profile
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to read/create/update their own assignments/sessions/history
CREATE POLICY "Users own assignments" ON assignments FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Users own sessions" ON live_sessions FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Users own history" ON lesson_history FOR ALL USING (auth.uid() = profile_id);
