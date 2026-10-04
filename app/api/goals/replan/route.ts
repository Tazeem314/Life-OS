import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { goal, reason, daysRemaining } = await req.json();

    if (!goal || !goal.title) {
      return NextResponse.json({ error: 'Valid goal object is required' }, { status: 400 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const systemInstruction = `You are an expert adaptive coach and replanning strategist in Life OS.
A user has fallen behind or needs to adjust their goal roadmap.
Today's date is: ${todayStr}.

CRITICAL PRINCIPLES:
1. Never silently delete existing progress or historical work.
2. Formulate a realistic, compassionate, and motivating catch-up or revised schedule.
3. Redistribute the remaining workload across the remaining days or extend deadlines reasonably if agreed.
4. Output strictly valid JSON matching the schema.`;

    const userPrompt = `GOAL TO REPLAN:
Title: "${goal.title}"
Category: ${goal.category}
Current Progress: ${goal.progress}% (Current: ${goal.currentValue} / Target: ${goal.targetValue} ${goal.unit || ''})
Target Date: ${goal.targetDate}
Time Horizon: ${goal.timeHorizon}
Current Status: ${goal.status}
Days Remaining to Target: ${daysRemaining ?? 'Calculated from today'}
Reason for replanning: ${reason || 'User requested catch-up adjustment'}

Current Milestones:
${JSON.stringify(goal.milestones || [], null, 2)}

Please analyze the delay, evaluate feasibility, redistribute pending milestones, provide prioritized actions to regain momentum, and suggest adjusted milestone deadlines.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pacingSummary: { type: Type.STRING },
            revisedStatus: {
              type: Type.STRING,
              enum: ['on_track', 'at_risk', 'active', 'delayed'],
            },
            workloadRedistribution: { type: Type.STRING },
            adjustedMilestones: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  deadline: { type: Type.STRING },
                  status: {
                    type: Type.STRING,
                    enum: ['not_started', 'in_progress', 'completed'],
                  },
                  progress: { type: Type.NUMBER },
                },
                required: ['title', 'deadline', 'status', 'progress'],
              },
            },
            recommendedPriorities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            scheduleAdjustmentAdvice: { type: Type.STRING },
          },
          required: [
            'pacingSummary',
            'revisedStatus',
            'workloadRedistribution',
            'adjustedMilestones',
            'recommendedPriorities',
            'scheduleAdjustmentAdvice',
          ],
        },
      },
    });

    const text = response.text;
    if (!text) {
      return NextResponse.json({ error: 'No output generated from AI' }, { status: 500 });
    }

    const data = JSON.parse(text);
    return NextResponse.json({ success: true, replan: data });
  } catch (error) {
    console.error('Error generating AI Goal Replan:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to replan goal' },
      { status: 500 }
    );
  }
}
