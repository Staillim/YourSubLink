'use server';
/**
 * @fileOverview A flow to verify a Google reCAPTCHA v3 token.
 * 
 * - verifyRecaptcha - A function that handles the verification process.
 * - VerifyRecaptchaInput - The input type for the verifyRecaptcha function.
 * - VerifyRecaptchaOutput - The return type for the verifyRecaptcha function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const VerifyRecaptchaInputSchema = z.object({
  token: z.string().describe("The reCAPTCHA token from the client."),
});
export type VerifyRecaptchaInput = z.infer<typeof VerifyRecaptchaInputSchema>;

const VerifyRecaptchaOutputSchema = z.object({
  success: z.boolean().describe("Whether the token is valid."),
  score: z.number().describe("The score of the user interaction (0.0 to 1.0)."),
  errorCodes: z.array(z.string()).optional().describe("Any error codes returned by the API."),
});
export type VerifyRecaptchaOutput = z.infer<typeof VerifyRecaptchaOutputSchema>;

export async function verifyRecaptcha(input: VerifyRecaptchaInput): Promise<VerifyRecaptchaOutput> {
  return verifyRecaptchaFlow(input);
}

const verifyRecaptchaFlow = ai.defineFlow(
  {
    name: 'verifyRecaptchaFlow',
    inputSchema: VerifyRecaptchaInputSchema,
    outputSchema: VerifyRecaptchaOutputSchema,
  },
  async ({ token }) => {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
        console.error("RECAPTCHA_SECRET_KEY is not set in environment variables.");
        return { success: false, score: 0, errorCodes: ['missing-secret-key'] };
    }

    try {
      const response = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `secret=${secretKey}&response=${token}`,
      });
      
      const data = await response.json();

      return {
        success: data.success,
        score: data.score,
        errorCodes: data['error-codes'],
      };

    } catch (error) {
      console.error("Error verifying reCAPTCHA token:", error);
      return { success: false, score: 0, errorCodes: ['server-request-failed'] };
    }
  }
);
