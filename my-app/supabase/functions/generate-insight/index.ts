import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { transactions } = await req.json();
    
    // Only initialize OpenAI
    const openAiKey = Deno.env.get('OPENAI_API_KEY');

    if (!transactions || transactions.length === 0) {
      return new Response(JSON.stringify({ insight: "No data available for last month." }), { headers: corsHeaders });
    }

    // Create a context string
    const summary = transactions.map((t: any) => 
      `- ${t.description}: R${(t.amount/100).toFixed(2)} (${t.category})`
    ).join('\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: "You are a financial analyst. Give a 2-sentence summary of the user's spending last month. Mention the biggest expense and any category that looks high. Be direct." },
          { role: 'user', content: `Analyze these top expenses from last month:\n${summary}` }
        ]
      })
    });

    const data = await response.json();
    const insight = data.choices[0].message.content;

    return new Response(JSON.stringify({ insight }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});