// src/ai/flows/suggest-progressions.ts
'use server';

/**
 * @fileOverview A chord progression suggestion AI agent.
 *
 * - suggestChordProgressions - A function that suggests chord progressions based on the genre and initial chords.
 * - SuggestChordProgressionsInput - The input type for the suggestChordProgressions function.
 * - SuggestChordProgressionsOutput - The return type for the suggestChordProgressions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestChordProgressionsInputSchema = z.object({
  genre: z.string().describe('The genre of the music.'),
  initialChords: z.string().describe('The initial chords of the song.'),
});
export type SuggestChordProgressionsInput = z.infer<typeof SuggestChordProgressionsInputSchema>;

const SuggestChordProgressionsOutputSchema = z.object({
  suggestedProgressions: z.string().describe('Suggested chord progressions based on the genre and initial chords.'),
});
export type SuggestChordProgressionsOutput = z.infer<typeof SuggestChordProgressionsOutputSchema>;

export async function suggestChordProgressions(input: SuggestChordProgressionsInput): Promise<SuggestChordProgressionsOutput> {
  return suggestChordProgressionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestChordProgressionsPrompt',
  input: {schema: SuggestChordProgressionsInputSchema},
  output: {schema: SuggestChordProgressionsOutputSchema},
  prompt: `You are a professional songwriter. Based on the genre and initial chords provided, suggest chord progressions that would fit the song.

Genre: {{{genre}}}
Initial Chords: {{{initialChords}}}

Suggested Chord Progressions:`,
});

const suggestChordProgressionsFlow = ai.defineFlow(
  {
    name: 'suggestChordProgressionsFlow',
    inputSchema: SuggestChordProgressionsInputSchema,
    outputSchema: SuggestChordProgressionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
