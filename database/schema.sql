-- ユーザーテーブル（Supabaseの認証と連携）
create table public.profiles (
  id uuid references auth.users primary key,
  username text unique not null,
  full_name text,
  avatar_url text,
  bio text,
  is_public boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- コミュニティーテーブル
create table public.communities (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references public.profiles(id) not null,
  title text not null,
  description text,
  location_lat numeric not null,
  location_lng numeric not null,
  meeting_time timestamp with time zone not null,
  max_participants integer,
  visibility text check (visibility in ('public', 'followers_only', 'private')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- コミュニティー参加者テーブル
create table public.community_participants (
  community_id uuid references public.communities(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (community_id, user_id)
);

-- フォロー関係テーブル
create table public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (follower_id, following_id)
);

-- チャットメッセージテーブル
create table public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  community_id uuid references public.communities(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- チャットメッセージテーブルを更新
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- コミュニティ参加者テーブルを更新
CREATE TABLE IF NOT EXISTS public.community_participants (
    community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (community_id, user_id)
); 