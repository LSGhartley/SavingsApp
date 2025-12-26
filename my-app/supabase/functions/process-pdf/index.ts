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
            content: `You are a banking data extraction AI. 
            
            TASK 1: Extract Metadata
            Find the "Bank Name" (e.g., Standard Bank, FNB, Capitec, Tymebank, ABSA) and "Account Number".
            
            TASK 2: Extract Transactions
            List all transactions.
            
            TASK 3: Categorize
            Assign a category to each transaction from this list ONLY:
            ['Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Health', 'Salary', 'Cash/ATM', 'Savings/Investments', 'Loans', 'EFT/Transfer', 'Uncategorized'].

            OUTPUT FORMAT (JSON ONLY):
            {
              "metadata": {
                "bank": "Bank Name",
                "account": "12345"
              },
              "transactions": [
                { "date": "YYYY-MM-DD", "desc": "Description", "amount": 100.00, "type": "expense", "category": "Food" }
              ]
            }
            `
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
  // ... inside the try/catch block ...
    
    // Clean JSON
    const content = aiData.choices[0].message.content;
    const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const resultData = JSON.parse(cleanJson); // This now has { metadata, transactions }

    return new Response(JSON.stringify({ success: true, data: resultData }), {
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