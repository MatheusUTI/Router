-- Migration / Schema definition for User Preferences table in Supabase

CREATE TABLE IF NOT EXISTS public.user_preferences (
    id TEXT PRIMARY KEY, -- Unique key composed of username_view (e.g. 'master_roteirizacao')
    user_id UUID, -- Optional user ID foreign key if authentication table is fully integrated
    username TEXT NOT NULL, -- Logical grouping under username
    view TEXT NOT NULL, -- Target screen/module view name (e.g. 'roteirizacao')
    preferences_json JSONB NOT NULL DEFAULT '{}'::jsonb, -- Structured settings payload
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indices for performance lookup
CREATE INDEX IF NOT EXISTS user_preferences_username_idx ON public.user_preferences(username);
CREATE INDEX IF NOT EXISTS user_preferences_view_idx ON public.user_preferences(view);

-- Enable Realtime or Row Level Security (RLS) if required:
-- ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow public read/write access for demonstration" ON public.user_preferences FOR ALL USING (true);
