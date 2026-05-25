-- 在 Supabase SQL Editor 中运行此脚本以初始化数据库表

CREATE TABLE items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  type TEXT CHECK (type IN ('lost', 'found')),
  item_name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  image_url TEXT,
  location TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 开启 RLS 策略
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- 允许任何人查看公开的招领/失物信息
CREATE POLICY "Allow public select" ON items FOR SELECT USING (true);

-- 允许登录用户插入自己的信息
CREATE POLICY "Allow individual insert" ON items FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 私聊对话表
CREATE TABLE conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  participant_1 UUID REFERENCES auth.users(id),
  participant_2 UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 私聊消息表
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 对话表 RLS：仅参与者可见
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow participants to view conversations" 
  ON conversations FOR SELECT 
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- 允许参与者创建对话
CREATE POLICY "Allow participants to insert conversations" 
  ON conversations FOR INSERT 
  WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- 消息表 RLS：仅对话参与者可见
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow participants to view messages" 
  ON messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE id = messages.conversation_id 
      AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
    )
  );

CREATE POLICY "Allow participants to insert messages" 
  ON messages FOR INSERT 
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE id = messages.conversation_id 
      AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
    )
  );
