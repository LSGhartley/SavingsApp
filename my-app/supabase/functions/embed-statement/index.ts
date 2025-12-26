import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { statementId } = await req.json();
    
    // 1. Setup Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    const openAiKey = Deno.env.get('OPENAI_API_KEY');

    // 2. Fetch Transactions for this Statement
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('statement_id', statementId);

    if (!transactions || transactions.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No data to embed" }), { headers: corsHeaders });
    }

    // 3. Create a single "Context String" for the AI
    // We format it like: "On 2025-11-01 you spent $15.00 at Uber (Transport)."
    const textChunk = transactions.map((t: any) => 
      `On ${t.transaction_date}, spent R${(t.amount/100).toFixed(2)} at ${t.description} for ${t.category}.`
    ).join('\n');

    // 4. Generate Embedding (Vector)
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: textChunk
      })
    });
    
    const embeddingData = await embeddingResponse.json();
    const vector = embeddingData.data[0].embedding;

    // 5. Save to 'statement_chunks'
    const { error: insertError } = await supabase
      .from('statement_chunks')
      .insert({
        statement_id: statementId,
        chunk_content: textChunk,
        embedding: vector
      });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});