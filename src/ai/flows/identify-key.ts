// This file uses server-side code.
'use server';

/**
 * @fileOverview Identifies the key of a song based on its chord progression.
 *
 * - identifySongKey - A function that identifies the song key.
 * - IdentifySongKeyInput - The input type for the identifySongKey function.
 * - IdentifySongKeyOutput - The return type for the identifySongKey function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IdentifySongKeyInputSchema = z.object({
  chordProgression: z
    .string()
    .describe('The chord progression of the song (e.g., C-G-Am-F).'),
  genre: z.string().optional().describe('The genre of the song (e.g., pop, rock, jazz).'),
});
export type IdentifySongKeyInput = z.infer<typeof IdentifySongKeyInputSchema>;

const IdentifySongKeyOutputSchema = z.object({
  key: z.string().describe('The identified key of the song (e.g., C Major).'),
  confidence: z
    .number()
    .describe('The confidence level of the identification (0-1).'),
  explanation: z
    .string()
    .describe('An explanation of why the key was identified as such.'),
});
export type IdentifySongKeyOutput = z.infer<typeof IdentifySongKeyOutputSchema>;

export async function identifySongKey(input: IdentifySongKeyInput): Promise<IdentifySongKeyOutput> {
  return identifySongKeyFlow(input);
}

const identifySongKeyPrompt = ai.definePrompt({
  name: 'identifySongKeyPrompt',
  input: {schema: IdentifySongKeyInputSchema},
  output: {schema: IdentifySongKeyOutputSchema},
  prompt: `You are an expert music theorist. Given a chord progression and optionally the genre of a song, identify the key of the song. 

Chord Progression: {{{chordProgression}}}
Genre: {{genre}}

Analyze the chord progression, considering common key changes and borrowed chords for the genre if available. Provide a confidence level (0-1) for your key identification. Also provide a brief explanation of your reasoning.

Ensure the output is formatted correctly.`,
});

const identifySongKeyFlow = ai.defineFlow(
  {
    name: 'identifySongKeyFlow',
    inputSchema: IdentifySongKeyInputSchema,
    outputSchema: IdentifySongKeyOutputSchema,
  },
  async input => {
    const {output} = await identifySongKeyPrompt(input);
    return output!;
  }
);
