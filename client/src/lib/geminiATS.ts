import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI - Use server-side API key for security
const getGeminiAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

const GEMINI_MODEL_CANDIDATES = [
  import.meta.env.VITE_GEMINI_MODEL,
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-8b",
  "gemini-1.5-flash",
].filter(Boolean) as string[];

const ATS_STOPWORDS = new Set([
  "the", "and", "for", "with", "you", "your", "from", "that", "this", "have", "will", "into",
  "our", "are", "not", "but", "can", "all", "job", "role", "team", "work", "using", "use",
  "years", "year", "about", "their", "them", "they", "who", "has", "had", "was", "were", "his",
  "her", "she", "him", "its", "also", "out", "per", "via", "one", "two", "three", "etc",
]);

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9+#.\-/\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !ATS_STOPWORDS.has(token));

const unique = <T,>(items: T[]) => Array.from(new Set(items));

const clampScore = (score: number) => Math.max(0, Math.min(100, Math.round(score)));

const buildLocalATSAnalysis = (
  resumeText: string,
  jobTitle: string,
  jobDescription: string,
): ATSAnalysis => {
  const normalizedResume = resumeText.toLowerCase();
  const jobTokens = unique(tokenize(`${jobTitle} ${jobDescription}`));
  const resumeTokens = new Set(tokenize(resumeText));

  const matchedKeywords = jobTokens.filter((token) => resumeTokens.has(token));
  const missingKeywords = jobTokens.filter((token) => !resumeTokens.has(token)).slice(0, 10);

  const keywordCoverage = jobTokens.length > 0 ? matchedKeywords.length / jobTokens.length : 0;
  const keywordScore = clampScore(keywordCoverage * 100);

  const commonSections = ["experience", "education", "skills", "summary", "projects"];
  const detectedSections = commonSections.filter((section) => normalizedResume.includes(section));
  const sectionScore = (detectedSections.length / commonSections.length) * 55;
  const bulletsScore = /(^|\n)\s*[-*•]/.test(resumeText) ? 15 : 0;
  const contactScore = /@/.test(resumeText) ? 10 : 0;
  const formatScore = clampScore(sectionScore + bulletsScore + contactScore);

  const quantifiedAchievements = (resumeText.match(/\b\d+[%+x]?\b/g) || []).length;
  const quantifiedScore = Math.min(25, quantifiedAchievements * 4);
  const lengthScore = resumeText.trim().length >= 800 ? 20 : resumeText.trim().length >= 400 ? 12 : 5;
  const skillsPresenceScore = normalizedResume.includes("skills") ? 15 : 5;
  const contentScore = clampScore(40 + quantifiedScore + lengthScore + skillsPresenceScore);

  const overallScore = clampScore((keywordScore * 0.45) + (formatScore * 0.2) + (contentScore * 0.35));

  const suggestions: string[] = [];
  if (missingKeywords.length > 0) {
    suggestions.push(`Add missing keywords that appear in the job description: ${missingKeywords.slice(0, 5).join(", ")}.`);
  }
  if (quantifiedAchievements < 3) {
    suggestions.push("Add quantified achievements with numbers, percentages, or business impact.");
  }
  if (!normalizedResume.includes("summary")) {
    suggestions.push("Add a short professional summary near the top for clearer ATS context.");
  }
  if (!normalizedResume.includes("skills")) {
    suggestions.push("Add a dedicated skills section so ATS systems can index relevant tools and technologies.");
  }
  if (!/(^|\n)\s*[-*•]/.test(resumeText)) {
    suggestions.push("Use bullet points for experience entries so responsibilities and outcomes parse more cleanly.");
  }

  const strengths: string[] = [];
  if (matchedKeywords.length > 0) {
    strengths.push(`Matched ${matchedKeywords.length} relevant job keywords.`);
  }
  if (quantifiedAchievements >= 3) {
    strengths.push("Includes quantified achievements that strengthen experience credibility.");
  }
  if (detectedSections.length >= 3) {
    strengths.push("Uses recognizable resume sections that ATS systems handle well.");
  }
  if (/@/.test(resumeText)) {
    strengths.push("Contains contact information in readable text.");
  }

  const improvementAreas = unique([
    missingKeywords.length > 0 ? "Keyword alignment" : "",
    quantifiedAchievements < 3 ? "Achievement quantification" : "",
    !normalizedResume.includes("skills") ? "Skills section clarity" : "",
    !normalizedResume.includes("summary") ? "Professional summary" : "",
    !/(^|\n)\s*[-*•]/.test(resumeText) ? "Experience formatting" : "",
  ].filter(Boolean)).slice(0, 5);

  return {
    overallScore,
    keywordScore,
    formatScore,
    contentScore,
    suggestions: suggestions.slice(0, 5),
    strengths: strengths.slice(0, 5),
    missingKeywords,
    improvementAreas,
  };
};

const generateGeminiText = async (
  prompt: string,
  options: {
    model?: string;
    responseMimeType?: string;
    responseSchema?: Record<string, unknown>;
    allowFallbackModels?: boolean;
  } = {},
) => {
  const genAI = getGeminiAI();
  if (!genAI) {
    throw new Error("Gemini API key not configured");
  }
  let lastError: unknown;

  const candidateModels = options.model
    ? [options.model]
    : options.allowFallbackModels
      ? GEMINI_MODEL_CANDIDATES
      : GEMINI_MODEL_CANDIDATES.slice(0, 1);

  for (const model of candidateModels) {
    try {
      const response = await genAI.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: options.responseMimeType,
          responseSchema: options.responseSchema,
        },
      });

      return response.text || "";
    } catch (error) {
      lastError = error;
      console.warn(`Gemini model failed: ${model}`, error);

      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('"code":403') || message.includes('"code":404')) {
        break;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini request failed");
};

export interface ATSAnalysis {
  overallScore: number;
  keywordScore: number;
  formatScore: number;
  contentScore: number;
  suggestions: string[];
  strengths: string[];
  missingKeywords: string[];
  improvementAreas: string[];
}

export interface ImportedJobDetails {
  title: string;
  company: string;
  location: string;
  experienceLevel: "entry" | "mid" | "senior" | "lead";
  description: string;
  requirements: string;
  quickSummary: string;
  suggestedSkills: string[];
}

const ATS_SECTION_HEADERS = ["summary", "experience", "skills", "education", "projects", "certifications"];
const ATS_ACTION_VERBS = [
  "built", "led", "developed", "delivered", "improved", "designed", "implemented", "optimized",
  "launched", "managed", "created", "owned", "reduced", "increased", "scaled", "automated",
];
const ATS_KEYWORD_BLACKLIST = new Set([
  ...Array.from(ATS_STOPWORDS),
  "required", "preferred", "qualification", "qualifications", "responsibilities", "responsibility",
  "candidate", "candidates", "position", "opportunity", "company", "ability", "strong", "work",
  "working", "role", "team", "teams", "plus", "must", "should", "would", "nice", "have",
  "hiring", "location", "apply", "joining", "join", "come", "build", "building", "platform",
  "selected", "review", "public", "listing", "shared", "referralme", "referral", "opportunities",
  "candidate", "candidates", "fast", "track", "verified", "referrer",
]);

const ATS_JOB_BOILERPLATE_PATTERNS = [
  /internal referral opportunity shared by a verified company referrer/gi,
  /fast-track internal referral opening with direct referrer review/gi,
  /apply through referralme for referrer review/gi,
  /referral opportunity/gi,
  /verified company referrer/gi,
  /platform request/gi,
];

const sanitizeJobContext = (text: string) =>
  ATS_JOB_BOILERPLATE_PATTERNS.reduce((current, pattern) => current.replace(pattern, " "), text);

const extractKeywords = (text: string, limit = 20) => {
  const counts = new Map<string, number>();
  for (const token of text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\-/\s]/g, " ")
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 2 && !ATS_KEYWORD_BLACKLIST.has(entry))) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([token]) => token);
};

const extractPriorityKeywords = (jobTitle: string, jobDescription: string, skills: string[] = []) => {
  const sanitizedTitle = sanitizeJobContext(jobTitle);
  const sanitizedDescription = sanitizeJobContext(jobDescription);
  const titleKeywords = extractKeywords(jobTitle, 6).filter(
    (keyword) => !["engineer", "developer", "manager", "analyst", "specialist", "lead"].includes(keyword),
  );
  const descriptionKeywords = extractKeywords(sanitizedDescription, 18);
  const skillKeywords = skills
    .flatMap((skill) => extractKeywords(skill, 4))
    .filter((keyword) => !ATS_KEYWORD_BLACKLIST.has(keyword));
  return unique([...extractKeywords(sanitizedTitle, 6), ...titleKeywords, ...skillKeywords, ...descriptionKeywords]).slice(0, 18);
};

const computeDeterministicATSAnalysis = (
  resumeText: string,
  jobTitle: string,
  jobDescription: string,
  requiredSkills: string[] = [],
): ATSAnalysis => {
  const normalizedResume = resumeText.toLowerCase();
  const hasTargetJobContext = Boolean(jobDescription.trim() || requiredSkills.length > 0 || jobTitle.trim());
  const priorityKeywords = hasTargetJobContext
    ? extractPriorityKeywords(jobTitle, jobDescription, requiredSkills)
    : [];
  const resumeTokens = new Set(tokenize(resumeText));
  const matchedKeywords = priorityKeywords.filter((token) => resumeTokens.has(token));
  const missingKeywords = hasTargetJobContext
    ? priorityKeywords.filter((token) => !resumeTokens.has(token)).slice(0, 10)
    : [];
  const keywordCoverage = priorityKeywords.length ? matchedKeywords.length / priorityKeywords.length : 0;
  const generalKeywordSignals = unique([
    normalizedResume.includes("javascript") ? "javascript" : "",
    normalizedResume.includes("typescript") ? "typescript" : "",
    normalizedResume.includes("react") ? "react" : "",
    normalizedResume.includes("node") ? "node" : "",
    normalizedResume.includes("python") ? "python" : "",
    normalizedResume.includes("sql") ? "sql" : "",
    normalizedResume.includes("aws") ? "aws" : "",
  ].filter(Boolean));
  const keywordScore = hasTargetJobContext
    ? clampScore(10 + (keywordCoverage * 90))
    : clampScore(25 + (generalKeywordSignals.length * 8));

  const foundSections = ATS_SECTION_HEADERS.filter((header) => normalizedResume.includes(header));
  const sectionScore = (foundSections.length / ATS_SECTION_HEADERS.length) * 45;
  const bulletScore = /(^|\n)\s*[-*•]/.test(resumeText) ? 20 : 5;
  const contactScore = /@/.test(resumeText) && /\+?\d[\d\s\-()]{7,}/.test(resumeText) ? 20 : /@/.test(resumeText) ? 12 : 0;
  const formatScore = clampScore(sectionScore + bulletScore + contactScore);

  const quantifiedAchievements = (resumeText.match(/\b\d+([.,]\d+)?(%|x|k|m|b)?\b/gi) || []).length;
  const actionVerbMatches = ATS_ACTION_VERBS.filter((verb) => normalizedResume.includes(verb));
  const educationPresent = normalizedResume.includes("education") || normalizedResume.includes("bachelor") || normalizedResume.includes("master");
  const skillsPresent = normalizedResume.includes("skills");
  const lengthScore = resumeText.trim().length >= 1200 ? 15 : resumeText.trim().length >= 700 ? 10 : resumeText.trim().length >= 350 ? 6 : 2;
  const contentScore = clampScore(
    8 +
      Math.min(22, quantifiedAchievements * 3) +
      Math.min(18, actionVerbMatches.length * 3) +
      (educationPresent ? 10 : 3) +
      (skillsPresent ? 14 : 4) +
      lengthScore,
  );

  const overallScore = hasTargetJobContext
    ? clampScore((keywordScore * 0.55) + (formatScore * 0.2) + (contentScore * 0.25))
    : clampScore((keywordScore * 0.25) + (formatScore * 0.35) + (contentScore * 0.4));

  const suggestions: string[] = [];
  if (hasTargetJobContext && missingKeywords.length > 0) {
    suggestions.push(`Add JD keywords such as ${missingKeywords.slice(0, 5).join(", ")} where they truthfully match your background.`);
  }
  if (quantifiedAchievements < 3) {
    suggestions.push("Add measurable impact with numbers, percentages, or delivery outcomes in experience bullets.");
  }
  if (!skillsPresent) {
    suggestions.push("Add a dedicated skills section so resume parsers can capture technologies cleanly.");
  }
  if (foundSections.length < 4) {
    suggestions.push("Use clear section headers like Summary, Experience, Skills, Education, and Projects.");
  }
  if (!/(^|\n)\s*[-*•]/.test(resumeText)) {
    suggestions.push("Use bullet points for work history so ATS systems can parse responsibilities more reliably.");
  }

  const strengths: string[] = [];
  if (hasTargetJobContext && matchedKeywords.length >= 5) {
    strengths.push(`Good JD alignment with ${matchedKeywords.length} matched keywords.`);
  }
  if (quantifiedAchievements >= 3) {
    strengths.push("Includes quantified achievements, which improves recruiter and ATS readability.");
  }
  if (foundSections.length >= 4) {
    strengths.push("Contains standard resume sections that ATS systems usually parse well.");
  }
  if (contactScore >= 12) {
    strengths.push("Includes readable contact details in plain text.");
  }

  const improvementAreas = unique([
    hasTargetJobContext && missingKeywords.length > 0 ? "Keyword alignment" : "",
    quantifiedAchievements < 3 ? "Achievement quantification" : "",
    !skillsPresent ? "Skills section clarity" : "",
    foundSections.length < 4 ? "Resume structure" : "",
    !/(^|\n)\s*[-*•]/.test(resumeText) ? "Experience formatting" : "",
  ].filter(Boolean)).slice(0, 5);

  const finalSuggestions = suggestions.length > 0
    ? suggestions.slice(0, 5)
    : ["Your resume structure is solid. Tailor a few keywords and keep outcome-focused bullets for stronger ATS performance."];

  const finalStrengths = strengths.length > 0
    ? strengths.slice(0, 5)
    : ["Resume contains enough readable text for deterministic ATS parsing."];

  return {
    overallScore,
    keywordScore,
    formatScore,
    contentScore,
    suggestions: finalSuggestions,
    strengths: finalStrengths,
    missingKeywords,
    improvementAreas,
  };
};

export async function analyzeResumeWithGemini(
  resumeText: string,
  jobTitle: string,
  jobDescription: string,
  requiredSkills: string[] = [],
): Promise<ATSAnalysis> {
  console.log("📊 Running deterministic ATS analysis...");
  return computeDeterministicATSAnalysis(resumeText, jobTitle, jobDescription, requiredSkills);
}

export async function generateJobDescriptionWithGemini(
  jobTitle: string,
  company: string,
  location: string,
  experience: string,
  skills: string[]
): Promise<string> {
  try {
    console.log("🤖 Generating job description with Gemini...");

    const prompt = `
Generate a professional job description for the following position:

Job Title: ${jobTitle}
Company: ${company}
Location: ${location}
Experience Level: ${experience}
Required Skills: ${skills.join(", ")}

Create a comprehensive job description that includes:
1. Job Overview (2-3 sentences)
2. Key Responsibilities (5-7 bullet points)
3. Required Qualifications (4-6 bullet points)
4. Preferred Qualifications (3-4 bullet points)
5. What We Offer (3-4 bullet points)

Make it professional, engaging, and ATS-optimized with relevant keywords.
Use standard corporate language and formatting.
`;

    let description = await generateGeminiText(prompt, { allowFallbackModels: false });
    
    // Remove markdown bold markers (** and *) from the generated content
    description = description.replace(/\*\*/g, '').replace(/\*/g, '');
    
    console.log("✅ Job description generated successfully");
    return description;
    
  } catch (error) {
    console.error("❌ Job description generation failed:", error);
    
    // Return fallback description without markdown
    return `
${jobTitle} - ${company}

We are seeking a talented ${jobTitle} to join our team in ${location}. This role offers an excellent opportunity to work with cutting-edge technologies and contribute to meaningful projects.

Key Responsibilities:
• Develop and implement solutions using ${skills.slice(0, 3).join(", ")}
• Collaborate with cross-functional teams to deliver high-quality products
• Participate in code reviews and maintain coding standards
• Troubleshoot and resolve technical issues
• Stay updated with industry trends and best practices

Required Qualifications:
• ${experience} of relevant experience
• Proficiency in ${skills.slice(0, 2).join(" and ")}
• Strong problem-solving and analytical skills
• Excellent communication and teamwork abilities
• Bachelor's degree in related field or equivalent experience

What We Offer:
• Competitive salary and benefits package
• Professional development opportunities
• Collaborative and innovative work environment
• Work-life balance and flexible arrangements

Join us and be part of a dynamic team making a real impact!
`;
  }
}

export async function extractJobDetailsWithGemini(sourceText: string): Promise<ImportedJobDetails> {
  const fallback = getFallbackImportedJobDetails(sourceText);

  try {
    const prompt = `
Extract structured job details from this internal referral post or JD text.

SOURCE TEXT:
${sourceText}

Rules:
- Return concise, recruiter-friendly values.
- If a field is missing, infer a reasonable default instead of leaving it blank.
- experienceLevel must be one of: entry, mid, senior, lead.
- quickSummary should be 1-2 short sentences suitable for a fast referral card.
- suggestedSkills should contain the most relevant skill keywords only.
`;

    const responseText = await generateGeminiText(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          company: { type: "string" },
          location: { type: "string" },
          experienceLevel: { type: "string", enum: ["entry", "mid", "senior", "lead"] },
          description: { type: "string" },
          requirements: { type: "string" },
          quickSummary: { type: "string" },
          suggestedSkills: {
            type: "array",
            items: { type: "string" },
            maxItems: 8,
          },
        },
        required: ["title", "company", "location", "experienceLevel", "description", "requirements", "quickSummary", "suggestedSkills"],
      },
      allowFallbackModels: false,
    });
    const cleanJson = responseText.replace(/\*\*(.*?)\*\*/g, "$1");
    const parsed = JSON.parse(cleanJson) as ImportedJobDetails;

    if (!parsed.title || !parsed.company || !parsed.description || !parsed.requirements) {
      throw new Error("Incomplete imported job details");
    }

    return parsed;
  } catch (error) {
    console.error("❌ Job detail extraction failed:", error);
    return fallback;
  }
}

function getFallbackImportedJobDetails(sourceText: string): ImportedJobDetails {
  const lines = sourceText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const title =
    lines.find((line) => /engineer|developer|manager|designer|analyst|lead|intern/i.test(line)) ||
    "Referral Opportunity";
  const companyMatch = sourceText.match(/at\s+([A-Z][A-Za-z0-9&.\- ]+)/i);
  const locationMatch = sourceText.match(/(remote|hybrid|onsite|on-site|bangalore|bengaluru|mumbai|pune|hyderabad|delhi|gurgaon|noida|chennai)/i);
  const lowered = sourceText.toLowerCase();

  const skills = ["React", "TypeScript", "Node.js", "Python", "Java", "SQL", "AWS", "Product"]
    .filter((skill) => lowered.includes(skill.toLowerCase()));

  return {
    title,
    company: companyMatch?.[1]?.trim() || "Confidential Company",
    location: locationMatch?.[1] ? capitalize(locationMatch[1]) : "Remote / Hybrid",
    experienceLevel: lowered.includes("lead") || lowered.includes("principal")
      ? "lead"
      : lowered.includes("senior") || lowered.includes("5+") || lowered.includes("6+")
        ? "senior"
        : lowered.includes("entry") || lowered.includes("intern") || lowered.includes("0-2")
          ? "entry"
          : "mid",
    description: sourceText.slice(0, 900).trim() || "Internal referral opportunity shared by a verified referrer.",
    requirements: sourceText.slice(0, 500).trim() || "Relevant experience, strong communication, and role-specific skills.",
    quickSummary: "Fast-track referral opening shared from an internal company system. Apply through ReferralMe for referrer review.",
    suggestedSkills: skills.length > 0 ? skills : ["Communication", "Problem Solving", "Role Fit"],
  };
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
