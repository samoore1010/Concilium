export interface Script {
  id: string;
  title: string;
  text: string;
  domain: "business" | "legal" | "academic" | "general";
  difficulty: "beginner" | "intermediate" | "advanced";
  durationSeconds: number;
  targetWPM: number;
  focusTags: string[];
}

export const SCRIPT_LIBRARY: Script[] = [
  // === BEGINNER ===
  {
    id: "b1", title: "The Elevator Pitch", domain: "business", difficulty: "beginner", durationSeconds: 20, targetWPM: 130,
    focusTags: ["pace", "confidence"],
    text: "Our company solves a simple problem. Every day, millions of small businesses waste hours on manual bookkeeping. We built software that automates it completely. In six months, we've signed two hundred paying customers, and we're growing thirty percent month over month.",
  },
  {
    id: "b2", title: "Self Introduction", domain: "general", difficulty: "beginner", durationSeconds: 15, targetWPM: 120,
    focusTags: ["clarity", "warmth"],
    text: "Good morning everyone. My name is Alex, and I'm thrilled to be here today. I've spent the last ten years working in product development, and I'm passionate about building tools that make people's lives easier.",
  },
  {
    id: "b3", title: "Simple Explanation", domain: "academic", difficulty: "beginner", durationSeconds: 20, targetWPM: 110,
    focusTags: ["clarity", "pace"],
    text: "Climate change is caused by greenhouse gases trapping heat in our atmosphere. The biggest contributor is carbon dioxide from burning fossil fuels. Every year, we release about forty billion tons of CO2. To fix this, we need to switch to renewable energy sources like solar, wind, and nuclear power.",
  },
  {
    id: "b4", title: "Thank You Speech", domain: "general", difficulty: "beginner", durationSeconds: 15, targetWPM: 115,
    focusTags: ["warmth", "expression"],
    text: "I want to take a moment to thank everyone who made this possible. This project was a team effort from start to finish. Every late night, every difficult conversation, every breakthrough — we did it together. I couldn't be more proud of what we've accomplished.",
  },
  {
    id: "b5", title: "Product Overview", domain: "business", difficulty: "beginner", durationSeconds: 20, targetWPM: 125,
    focusTags: ["clarity", "confidence"],
    text: "Let me walk you through what our platform does. First, you upload your data. Our system analyzes it automatically in under sixty seconds. Then, you get a clear dashboard showing exactly where your opportunities are. No training required. No complex setup. Just answers.",
  },

  // === INTERMEDIATE ===
  {
    id: "i1", title: "Investment Ask", domain: "business", difficulty: "intermediate", durationSeconds: 40, targetWPM: 135,
    focusTags: ["persuasion", "pace", "pauses"],
    text: "We're here today because we believe healthcare scheduling is fundamentally broken. Patients wait an average of twenty-four days to see a specialist. Twenty-four days of uncertainty, of pain, of worry. Our platform cuts that to three days. We've already proven this works — twelve hospitals, forty thousand patients served, and a ninety-two percent satisfaction rate. We're raising five million dollars to expand to fifty hospitals by next year. The market opportunity is eighteen billion dollars, and we have the team, the technology, and the traction to capture it.",
  },
  {
    id: "i2", title: "Opening Statement", domain: "legal", difficulty: "intermediate", durationSeconds: 45, targetWPM: 120,
    focusTags: ["authority", "pauses", "emphasis"],
    text: "Ladies and gentlemen of the jury, what you will hear over the next three days is a story of broken promises. The defendant, a company valued at twelve billion dollars, made a commitment to the residents of this community. They promised clean water. They promised safe operations. They promised accountability. And then, when the evidence of contamination became undeniable, they promised it would never happen again. Every single one of those promises was broken. The evidence will show that the defendant knew about the contamination for eighteen months before taking any action. Eighteen months. The people of this community deserve justice, and that is exactly what we intend to deliver.",
  },
  {
    id: "i3", title: "Keynote Opening", domain: "general", difficulty: "intermediate", durationSeconds: 35, targetWPM: 125,
    focusTags: ["expression", "energy", "pauses"],
    text: "Three years ago, I stood in this exact spot and made a prediction that most people in this room thought was crazy. I said that within five years, every company in this industry would need to completely rethink their approach to customer experience. Some of you laughed. Some of you politely nodded and then went back to doing things the old way. And some of you — the ones sitting in the front rows right now — you listened. Today, I'm here to show you what happened next.",
  },
  {
    id: "i4", title: "Research Findings", domain: "academic", difficulty: "intermediate", durationSeconds: 40, targetWPM: 115,
    focusTags: ["clarity", "pace", "authority"],
    text: "Our study examined twelve hundred participants over a period of thirty-six months. The results were significant and, frankly, surprising. Participants who engaged in deliberate public speaking practice for just fifteen minutes per day showed a forty-seven percent improvement in perceived confidence, a thirty-one percent reduction in filler word usage, and a twenty-eight percent increase in audience engagement scores. These improvements persisted even six months after the practice period ended. What this tells us is that public speaking is not a talent. It is a trainable skill, and the returns on practice are both measurable and lasting.",
  },

  // === ADVANCED ===
  {
    id: "a1", title: "Crisis Communication", domain: "business", difficulty: "advanced", durationSeconds: 60, targetWPM: 120,
    focusTags: ["composure", "authority", "empathy", "pauses"],
    text: "Good afternoon. I want to address the situation directly, because our customers, our employees, and our partners deserve transparency. Yesterday, we discovered a security breach that affected approximately three hundred thousand user accounts. I want to be clear about three things. First, we take full responsibility. This happened on our watch, and no amount of technical explanation changes that fact. Second, we have already taken action. The vulnerability has been patched, affected users have been notified, and we are offering two years of free identity protection to every impacted customer. Third, and most importantly, we are committed to making sure this never happens again. I have personally authorized a twenty million dollar investment in our security infrastructure, and we are bringing in an independent firm to audit every system we operate. We will publish the results of that audit publicly. I know trust is earned, not promised. We intend to earn it back.",
  },
  {
    id: "a2", title: "Closing Argument", domain: "legal", difficulty: "advanced", durationSeconds: 60, targetWPM: 115,
    focusTags: ["persuasion", "emotion", "pauses", "emphasis"],
    text: "Members of the jury, you've heard three days of testimony. You've seen the documents. You've heard from the experts. And now, I'm going to ask you to do something simple. Remember Maria Gonzalez. Remember her sitting in that chair, telling you about the day she found out her drinking water was contaminated. Remember how she described her daughter's rashes. Remember how her voice broke when she talked about the medical bills. The defense wants you to focus on chemistry reports and regulatory thresholds and acceptable parts per million. But this case isn't about acceptable levels of poison. It's about a corporation that chose profit over people. It's about executives who saw the warning signs and looked the other way. Maria Gonzalez trusted that the water coming out of her tap was safe. Her neighbors trusted that. Her children trusted that. That trust was violated. You have the power to hold this company accountable. I'm asking you to use it.",
  },
  {
    id: "a3", title: "Visionary Pitch", domain: "business", difficulty: "advanced", durationSeconds: 55, targetWPM: 130,
    focusTags: ["energy", "persuasion", "pace", "expression"],
    text: "Imagine a world where every student, regardless of where they were born, has access to the same quality of education as a student at Harvard or MIT. Not in ten years. Not in five years. Right now. That's not a fantasy. That's what we're building. Our platform uses AI to create personalized learning experiences that adapt in real time to each student's pace, style, and goals. We've tested this with fifty thousand students across twelve countries. The results are staggering. Students using our platform perform thirty-eight percent better on standardized tests and, more importantly, report twice the engagement with their coursework. They're not just learning more. They're loving learning more. We need forty million dollars to reach ten million students by the end of next year. Every week we wait, another generation of brilliant minds goes underserved. The technology exists. The demand is proven. The only question is whether we move fast enough.",
  },
];

export function getScriptsByDifficulty(difficulty: Script["difficulty"]): Script[] {
  return SCRIPT_LIBRARY.filter((s) => s.difficulty === difficulty);
}

export function getScriptById(id: string): Script | undefined {
  return SCRIPT_LIBRARY.find((s) => s.id === id);
}
