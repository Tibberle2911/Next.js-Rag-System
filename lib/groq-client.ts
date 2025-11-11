/**
 * Groq Integration - LLM Response Generation
 * Uses llama-3.1-8b-instant model (override with GROQ_CHAT_MODEL)
 */

import Groq from "groq-sdk"

let groqClient: Groq | null = null

export function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      throw new Error("GROQ_API_KEY not configured")
    }
    groqClient = new Groq({ apiKey })
  }
  return groqClient
}

/**
 * Clean and format LLM response
 */
export function formatResponse(text: string): string {
  if (!text) return text

  let content = text.trim()

  // Normalize bullet points
  content = content.replace(/^\s*[•*-]\s+/gm, "- ")

  // Remove markdown formatting
  content = content.replace(/\*\*(.+?)\*\*/g, "$1")
  content = content.replace(/\*(.+?)\*/g, "$1")
  content = content.replace(/__(.+?)__/g, "$1")
  content = content.replace(/_(.+?)_/g, "$1")
  content = content.replace(/`([^`]*)`/g, "$1")

  // Remove decorative prefixes
  const prefixes = ["Elevator Pitch:", "Behavioral Questions:", "Company Research:"]
  for (const prefix of prefixes) {
    const regex = new RegExp(`^\\s*${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "im")
    content = content.replace(regex, "")
  }

  // Remove generic meta disclaimers
  const metaPrefixes = [
    /^Here\s+are\s+the\s+answers/i,
    /^In\s+the\s+format\s+requested/i,
    /^Sure[,\s]/i,
    /^Certainly[,\s]/i,
  ]

  for (const regex of metaPrefixes) {
    content = content.replace(regex, "")
  }

  // Collapse multiple blank lines
  content = content.replace(/\n{3,}/g, "\n\n")

  // Ensure ends with punctuation
  if (!/[.!?](?:['""])?\s*$/.test(content)) {
    content += "."
  }

  return content.trim()
}

export interface GenerateResponseOptions {
  question: string
  context: string
  canonicalName?: string
}

/**
 * Generate response using Groq LLM
 */
export async function generateResponse(options: GenerateResponseOptions): Promise<string> {
  const client = getGroqClient()
  const chatModel = process.env.GROQ_CHAT_MODEL || "llama-3.1-8b-instant"

  const systemLines = [
    "You are an AI digital twin responding in first person. Use only the provided context unless general knowledge is trivial.",
    "Do not provide personal contact or sensitive information (email, phone, address, DOB, IDs, bank details).",
    "Write concise, recruiter-ready answers. Prefer bullet points when listing items.",
    "Keep answers between 50 and 200 words. Include quantified outcomes when available.",
    "Never include your thought process or internal reasoning in the response.",
  ]

  if (options.canonicalName) {
    systemLines.push(
      `Always use the correct name: ${options.canonicalName}. If variants are used, respond with the canonical spelling.`,
    )
  }

  const prompt = `Based on the following professional information, answer the question in first person.

Context:
${options.context}

Question: ${options.question}

Provide a helpful, professional response:`

  try {
    const completion = await client.chat.completions.create({
      model: chatModel,
      messages: [
        {
          role: "system",
          content: systemLines.join(" "),
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 750,
    })

    const responseText = completion.choices[0].message.content || ""
    return formatResponse(responseText)
  } catch (error) {
    console.error("Groq API error:", error)
    throw error
  }
}
