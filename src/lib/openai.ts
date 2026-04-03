/**
 * OpenAI client singleton.
 *
 * Set OPENAI_API_KEY in your environment (or .env.local) to enable AI-powered
 * analysis features in the dashboard.
 *
 * The key is server-side only — never expose it to the browser.
 */

import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY ?? "";

export const openai = apiKey ? new OpenAI({ apiKey }) : null;
