
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
import { collection, query, where, getDocs, limit, Timestamp } from 'firebase/firestore';

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

const PromptInputSchema = AnalyzeLinkSecurityInputSchema.extend({
    clickTimestamps: z.array(z.string()).describe("A list of click timestamps in ISO 8601 format."),
});

const prompt = ai.definePrompt({
  name: 'analyzeLinkSecurityPrompt',
  input: { schema: PromptInputSchema },
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
  
  Click Timestamps:
  {{#each clickTimestamps}}
  - {{this}}
  {{/each}}
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
    
    // 2. Sort the clicks by timestamp descending in code
    const sortedDocs = clicksSnapshot.docs.sort((a, b) => {
        const timestampA = a.data().timestamp as Timestamp;
        const timestampB = b.data().timestamp as Timestamp;
        // Handle cases where timestamp might be null or undefined
        if (!timestampA) return 1;
        if (!timestampB) return -1;
        return timestampB.seconds - timestampA.seconds;
    });

    const clickTimestamps = sortedDocs.map(doc => {
        const timestamp = doc.data().timestamp as Timestamp;
        return timestamp ? new Date(timestamp.seconds * 1000).toISOString() : '';
    }).filter(Boolean);

    // 3. Call the AI prompt with the correct data structure
    const { output } = await prompt({ 
        ...input, 
        clickTimestamps 
    });

    // 4. Return the AI's analysis, ensuring output is not null
    if (!output) {
      throw new Error("AI analysis did not return a valid output.");
    }
    return { ...output, analyzedClicks: clickTimestamps.length };
  }
);
