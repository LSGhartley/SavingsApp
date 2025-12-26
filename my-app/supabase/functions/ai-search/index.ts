import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { query } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    const openAiKey = Deno.env.get('OPENAI_API_KEY');

    // 1. Embed the User's Question
    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: query })
    });
    const embData = await embRes.json();
    const queryVector = embData.data[0].embedding;

    // 2. Find Relevant Database Chunks (Vector Search)
    // We use a Remote Procedure Call (RPC) - we'll create this SQL function in Step 3
    const { data: chunks, error } = await supabase.rpc('match_statement_chunks', {
      query_embedding: queryVector,
      match_threshold: 0.5,
      match_count: 5
    });

    if (error) throw error;

    // 3. Generate Answer with GPT
    const context = chunks.map((c: any) => c.chunk_content).join('\n\n');
    
    const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: "You are a witty financial assistant. Answer the user's question based ONLY on the context provided. Be fun and concise." },
          { role: 'user', content: `Context:\n${context}\n\nQuestion: ${query}` }
        ]
      })
    });

    const gptData = await gptRes.json();
    const answer = gptData.choices[0].message.content;

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});