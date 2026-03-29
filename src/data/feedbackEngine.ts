import { Persona, ReactionType } from "./personas";

// Keywords that trigger specific persona reactions
const KEYWORD_REACTIONS: Record<string, { positive: string[]; negative: string[] }> = {
  analytical: {
    positive: ["data", "metrics", "research", "study", "evidence", "analysis", "percentage", "growth", "ROI", "measurable"],
    negative: ["feel", "believe", "trust me", "revolutionary", "disrupting", "game-changer"],
  },
  emotional: {
    positive: ["community", "people", "lives", "impact", "change", "help", "together", "equity", "accessible", "fair"],
    negative: ["profit", "margin", "shareholder", "bottom line", "cost-cutting", "efficiency"],
  },
  skeptical: {
    positive: ["proven", "track record", "conservative", "risk-adjusted", "precedent", "tested", "validated"],
    negative: ["revolutionary", "unprecedented", "trust", "believe", "disrupt", "moon-shot", "paradigm"],
  },
  supportive: {
    positive: ["honest", "realistic", "practical", "step-by-step", "achievable", "empathy", "patient", "care"],
    negative: ["aggressive", "dominate", "crush", "destroy", "competition", "winner-take-all"],
  },
  blunt: {
    positive: ["straightforward", "direct", "bottom line", "facts", "numbers", "concrete", "specific", "plan"],
    negative: ["maybe", "possibly", "hope", "wish", "someday", "aspire", "dream", "vision"],
  },
};

export interface ReactionEvent {
  personaId: string;
  type: ReactionType;
  emoji?: string;
  timestamp: number;
}

export interface FeedbackItem {
  personaId: string;
  personaName: string;
  overallScore: number; // 1-10
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestion: string;
  emotionalResponse: string;
}

function countKeywordHits(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.reduce((count, kw) => count + (lower.includes(kw.toLowerCase()) ? 1 : 0), 0);
}

export function generateLiveReaction(persona: Persona, userText: string): ReactionEvent | null {
  const style = persona.communicationStyle;
  const reactions = KEYWORD_REACTIONS[style];
  if (!reactions) return null;

  const posHits = countKeywordHits(userText, reactions.positive);
  const negHits = countKeywordHits(userText, reactions.negative);

  // Also check persona priorities and pet peeves
  const priorityHits = countKeywordHits(userText, persona.priorities);
  const peeveHits = countKeywordHits(userText, persona.pet_peeves);

  const totalPos = posHits + priorityHits;
  const totalNeg = negHits + peeveHits;

  // Random factor — not every sentence triggers a reaction
  if (Math.random() > 0.6 && totalPos === 0 && totalNeg === 0) return null;

  let type: ReactionType;
  let emoji: string | undefined;

  if (totalPos > totalNeg + 1) {
    type = Math.random() > 0.5 ? "nod" : "smile";
    emoji = Math.random() > 0.5 ? "👍" : "😊";
  } else if (totalNeg > totalPos + 1) {
    type = Math.random() > 0.5 ? "shake" : "frown";
    emoji = Math.random() > 0.5 ? "🤔" : "😐";
  } else if (totalPos > 0 || totalNeg > 0) {
    type = "think";
    emoji = "🤔";
  } else {
    // Random ambient reactions
    const ambient: ReactionType[] = ["neutral", "think", "nod"];
    type = ambient[Math.floor(Math.random() * ambient.length)];
  }

  return { personaId: persona.id, type, emoji, timestamp: Date.now() };
}

export function generateSessionFeedback(persona: Persona, fullTranscript: string): FeedbackItem {
  const style = persona.communicationStyle;
  const reactions = KEYWORD_REACTIONS[style] || { positive: [], negative: [] };

  const posHits = countKeywordHits(fullTranscript, reactions.positive);
  const negHits = countKeywordHits(fullTranscript, reactions.negative);
  const priorityHits = countKeywordHits(fullTranscript, persona.priorities);
  const peeveHits = countKeywordHits(fullTranscript, persona.pet_peeves);

  const totalPos = posHits + priorityHits;
  const totalNeg = negHits + peeveHits;
  const wordCount = fullTranscript.split(/\s+/).length;

  // Score calculation
  let score = 5; // baseline
  score += Math.min(totalPos * 0.8, 3);
  score -= Math.min(totalNeg * 0.8, 3);
  if (wordCount > 100) score += 0.5; // reward substance
  if (wordCount < 20) score -= 1; // penalize brevity
  score = Math.max(1, Math.min(10, Math.round(score * 10) / 10));

  // Generate persona-specific feedback
  const feedbackTemplates = getFeedbackTemplates(persona, totalPos, totalNeg, wordCount);

  return {
    personaId: persona.id,
    personaName: persona.name,
    overallScore: score,
    ...feedbackTemplates,
  };
}

function getFeedbackTemplates(
  persona: Persona,
  posHits: number,
  negHits: number,
  wordCount: number
): { summary: string; strengths: string[]; weaknesses: string[]; suggestion: string; emotionalResponse: string } {
  const { communicationStyle, name, profession } = persona;

  // Base templates by communication style
  const templates: Record<string, () => ReturnType<typeof getFeedbackTemplates>> = {
    analytical: () => ({
      summary:
        posHits > negHits
          ? `${name} found your presentation data-informed and substantive. As someone in ${profession}, the evidence-based approach resonated.`
          : `${name} felt the presentation lacked sufficient data to support its claims. In ${profession}, decisions require hard numbers.`,
      strengths: posHits > 0 ? ["Used data and metrics to support claims", "Showed awareness of measurable outcomes"] : ["Showed confidence in delivery"],
      weaknesses:
        negHits > 0
          ? ["Relied too heavily on buzzwords without backing them up", "Could benefit from more concrete evidence"]
          : ["Could include more specific data points"],
      suggestion: "Include at least 3 concrete metrics or case studies in your next iteration. Show me the numbers.",
      emotionalResponse: posHits > negHits ? "Engaged and attentive" : "Skeptical but listening",
    }),
    emotional: () => ({
      summary:
        posHits > negHits
          ? `${name} was moved by the human element of your pitch. The focus on community impact aligned with values important to someone in ${profession}.`
          : `${name} felt the presentation was too focused on numbers and not enough on the people it would affect.`,
      strengths:
        posHits > 0 ? ["Connected the idea to real human impact", "Showed genuine passion for the topic"] : ["Delivered with confidence"],
      weaknesses:
        negHits > 0
          ? ["Felt overly corporate and detached from real people", "Could better address equity and accessibility"]
          : ["Could do more to connect with the audience emotionally"],
      suggestion: "Tell a story about a specific person whose life this would change. Make it personal.",
      emotionalResponse: posHits > negHits ? "Inspired and enthusiastic" : "Disconnected and restless",
    }),
    skeptical: () => ({
      summary:
        posHits > negHits
          ? `${name} appreciated the grounded, realistic approach. In ${profession}, there's too much hype — your presentation stood out for being measured.`
          : `${name} found the presentation overpromising and underdelivering on substance. Where's the proof this actually works?`,
      strengths: posHits > 0 ? ["Realistic expectations set", "Referenced proven approaches or precedent"] : ["Delivered clearly"],
      weaknesses:
        negHits > 0
          ? ["Too many unsubstantiated superlatives", "Needs more risk analysis and honest discussion of challenges"]
          : ["Could acknowledge potential risks more openly"],
      suggestion: "Address the top 3 risks head-on before your audience asks about them. Show me you've thought this through.",
      emotionalResponse: posHits > negHits ? "Cautiously impressed" : "Deeply skeptical",
    }),
    supportive: () => ({
      summary:
        posHits > negHits
          ? `${name} found the presentation honest and thoughtful. As someone from ${profession}, the practical, step-by-step approach was reassuring.`
          : `${name} felt the presentation was a bit aggressive in tone and could benefit from more warmth and realism.`,
      strengths:
        posHits > 0
          ? ["Came across as authentic and honest", "Showed a practical, achievable roadmap"]
          : ["Showed enthusiasm for the project"],
      weaknesses:
        negHits > 0
          ? ["Tone felt competitive rather than collaborative", "Could be more empathetic to concerns"]
          : ["Could slow down and be more reassuring"],
      suggestion: "Pause to acknowledge your audience's concerns before jumping to solutions. Build trust first.",
      emotionalResponse: posHits > negHits ? "Warm and encouraged" : "Slightly uncomfortable",
    }),
    blunt: () => ({
      summary:
        posHits > negHits
          ? `${name} liked that you got to the point. In ${profession}, time is money — and you didn't waste it.`
          : `${name} felt the presentation was too vague and wishy-washy. Get to the point and tell me exactly what you need.`,
      strengths: posHits > 0 ? ["Direct and to the point", "Included specific, actionable details"] : ["Showed conviction"],
      weaknesses:
        negHits > 0
          ? ["Too many qualifiers and hedging language", "Needs a clearer bottom-line message"]
          : ["Could be more concise and direct"],
      suggestion: "Lead with your ask. Tell me what you want, what it costs, and what I get. Then fill in the details.",
      emotionalResponse: posHits > negHits ? "Respected your directness" : "Impatient and frustrated",
    }),
  };

  const generator = templates[communicationStyle] || templates.analytical;
  const result = generator();

  // Add word-count feedback
  if (wordCount < 30) {
    result.weaknesses.push("Presentation was too brief to fully evaluate");
  }

  return result;
}

export interface HandRaiseEvent {
  personaId: string;
  question: string;
}

const HAND_RAISE_QUESTIONS: Record<string, string[]> = {
  analytical: [
    "Where are the metrics backing up that claim?",
    "What does the data show about long-term sustainability?",
    "Have you run an analysis on the competitive landscape?",
    "What's the sample size and confidence level on those numbers?",
    "How are you measuring success and what KPIs will you track?",
  ],
  emotional: [
    "How does this solution help people in underserved communities?",
    "Can you share a story about the real human impact?",
    "What does this mean for equity and accessibility?",
    "How are you ensuring this benefits the broader community?",
    "Who are the stakeholders you're most concerned about?",
  ],
  skeptical: [
    "What could go wrong with this approach?",
    "What's the failure scenario you're most worried about?",
    "Has anyone tried this before and what happened?",
    "How is this different from what's already been attempted?",
    "What do your competitors already do in this space?",
  ],
  supportive: [
    "What concerns do you have about rolling this out?",
    "How can we make sure everyone on the team feels supported?",
    "What resources do you need to succeed?",
    "Have you considered the human side of this change?",
    "How will you handle setbacks along the way?",
  ],
  blunt: [
    "What's the bottom line — how much will this cost and how long?",
    "What's the actual ROI in hard numbers?",
    "What's your plan B if this doesn't work?",
    "Cut the fluff — what's the one thing I need to know?",
    "What exactly are you asking from me?",
  ],
};

export function shouldRaiseHand(
  persona: Persona,
  userText: string,
  messageCount: number
): HandRaiseEvent | null {
  // Probability increases with message count
  if (messageCount < 1) return null;

  const baseProbability = 0.15 + messageCount * 0.08;
  if (Math.random() > baseProbability) return null;

  const style = persona.communicationStyle;
  const questions = HAND_RAISE_QUESTIONS[style] || HAND_RAISE_QUESTIONS.analytical;
  const question = questions[Math.floor(Math.random() * questions.length)];

  return {
    personaId: persona.id,
    question,
  };
}
