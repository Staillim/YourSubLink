
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
import { collection, query, where, getDocs, limit, Timestamp, orderBy } from 'firebase/firestore';

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
  // We wrap the main flow call in a try-catch block to handle any errors gracefully.
  try {
    return await analyzeLinkSecurityFlow(input);
  } catch (error: any) {
    console.error(`[Security Analysis Failed] for linkId ${input.linkId}:`, error);
    // Re-throw the error with a more descriptive message to be caught by the client-side transition.
    throw new Error(`Security analysis failed: ${error.message}`);
  }
}

const PromptInputSchema = AnalyzeLinkSecurityInputSchema.extend({
    clickTimestamps: z.array(z.string()).describe("A list of click timestamps in ISO 8601 format, sorted from most recent to oldest."),
});

/**
 * Converts various potential timestamp formats into a standard JavaScript Date object.
 * This function is now more robust to handle different data types.
 * @param timestamp The timestamp data, which could be a Firestore Timestamp, a JS Date, a string, or a number.
 * @returns A Date object or null if the conversion fails.
 */
const convertToDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    
    // Case 1: Firestore Timestamp object (most common)
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    // Case 2: JavaScript Date object
    if (timestamp instanceof Date) {
        return timestamp;
    }
    // Case 3: String (ISO format) or Number (milliseconds)
    // This is robust enough to handle various string formats and numeric timestamps.
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
        return date;
    }

    // If all conversions fail, return null.
    return null;
}

const prompt = ai.definePrompt({
  name: 'analyzeLinkSecurityPrompt',
  input: { schema: PromptInputSchema },
  output: { schema: AnalyzeLinkSecurityOutputSchema },
  prompt: `You are an expert fraud detection analyst for a link shortening service. Your task is to analyze a series of click timestamps for a specific link and determine if the activity seems robotic, fraudulent, or otherwise non-human.

  The timestamps are already sorted with the most recent click first. Analyze the following list of click timestamps. Look for patterns like:
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
    // Step 1: Fetch Clicks - with specific error handling
    let clicksSnapshot;
    try {
        // This is the optimal query. It requires a composite index in Firestore.
        // The index should be on: 'clicks' collection, 'linkId' (ascending), 'timestamp' (descending).
        const clicksQuery = query(
          collection(db, 'clicks'),
          where('linkId', '==', input.linkId),
          orderBy('timestamp', 'desc'),
          limit(200)
        );
        clicksSnapshot = await getDocs(clicksQuery);
    } catch (dbError) {
        throw new Error("Failed to query clicks from Firestore. A composite index is likely required.");
    }

    if (clicksSnapshot.empty) {
      return {
        isSuspicious: false,
        riskLevel: 'none',
        reason: 'No clicks found for this link.',
        analyzedClicks: 0,
      };
    }
    
    // Step 2: Process Timestamps - with specific error handling
    let clickTimestamps: string[];
    try {
        clickTimestamps = clicksSnapshot.docs
            .map(doc => {
                const rawTimestamp = doc.data().timestamp;
                const date = convertToDate(rawTimestamp);
                return date ? date.toISOString() : null;
            })
            .filter((ts): ts is string => ts !== null);

    } catch (processingError) {
        throw new Error("Failed to process click timestamps.");
    }
    
    // Step 3: Call AI Prompt - with specific error handling
    let output;
    try {
        const promptResponse = await prompt({ 
            ...input, 
            clickTimestamps 
        });
        output = promptResponse.output;
    } catch (aiError) {
        throw new Error("AI model failed to respond.");
    }

    // Step 4: Validate AI Output
    if (!output) {
      throw new Error("AI analysis did not return a valid output.");
    }

    // Return the final, validated analysis.
    return { ...output, analyzedClicks: clickTimestamps.length };
  }
);
