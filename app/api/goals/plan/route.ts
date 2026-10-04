import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { prompt, timeframe, category, isAcademic } = await req.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const systemInstruction = `You are an elite productivity architect and master goal strategist for Life OS.
Your role is to transform natural language user goals into deeply structured, actionable, and realistic execution roadmaps.
Today's date is: ${todayStr}.

Convert the user's natural language goal into a comprehensive blueprint with:
1. Clear, concise title and motivating description
2. Time horizon (one of: 'today', 'this_week', 'this_month', '3_months', '6_months', 'this_year', 'long_term')
3. Category (e.g. 'Academic & Study', 'Career & Work', 'Health & Fitness', 'Finance & Savings', 'Personal Growth', 'Projects')
4. Measurement type (one of: 'checkbox', 'number', 'counter', 'percentage', 'streak', 'milestones')
5. Target numerical value, current value (usually 0), and unit (e.g., 'chapters', 'questions', 'hours', 'papers', '%', '$', 'sessions')
6. Calculated target completion date in YYYY-MM-DD
7. Structured sequential Milestones (3-6 realistic milestones) with specific target deadlines (YYYY-MM-DD), descriptions, and titles
8. Concrete monthly targets (if multi-month) and weekly targets
9. Suggested daily actionable tasks that can be added to the user's to-do list
10. Suggested daily or weekly habits with sensible frequencies and icons (e.g., 'BookOpen', 'Brain', 'Code', 'Dumbbell', 'Target', 'Pencil')
11. Suggested trackers (especially academic targets like Chapters, Questions, Revision Sessions, Sample Papers, Mock Tests if academic/study)
12. Strategic advice and tips to guarantee success and avoid burnout

Be realistic, encourage momentum, and provide measurable milestones. Output strictly JSON.`;

    const userContent = `User Goal: "${prompt.trim()}"
Preferred Timeframe: ${timeframe || 'Determine best timeframe'}
Preferred Category: ${category || 'Auto-detect'}
Academic / Study focus: ${isAcademic ? 'YES' : 'Auto-detect'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userContent,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            timeHorizon: {
              type: Type.STRING,
              enum: ['today', 'this_week', 'this_month', '3_months', '6_months', 'this_year', 'long_term'],
            },
            measurementType: {
              type: Type.STRING,
              enum: ['checkbox', 'number', 'counter', 'percentage', 'streak', 'milestones'],
            },
            targetValue: { type: Type.NUMBER },
            currentValue: { type: Type.NUMBER },
            unit: { type: Type.STRING },
            targetDate: { type: Type.STRING },
            milestones: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  deadline: { type: Type.STRING },
                  progress: { type: Type.NUMBER },
                },
                required: ['title', 'deadline'],
              },
            },
            monthlyTargets: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            weeklyTargets: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            suggestedTasks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            suggestedHabits: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  frequency: {
                    type: Type.STRING,
                    enum: ['daily', 'weekdays', 'weekly'],
                  },
                  category: { type: Type.STRING },
                  icon: { type: Type.STRING },
                  color: { type: Type.STRING },
                },
                required: ['name', 'frequency', 'icon', 'color'],
              },
            },
            suggestedTrackers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    enum: ['study', 'workout', 'savings', 'custom'],
                  },
                  name: { type: Type.STRING },
                  target: { type: Type.NUMBER },
                  current: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                },
                required: ['type', 'name', 'target', 'unit'],
              },
            },
            academicMetadata: {
              type: Type.OBJECT,
              properties: {
                isStudyGoal: { type: Type.BOOLEAN },
                subject: { type: Type.STRING },
                totalChapters: { type: Type.NUMBER },
                targetQuestions: { type: Type.NUMBER },
                revisionSessions: { type: Type.NUMBER },
                samplePapersTarget: { type: Type.NUMBER },
                mockTestTargetScore: { type: Type.NUMBER },
              },
            },
            strategicAdvice: { type: Type.STRING },
          },
          required: [
            'title',
            'description',
            'category',
            'timeHorizon',
            'measurementType',
            'targetValue',
            'targetDate',
            'milestones',
            'strategicAdvice',
          ],
        },
      },
    });

    const text = response.text;
    if (!text) {
      return NextResponse.json({ error: 'No output generated from AI' }, { status: 500 });
    }

    const data = JSON.parse(text);
    return NextResponse.json({ success: true, plan: data });
  } catch (error) {
    console.error('Error generating AI Goal Plan:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate goal plan' },
      { status: 500 }
    );
  }
}
