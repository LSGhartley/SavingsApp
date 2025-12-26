import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Buffer } from "node:buffer"; // <--- THIS FIXES THE ERROR
import pdf from "npm:pdf-parse@1.1.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("1. Request received");
    const { filePath } = await req.json();
    if (!filePath) throw new Error("No filePath provided");

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download PDF
    console.log("2. Downloading:", filePath);
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('statements')
      .download(filePath);

    if (downloadError) throw downloadError;

    // Convert to Buffer (The fix!)
    console.log("3. Converting to Buffer...");
    const arrayBuffer = await fileData.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Parse PDF
    console.log("4. Parsing PDF...");
    const pdfData = await pdf(pdfBuffer);
    const rawText = pdfData.text;

    console.log("5. Text Extracted (Length):", rawText.length);

    // OpenAI Processing
    console.log("6. Sending to OpenAI...");
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Extract transactions from this bank statement text into a JSON array.
            Format: [{ "date": "YYYY-MM-DD", "desc": "Description", "amount": 10.00, "type": "expense" }]
            - Use "income" for deposits/salaries.
            - Return ONLY valid JSON. No markdown.`
          },
          {
            role: 'user',
            content: rawText.substring(0, 10000)
          }
        ],
        temperature: 0,
      }),
    });

    const aiData = await response.json();
    
    if (aiData.error) {
      throw new Error("OpenAI Error: " + aiData.error.message);
    }

    // Clean JSON
    const content = aiData.choices[0].message.content;
    const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const transactions = JSON.parse(cleanJson);

    return new Response(JSON.stringify({ success: true, data: transactions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Function Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});