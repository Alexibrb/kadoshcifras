// src/ai/flows/suggest-progressions.ts
'use server';

/**
 * @fileOverview Um agente de IA para sugestão de progressão de acordes.
 *
 * - suggestChordProgressions - Uma função que sugere progressões de acordes com base no gênero e nos acordes iniciais.
 * - SuggestChordProgressionsInput - O tipo de entrada para a função suggestChordProgressions.
 * - SuggestChordProgressionsOutput - O tipo de retorno para a função suggestChordProgressions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const SuggestChordProgressionsInputSchema = z.object({
  genre: z.string().describe('O gênero da música.'),
  initialChords: z.string().describe('Os acordes iniciais da música.'),
});
export type SuggestChordProgressionsInput = z.infer<typeof SuggestChordProgressionsInputSchema>;

const SuggestChordProgressionsOutputSchema = z.object({
  suggestedProgressions: z.string().describe('Progressões de acordes sugeridas com base no gênero e nos acordes iniciais.'),
});
export type SuggestChordProgressionsOutput = z.infer<typeof SuggestChordProgressionsOutputSchema>;

export async function suggestChordProgressions(input: SuggestChordProgressionsInput): Promise<SuggestChordProgressionsOutput> {
  return suggestChordProgressionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestChordProgressionsPrompt',
  model: googleAI('gemini-pro'),
  input: {schema: SuggestChordProgressionsInputSchema},
  output: {
    format: 'json',
    schema: SuggestChordProgressionsOutputSchema
  },
  prompt: `Você é um compositor profissional. Com base no gênero e nos acordes iniciais fornecidos, sugira progressões de acordes que se encaixem na música.

Gênero: {{{genre}}}
Acordes Iniciais: {{{initialChords}}}

Progressões de Acordes Sugeridas:`,
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
