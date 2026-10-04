import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { reviewType, goals, recentCompletionsCount, userName } = await req.json();

    const todayStr = new Date().toISOString().split('T')[0];

    const systemInstruction = `You are the executive strategic advisor in Life OS.
You conduct ${reviewType || 'Daily AI Briefing'} reviews synthesizing goals, milestones, habits, and deadlines.
Today's date is: ${todayStr}.

Generate a concise, high-impact review:
1. An inspiring 2-3 sentence executive briefing
2. Clear identification of goals progressing well (on-track)
3. Direct identification of goals falling behind / at-risk with exact reasons
4. Imminent deadlines in chronological order with days remaining
5. Top 3 recommended high-leverage priorities for today/this week
6. Practical, actionable calibration tips.

Output strictly valid JSON.`;

    const userPrompt = `Review Type: ${reviewType || 'Daily Briefing'}
User: ${userName || 'Productive Achiever'}
Active Goals summary:
${JSON.stringify(
  (goals || []).map((g: any) => ({
    title: g.title,
    category: g.category,
    progress: `${g.progress}%`,
    status: g.status,
    targetDate: g.targetDate,
    timeHorizon: g.timeHorizon,
    currentValue: g.currentValue,
    targetValue: g.targetValue,
    unit: g.unit,
    pendingMilestones: (g.milestones || [])
      .filter((m: any) => m.status !== 'completed')
      .map((m: any) => ({ title: m.title, deadline: m.deadline })),
  })),
  null,
  2
)}
Completed actions today/recently: ${recentCompletionsCount ?? 0}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            briefing: { type: Type.STRING },
            onTrackGoals: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            atRiskGoals: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            upcomingDeadlines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  deadline: { type: Type.STRING },
                  daysLeft: { type: Type.NUMBER },
                },
                required: ['title', 'deadline', 'daysLeft'],
              },
            },
            recommendedPriorities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            actionableTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            'briefing',
            'onTrackGoals',
            'atRiskGoals',
            'upcomingDeadlines',
            'recommendedPriorities',
            'actionableTips',
          ],
        },
      },
    });

    const text = response.text;
    if (!text) {
      return NextResponse.json({ error: 'No output generated from AI' }, { status: 500 });
    }

    const data = JSON.parse(text);
    return NextResponse.json({ success: true, report: data });
  } catch (error) {
    console.error('Error generating AI Goal Review:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate review' },
      { status: 500 }
    );
  }
}
