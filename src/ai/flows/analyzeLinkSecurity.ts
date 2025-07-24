
'use server';
/**
 * @fileOverview A security agent that analyzes link activity for fraudulent behavior.
 * 
 * - analyzeLinkSecurity - A function that handles the security analysis of a link.
 * - AnalyzeLinkSecurityInput - The input type for the analyzeLinkSecurity function.
 * - AnalyzeLinkSecurityOutput - The return type for the analyzeLinkSecurity function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

const AnalyzeLinkSecurityInputSchema = z.object({
  linkId: z.string().describe("The ID of the link to analyze."),
});
export type AnalyzeLinkSecurityInput = z.infer<typeof AnalyzeLinkSecurityInputSchema>;

const AnalyzeLinkSecurityOutputSchema = z.object({
  isSuspicious: z.boolean().describe("Whether the link's activity is deemed suspicious."),
  riskLevel: z.enum(['none', 'moderate', 'high']).describe("The assessed risk level."),
  reason: z.string().describe("The reason for the suspicion."),
  analyzedClicks: z.number().describe("The number of clicks that were analyzed."),
});
export type AnalyzeLinkSecurityOutput = z.infer<typeof AnalyzeLinkSecurityOutputSchema>;

// Exported wrapper function to be called from the frontend.
export async function analyzeLinkSecurity(input: AnalyzeLinkSecurityInput): Promise<AnalyzeLinkSecurityOutput> {
  return analyzeLinkSecurityFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeLinkSecurityPrompt',
  input: { schema: z.object({ clickTimestamps: z.array(z.string()) }) },
  output: { schema: AnalyzeLinkSecurityOutputSchema },
  prompt: `You are an expert fraud detection analyst for a link shortening service. Your task is to analyze a series of click timestamps for a specific link and determine if the activity seems robotic, fraudulent, or otherwise non-human.

  Analyze the following list of click timestamps. Look for patterns like:
  - Very rapid, successive clicks (e.g., multiple clicks within the same second).
  - Perfectly uniform intervals between clicks (e.g., one click exactly every 5.0 seconds).
  - Large bursts of activity in a very short time frame.
  - Any other pattern that deviates from normal human interaction.
  
  Based on your analysis, determine if the activity is suspicious. 
  - If it is highly suspicious (e.g., clear bot-like patterns, massive bursts), set 'isSuspicious' to true and 'riskLevel' to 'high'.
  - If there are some anomalies but it's not definitively a bot, set 'isSuspicious' to true and 'riskLevel' to 'moderate'.
  - If the activity seems normal, set 'isSuspicious' to false and 'riskLevel' to 'none'.
  
  Provide a brief 'reason' for your conclusion.
  
  Click Timestamps (ISO 8601 format):
  {{{json clickTimestamps}}}
  `,
});

const analyzeLinkSecurityFlow = ai.defineFlow(
  {
    name: 'analyzeLinkSecurityFlow',
    inputSchema: AnalyzeLinkSecurityInputSchema,
    outputSchema: AnalyzeLinkSecurityOutputSchema,
  },
  async (input) => {
    // 1. Fetch the last 200 clicks for the given linkId
    const clicksQuery = query(
      collection(db, 'clicks'),
      where('linkId', '==', input.linkId),
      orderBy('timestamp', 'desc'),
      limit(200)
    );
    const clicksSnapshot = await getDocs(clicksQuery);

    if (clicksSnapshot.empty) {
      return {
        isSuspicious: false,
        riskLevel: 'none',
        reason: 'No clicks found for this link.',
        analyzedClicks: 0,
      };
    }

    const clickTimestamps = clicksSnapshot.docs.map(doc => {
        const timestamp = doc.data().timestamp;
        return timestamp ? new Date(timestamp.seconds * 1000).toISOString() : '';
    }).filter(Boolean);

    // 2. Call the AI prompt with the timestamps
    const { output } = await prompt({ clickTimestamps });

    // 3. Return the AI's analysis
    return { ...output!, analyzedClicks: clickTimestamps.length };
  }
);
