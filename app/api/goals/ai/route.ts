import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, goalData, userPrompt, existingContext } = body;

    if (!action) {
      return NextResponse.json({ error: 'Missing action parameter' }, { status: 400 });
    }

    if (action === 'generate_plan') {
      const prompt = `You are an expert curriculum and strategic planning engine for Life OS.
The user wants to create a goal with:
Title: "${goalData?.title || 'Goal'}"
Category: "${goalData?.category || 'Study'}"
Measurement Type: "${goalData?.measurementType || 'curriculum'}"
Start Date: "${goalData?.startDate || 'today'}"
Deadline: "${goalData?.deadline || '3 months from now'}"
Available Days: ${goalData?.availableDays || 90}
Why this goal matters: "${goalData?.why || 'Personal growth'}"
Additional prompt/notes: "${userPrompt || ''}"

Return ONLY valid JSON (no markdown formatting, no code blocks) matching this schema:
{
  "title": string,
  "description": string,
  "why": string,
  "category": string,
  "durationType": string,
  "measurementType": string,
  "targetValue": number,
  "currentValue": number,
  "unit": string,
  "deadline": string,
  "bufferDaysRecommendation": number,
  "strategicAdvice": string,
  "chapters": [
    {
      "number": number,
      "title": string,
      "difficulty": "easy" | "medium" | "hard" | "very_hard",
      "assignedDays": number,
      "notes": string,
      "subtopics": [
        { "title": string, "assignedDays": number }
      ]
    }
  ],
  "monthlyTargets": [string],
  "weeklyTargets": [string],
  "suggestedTasks": [string],
  "suggestedHabits": [
    { "name": string, "frequency": "daily" | "weekdays" | "weekly", "category": string, "icon": string, "color": string }
  ]
}

IMPORTANT:
- NEVER divide days equally between chapters! Assign realistic effort per chapter (e.g. 3 days easy, 5 days medium, 7-8 days hard/lengthy).
- Total chapter days plus buffer must not exceed available days (${goalData?.availableDays || 90}).
- Include subtopics with realistic days for key chapters.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      return NextResponse.json({ success: true, plan: parsed });
    }

    if (action === 'replan_recovery') {
      const prompt = `You are an intelligent recovery and replanning assistant for Life OS.
Goal: "${goalData?.title}"
Current Progress: ${goalData?.progress || 0}%
Planned Progress: ${goalData?.plannedProgress || 0}%
Deadline: "${goalData?.deadline}"
Days Remaining: ${goalData?.daysRemaining || 30}
Pacing Context: "${userPrompt || 'Falling behind schedule'}"
Existing Chapters/Milestones: ${JSON.stringify((goalData?.chapters || []).slice(0, 10))}

Return ONLY valid JSON with this structure:
{
  "pacingSummary": string,
  "revisedStatus": "on_track" | "at_risk" | "behind",
  "workloadRedistribution": string,
  "proposedChanges": [
    {
      "id": string,
      "type": "extend_chapter" | "reduce_buffer" | "shift_deadline" | "add_practice_day" | "move_revision",
      "description": string,
      "impact": string
    }
  ],
  "recommendedPriorities": [string],
  "scheduleAdjustmentAdvice": string
}

Rule: Propose safe, realistic changes. Do not wipe out user progress. Always provide actionable adjustments the user can Apply, Edit, or Reject.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      return NextResponse.json({ success: true, replan: parsed });
    }

    if (action === 'weekly_review') {
      const prompt = `You are a productivity review analyst for Life OS.
Reviewing weekly progress for goal: "${goalData?.title}".
Planned actions: ${goalData?.plannedCount || 10}
Completed actions: ${goalData?.completedCount || 8}
Completion rate: ${goalData?.completionRate || 80}%
Progress gained: +${goalData?.progressGained || 12}%
User notes on what went well: "${goalData?.whatWentWell || ''}"
User notes on what was missed: "${goalData?.whatWasMissed || ''}"

Return ONLY valid JSON:
{
  "briefing": string,
  "praise": string,
  "riskWarning": string,
  "nextWeekTactics": [string],
  "actionableTips": [string]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      return NextResponse.json({ success: true, review: parsed });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    console.error('Error in /api/goals/ai:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
