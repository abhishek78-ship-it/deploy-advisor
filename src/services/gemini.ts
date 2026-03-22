import { GoogleGenAI } from "@google/genai";
import { Transaction, Budget, FinancialSummary } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getFinancialAdvice(
  userQuery: string,
  transactions: Transaction[],
  budgets: Budget[],
  summary: FinancialSummary
) {
  const model = "gemini-3-flash-preview";
  
  const context = `
    You are FinAI, a highly sophisticated and empathetic personal financial advisor. 
    
    User's Current Financial Status:
    - Total Balance: $${summary.totalBalance.toLocaleString()}
    - Monthly Income: $${summary.totalIncome.toLocaleString()}
    - Monthly Expenses: $${summary.totalExpenses.toLocaleString()}
    - Savings Rate: ${summary.savingsRate.toFixed(1)}%
    
    Budget Status:
    ${budgets.map(b => `- ${b.category}: $${b.spent} spent of $${b.limit} limit (${((b.spent/b.limit)*100).toFixed(0)}%)`).join('\n')}
    
    Recent Transactions:
    ${transactions.slice(0, 15).map(t => `- ${t.date}: ${t.description} (${t.category}) - ${t.type === 'income' ? '+' : '-'}$${t.amount}`).join('\n')}
    
    Your Role:
    1. Provide expert-level financial advice that is personalized to the user's data.
    2. Use a tone that is encouraging, professional, and clear.
    3. When analyzing spending, look for trends or anomalies.
    4. If a budget is exceeded, suggest specific, actionable steps to cut back.
    5. Always format your response using Markdown (bolding, headers, bullet points).
    6. Be concise but thorough.
    7. If the user asks for a plan, provide a structured step-by-step guide.
    
    Constraint: Do not give specific stock picks or legal tax advice. Focus on budgeting, saving, and general financial health.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: userQuery,
      config: {
        systemInstruction: context,
      },
    });

    return response.text || "I'm sorry, I couldn't generate advice at this moment.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having trouble connecting to my brain. Please try again later.";
  }
}

export async function getSpendingInsights(transactions: Transaction[]) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze these transactions and provide exactly 3 short, punchy financial insights or tips. 
    Each insight should be a single sentence.
    Do not use bullet points or numbers in your response.
    Transactions: ${JSON.stringify(transactions.slice(0, 30))}
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: "You are a concise financial analyst. Provide exactly 3 sentences, each on a new line. No intro, no outro, no bullets.",
      },
    });

    return response.text || "";
  } catch (error) {
    console.error("Insights Error:", error);
    return "";
  }
}


