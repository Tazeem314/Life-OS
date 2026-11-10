import { NextRequest, NextResponse } from 'next/server';
import { generateContentWithRetryAndFallback } from '@/lib/gemini-server';
import { generateLocalSavingsAdvice, DEFAULT_SAVINGS_SETTINGS, formatCurrency } from '@/lib/savings-service';
import { AISavingsInsight, SavingsGoal, SavingsTransaction, SavingsSettings } from '@/lib/types';

function cleanJsonText(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

export async function POST(req: NextRequest) {
  let goals: SavingsGoal[] = [];
  let transactions: SavingsTransaction[] = [];
  let settings: SavingsSettings = DEFAULT_SAVINGS_SETTINGS;
  let userQuestion: string | undefined;

  try {
    const body = await req.json();
    goals = Array.isArray(body.goals) ? body.goals : [];
    transactions = Array.isArray(body.transactions) ? body.transactions : [];
    settings = body.settings || DEFAULT_SAVINGS_SETTINGS;
    userQuestion = body.userQuestion || body.prompt;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 });
  }

  // Pre-calculate baseline local metrics
  const fallbackAdvice = generateLocalSavingsAdvice(goals, transactions, settings);
  const cur = settings.currency || '$';

  // If Gemini API Key is missing or user has zero transactions, provide instantaneous local insight
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(fallbackAdvice);
  }

  const prompt = `
You are a senior personal finance strategist and financial coach embedded inside Life OS.
Analyze the user's authentic savings data and generate high-impact, actionable savings advice.

User Settings:
- Currency: ${cur}
- Monthly Savings Target: ${formatCurrency(settings.monthlyTarget || 500, cur)}

Current Financial Reality:
- Total Net Recorded Savings: ${formatCurrency(fallbackAdvice.goalRecommendations ? goals.reduce((a, b) => a + (b.currentAmount || 0), 0) : 0, cur)}
- Active Savings Goals Count: ${goals.length}
- Total Transactions Logged: ${transactions.length}
- User specific question / focus: ${userQuestion || 'Overall savings health check & strategic allocation advice'}

Goals Breakdown:
${goals.map((g) => `- "${g.name}" (Category: ${g.category}): Saved ${formatCurrency(g.currentAmount, cur)} of ${formatCurrency(g.targetAmount, cur)} target. Deadline: ${g.targetDate || 'None'}`).join('\n') || 'No goals created yet.'}

Recent Transactions (Last 10):
${transactions.slice(0, 10).map((t) => `- ${t.date} | ${t.type.toUpperCase()}: ${formatCurrency(t.amount, cur)} | Category: ${t.category} | Notes: ${t.notes || 'N/A'}`).join('\n') || 'No transactions logged yet.'}

Rules:
1. Strict objectivity: use ONLY the real figures provided above. Do NOT invent phantom accounts or fake debt.
2. Provide an honest health score (0-100) and health status ('Excellent' | 'Good' | 'Fair' | 'Needs Attention').
3. Deliver crisp, motivational, actionable advice.
4. Output MUST be valid JSON strictly adhering to the schema below. No markdown outside the JSON block.

JSON Schema:
{
  "headline": "Short 1-sentence punchy headline summarizing current savings posture",
  "summary": "2-3 sentences explaining the core diagnosis, allocation balance, and cashflow pace",
  "healthScore": 85,
  "healthStatus": "Good",
  "monthlyRunwayOrGrowth": "+$450 / month net growth pace",
  "goalRecommendations": [
    {
      "goalId": "goal_id_if_matched",
      "goalName": "Goal Name",
      "recommendedMonthly": 250,
      "projectedCompletion": "~4 months",
      "advice": "Specific tactical guidance for this milestone"
    }
  ],
  "actionableTips": [
    "Tip 1...",
    "Tip 2...",
    "Tip 3..."
  ]
}
`.trim();

  try {
    const aiResponse = await generateContentWithRetryAndFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    const text = aiResponse?.text;
    if (!text) {
      return NextResponse.json(fallbackAdvice);
    }

    const cleaned = cleanJsonText(text);
    const parsed: AISavingsInsight = JSON.parse(cleaned);

    return NextResponse.json({
      headline: parsed.headline || fallbackAdvice.headline,
      summary: parsed.summary || fallbackAdvice.summary,
      healthScore: typeof parsed.healthScore === 'number' ? parsed.healthScore : fallbackAdvice.healthScore,
      healthStatus: parsed.healthStatus || fallbackAdvice.healthStatus,
      monthlyRunwayOrGrowth: parsed.monthlyRunwayOrGrowth || fallbackAdvice.monthlyRunwayOrGrowth,
      goalRecommendations: Array.isArray(parsed.goalRecommendations) && parsed.goalRecommendations.length > 0
        ? parsed.goalRecommendations
        : fallbackAdvice.goalRecommendations,
      actionableTips: Array.isArray(parsed.actionableTips) && parsed.actionableTips.length > 0
        ? parsed.actionableTips
        : fallbackAdvice.actionableTips,
    });
  } catch (err) {
    console.warn('Gemini API failed in savings route, using robust local financial advice fallback:', err);
    return NextResponse.json(fallbackAdvice);
  }
}
