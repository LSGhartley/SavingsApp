import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { summary, year } = await req.json();
    const openAiKey = Deno.env.get('OPENAI_API_KEY');

    // Context: summary is an array of { category: 'Food', total: 5000, count: 20 }
    const contextStr = summary.map((s: any) => 
      `${s.category}: Spent R${s.total} across ${s.count} transactions.`
    ).join('\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { 
            role: 'system', 
            content: `You are a financial psychologist. Based on the user's spending summary over the LAST 3 MONTHS:
            1. Assign them a fun "Money Personality" (e.g., The Social Spender, The Tech Investor).
            2. Give 1 insightful sentence explaining why based on their highest category or frequency.
            3. Be positive but insightful.` 
          },
          { role: 'user', content: contextStr }
        ]
      })
    });

    const data = await response.json();
    const result = data.choices[0].message.content;

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});