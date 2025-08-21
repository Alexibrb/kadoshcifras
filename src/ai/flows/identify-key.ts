// This file uses server-side code.
'use server';

/**
 * @fileOverview Identifica a tonalidade de uma música com base em sua progressão de acordes.
 *
 * - identifySongKey - Uma função que identifica a tonalidade da música.
 * - IdentifySongKeyInput - O tipo de entrada para a função identifySongKey.
 * - IdentifySongKeyOutput - O tipo de retorno para a função identifySongKey.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IdentifySongKeyInputSchema = z.object({
  chordProgression: z
    .string()
    .describe('A progressão de acordes da música (ex: C-G-Am-F).'),
  genre: z.string().optional().describe('O gênero da música (ex: pop, rock, jazz).'),
});
export type IdentifySongKeyInput = z.infer<typeof IdentifySongKeyInputSchema>;

const IdentifySongKeyOutputSchema = z.object({
  key: z.string().describe('A tonalidade identificada da música (ex: Dó Maior).'),
  confidence: z
    .number()
    .describe('O nível de confiança da identificação (0-1).'),
  explanation: z
    .string()
    .describe('Uma explicação de por que a tonalidade foi identificada como tal.'),
});
export type IdentifySongKeyOutput = z.infer<typeof IdentifySongKeyOutputSchema>;

export async function identifySongKey(input: IdentifySongKeyInput): Promise<IdentifySongKeyOutput> {
  return identifySongKeyFlow(input);
}

const identifySongKeyPrompt = ai.definePrompt({
  name: 'identifySongKeyPrompt',
  input: {schema: IdentifySongKeyInputSchema},
  output: {schema: IdentifySongKeyOutputSchema},
  prompt: `Você é um especialista em teoria musical. Dada uma progressão de acordes e, opcionalmente, o gênero de uma música, identifique a tonalidade da música.

Progressão de Acordes: {{{chordProgression}}}
Gênero: {{genre}}

Analise a progressão de acordes, considerando mudanças de tonalidade comuns e acordes emprestados para o gênero, se disponível. Forneça um nível de confiança (0-1) para sua identificação de tonalidade. Forneça também uma breve explicação do seu raciocínio.

Garanta que a saída esteja formatada corretamente.`,
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
