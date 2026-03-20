import {
  analyzeResumeWithGemini as analyzeDetailedResumeWithGemini,
  type ATSAnalysis,
} from "./geminiATS";

export interface ATSAnalysisResult {
  overallScore: number;
  skillsScore: number;
  experienceScore: number;
  formatScore: number;
  keywordsScore: number;
  suggestions: string[];
  strongPoints: string[];
  missingKeywords: string[];
  matchedKeywords: string[];
  recommendations: string[];
}

interface AnalyzerRoleContext {
  jobTitle?: string;
  requiredSkills?: string[];
}

const RESPONSIBILITY_SIGNALS = [
  "responsibilities",
  "what you will do",
  "what you'll do",
  "you will",
  "your role",
  "day to day",
];

const QUALIFICATION_SIGNALS = [
  "requirements",
  "qualifications",
  "must have",
  "nice to have",
  "skills",
  "experience",
];

const JOB_DESCRIPTION_SIGNALS = [
  ...RESPONSIBILITY_SIGNALS,
  ...QUALIFICATION_SIGNALS,
  "about the role",
  "about the job",
  "job description",
];

const ANALYZER_KEYWORD_BLACKLIST = new Set([
  "the", "and", "for", "with", "from", "that", "this", "your", "you", "our", "are", "not", "but",
  "all", "job", "role", "team", "work", "using", "use", "years", "year", "about", "their", "them",
  "they", "also", "per", "via", "one", "two", "three", "etc", "resume", "ats", "hiring", "talent",
  "find", "early", "stage", "early-stage", "technical", "product", "engineer", "developer", "manager",
  "specialist", "lead", "india", "gurugram", "gurgaon", "bangalore", "bengaluru", "mumbai", "pune",
  "hyderabad", "delhi", "noida", "remote", "onsite", "hybrid", "don", "come", "build", "building",
  "company", "startup", "startups", "best", "software", "collaboration", "scripts",
]);

const keywordSet = (value: string) =>
  Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/[^a-z0-9+#.\-/\s]/g, " ")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 2 && !ANALYZER_KEYWORD_BLACKLIST.has(token)),
    ),
  );

export const isLikelyJobDescription = (value?: string) => {
  const text = String(value || "").trim().toLowerCase();
  if (!text) {
    return false;
  }

  const signalMatches = JOB_DESCRIPTION_SIGNALS.filter((signal) => text.includes(signal)).length;
  const responsibilityMatches = RESPONSIBILITY_SIGNALS.filter((signal) => text.includes(signal)).length;
  const qualificationMatches = QUALIFICATION_SIGNALS.filter((signal) => text.includes(signal)).length;
  const bulletCount = (text.match(/(^|\n)\s*[-*•]/g) || []).length;
  const lineCount = text.split("\n").filter((line) => line.trim()).length;
  const tokenCount = keywordSet(text).length;

  return (
    tokenCount >= 20 &&
    (
      (responsibilityMatches >= 1 && qualificationMatches >= 1) ||
      (responsibilityMatches >= 1 && bulletCount >= 3 && lineCount >= 6) ||
      (qualificationMatches >= 2 && bulletCount >= 4 && lineCount >= 6) ||
      (signalMatches >= 3 && bulletCount >= 4 && tokenCount >= 40)
    )
  );
};

const deriveJobTitle = (jobDescription: string, fallbackJobTitle?: string) => {
  if (fallbackJobTitle?.trim()) {
    return fallbackJobTitle.trim();
  }

  const firstLines = String(jobDescription || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);

  const titleLine = firstLines.find((line) =>
    /engineer|developer|designer|manager|analyst|specialist|architect|consultant|intern|lead/i.test(line),
  );

  return titleLine || "";
};

const deriveRequiredSkills = (jobDescription: string, providedSkills: string[] = []) =>
  Array.from(new Set([
    ...providedSkills.filter(Boolean).map((skill) => skill.trim()),
    ...keywordSet(jobDescription).slice(0, 12),
  ])).slice(0, 12);

const convertToAnalyzerResult = (
  analysis: ATSAnalysis,
  resumeText: string,
  jobDescription?: string,
): ATSAnalysisResult => {
  const effectiveJobDescription = isLikelyJobDescription(jobDescription) ? String(jobDescription || "") : "";
  const jobTokens = keywordSet(effectiveJobDescription);
  const resumeTokens = new Set(keywordSet(resumeText));
  const matchedKeywords = jobTokens.filter((token) => resumeTokens.has(token)).slice(0, 12);
  const missingKeywords = analysis.missingKeywords
    .filter((token) => !ANALYZER_KEYWORD_BLACKLIST.has(token.toLowerCase()))
    .slice(0, 10);

  const skillsScore = analysis.keywordScore;
  const experienceScore = Math.max(
    0,
    Math.min(100, Math.round((analysis.contentScore * 0.6) + (analysis.formatScore * 0.4))),
  );

  return {
    overallScore: analysis.overallScore,
    skillsScore,
    experienceScore,
    formatScore: analysis.formatScore,
    keywordsScore: analysis.keywordScore,
    suggestions: analysis.suggestions,
    strongPoints: analysis.strengths,
    missingKeywords,
    matchedKeywords,
    recommendations: analysis.improvementAreas,
  };
};

export async function analyzeDetailedResumeForRole(
  resumeText: string,
  jobDescription?: string,
  context: AnalyzerRoleContext = {},
): Promise<ATSAnalysis> {
  const effectiveJobDescription = isLikelyJobDescription(jobDescription) ? String(jobDescription || "") : "";
  const jobTitle = deriveJobTitle(effectiveJobDescription, context.jobTitle);
  const requiredSkills = deriveRequiredSkills(effectiveJobDescription, context.requiredSkills);
  return analyzeDetailedResumeWithGemini(
    resumeText,
    jobTitle,
    effectiveJobDescription,
    requiredSkills,
  );
}

export async function analyzeResumeWithGemini(
  resumeText: string,
  jobDescription?: string,
  context: AnalyzerRoleContext = {},
): Promise<ATSAnalysisResult> {
  const analysis = await analyzeDetailedResumeForRole(resumeText, jobDescription, context);
  const effectiveJobDescription = isLikelyJobDescription(jobDescription) ? String(jobDescription || "") : "";

  return convertToAnalyzerResult(analysis, resumeText, effectiveJobDescription);
}

export async function extractTextFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        if (file.type === "text/plain" || file.name.endsWith(".txt")) {
          const text = String(event.target?.result || "").trim();
          if (!text) {
            reject(new Error("The text file appears to be empty."));
            return;
          }
          resolve(text);
          return;
        }

        reject(
          new Error(
            "Automatic extraction for PDF and Word files is not enabled here yet. Paste your resume text for an accurate ATS scan.",
          ),
        );
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));

    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      reader.readAsText(file);
      return;
    }

    reject(
      new Error(
        "Automatic extraction for PDF and Word files is not enabled here yet. Paste your resume text for an accurate ATS scan.",
      ),
    );
  });
}
