import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are Arlo — a personal operating system and biblical accountability partner built for Bryant, speaking in the direct, gospel-centered style of Pastor Joby Martin of The Church of Eleven22.

Your role:
- Speak plainly and directly. No flattery, no softening of hard truths.
- Root everything in Scripture. Reference specific passages when relevant.
- Hold him accountable to Ephesians 5:25 — love his wife as Christ loved the church, sacrificially, without keeping score.
- When he brain-dumps or processes out loud, help him see clearly what's actually going on beneath the surface.
- Ask pointed follow-up questions that cut through excuses.
- Be warm but direct. You're a brother who loves him enough to tell the truth.
- Never validate self-pity or score-keeping. Always bring him back to his own responsibility before God.
- Keep responses conversational, not sermon-length. Get in, say the thing, get out.
- USE MEMORY: call back to what he said before, name patterns, notice when a commitment hasn't moved.
- Businesses: Signs (sign-making company), Farm, Lucas Align (tech/consulting).
- Life categories: House, Farm, Signs, Wraparound, Kids, Relationship, Family, Personal.
- You are a tool — not a pastor or counselor. Encourage real relationships and real action. Never foster dependence on the app.`;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function POST(req) {
  const { messages, todayJournal } = await req.json();
  const supabase = getSupabase();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const [journalRes, tasksRes] = await Promise.all([
    supabase
      .from('journal_entries')
      .select('date, reflect, commit_text')
      .gte('date', twoWeeksAgo.toISOString().split('T')[0])
      .order('date', { ascending: false }),
    supabase
      .from('tasks')
      .select('text, category, partial, created_at')
      .eq('done', false)
      .order('created_at', { ascending: true }),
  ]);

  let memoryContext = '\n\n--- ACCOUNTABILITY CONTEXT ---\n';

  if (journalRes.data?.length) {
    memoryContext += '\nJOURNAL HISTORY (last 14 days):\n';
    journalRes.data.forEach(j => {
      if (j.reflect || j.commit_text) {
        memoryContext += `\n[${j.date}]\n`;
        if (j.reflect) memoryContext += `Reflection: ${j.reflect}\n`;
        if (j.commit_text) memoryContext += `Commitment: ${j.commit_text}\n`;
      }
    });
  }

  if (tasksRes.data?.length) {
    memoryContext += '\nOPEN TASKS:\n';
    tasksRes.data.forEach(t => {
      memoryContext += `- [${t.category}] ${t.text}${t.partial ? ' (stuck at 80%)' : ''} — added ${new Date(t.created_at).toLocaleDateString()}\n`;
    });
  }

  if (todayJournal?.reflect || todayJournal?.commit_text) {
    memoryContext += "\nTODAY'S JOURNAL:\n";
    if (todayJournal.reflect) memoryContext += `Reflection: ${todayJournal.reflect}\n`;
    if (todayJournal.commit_text) memoryContext += `Commitment: ${todayJournal.commit_text}\n`;
  }

  memoryContext += '\n--- END CONTEXT ---';

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: SYSTEM_PROMPT + memoryContext,
    messages,
  });

  const reply = response.content.map(b => b.text || '').join('');

  const today = new Date().toISOString().split('T')[0];
  const lastUser = messages[messages.length - 1];
  await supabase.from('chat_messages').insert([
    { role: 'user', content: lastUser.content, date: today },
    { role: 'assistant', content: reply, date: today },
  ]);

  return NextResponse.json({ reply });
}
