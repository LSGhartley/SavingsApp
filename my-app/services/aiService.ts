// services/aiService.ts

const OPENAI_API_KEY = process.env.PUBLIC_OPENAI_API_KEY || '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'; // <--- PASTE YOUR KEY HERE

export const classifyTransaction = async (description: string, amount: number) => {
  try {
    const prompt = `
      You are a financial classifier.
      Categorize this transaction: "${description}" with amount $${amount}.
      
      Strictly choose ONE category from this list:
      [Housing, Food, Transport, Shopping, Utilities, Health, Entertainment, Salary, Withdrwal, Interbank Transfer]
      
      If you represent income/salary, choose "Salary".
      If you are unsure, choose "Uncategorized".
      
      Reply with ONLY the category name. No punctuation.
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // or "gpt-4o-mini" for cheaper/faster results
        messages: [
          { role: "system", content: "You are a helpful financial assistant." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3, // Low creativity, high precision
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("OpenAI Error:", data.error.message);
      return 'Uncategorized';
    }

    const category = data.choices[0].message.content.trim();
    return category;

  } catch (error) {
    console.error('AI Service Error:', error);
    return 'Uncategorized';
  }
};