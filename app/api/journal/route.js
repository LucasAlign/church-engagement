import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('date', date)
    .single();
  if (error && error.code !== 'PGRST116') return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data || null });
}

export async function POST(req) {
  const body = await req.json();
  const { date = new Date().toISOString().split('T')[0], reflect, commit_text, reflect_prompt, commit_prompt } = body;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('journal_entries')
    .upsert({ date, reflect, commit_text, reflect_prompt, commit_prompt }, { onConflict: 'date' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data });
}
