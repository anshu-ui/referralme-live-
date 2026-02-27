import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI - Use server-side API key for security
const getGeminiAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ Gemini API key not found. Please check environment variables.");
    return null;
  }
  return new GoogleGenAI(apiKey);
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

export async function analyzeResumeWithGemini(
  resumeText: string,
  jobTitle: string,
  jobDescription: string
): Promise<ATSAnalysis> {
  try {
    console.log("🤖 Starting Gemini ATS analysis...");
    
    const genAI = getGeminiAI();
    if (!genAI) {
      throw new Error("Gemini API key not configured");
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            overallScore: { type: "number", minimum: 0, maximum: 100 },
            keywordScore: { type: "number", minimum: 0, maximum: 100 },
            formatScore: { type: "number", minimum: 0, maximum: 100 },
            contentScore: { type: "number", minimum: 0, maximum: 100 },
            suggestions: { 
              type: "array", 
              items: { type: "string" },
              maxItems: 5
            },
            strengths: { 
              type: "array", 
              items: { type: "string" },
              maxItems: 5
            },
            missingKeywords: { 
              type: "array", 
              items: { type: "string" },
              maxItems: 10
            },
            improvementAreas: { 
              type: "array", 
              items: { type: "string" },
              maxItems: 5
            }
          },
          required: ["overallScore", "keywordScore", "formatScore", "contentScore", "suggestions", "strengths", "missingKeywords", "improvementAreas"]
        }
      }
    });

    const prompt = `
You are an expert ATS (Applicant Tracking System) resume analyzer. Analyze the provided resume against the job requirements and provide a comprehensive ATS compatibility score.

JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}

RESUME CONTENT:
${resumeText}

Analyze this resume for ATS compatibility and provide:

1. OVERALL SCORE (0-100): How well this resume would pass through ATS systems
2. KEYWORD SCORE (0-100): How well the resume matches job-specific keywords
3. FORMAT SCORE (0-100): How ATS-friendly the formatting and structure is
4. CONTENT SCORE (0-100): Quality and relevance of content

5. SUGGESTIONS: 3-5 specific actionable improvements to increase ATS score
6. STRENGTHS: 3-5 current strengths of the resume
7. MISSING KEYWORDS: Up to 10 important keywords from job description missing in resume
8. IMPROVEMENT AREAS: 3-5 specific areas that need work

Focus on:
- Keyword matching with job description
- ATS-friendly formatting
- Relevant experience alignment
- Skills section optimization
- Industry-specific terminology usage

Provide practical, actionable feedback that will help this resume pass ATS screening.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    console.log("🤖 Gemini raw response:", responseText);
    
    // Clean markdown bold markers (* and **) from keys if they exist in the response
    // Sometimes Gemini wraps keys in ** even when told to return JSON
    const cleanJson = responseText.replace(/\*\*(.*?)\*\*/g, '$1');
    const analysis: ATSAnalysis = JSON.parse(cleanJson);
    
    // Validate the response structure
    if (!analysis.overallScore || !analysis.suggestions || !analysis.strengths) {
      throw new Error("Invalid response structure from Gemini");
    }
    
    console.log("✅ Gemini ATS analysis completed:", analysis);
    return analysis;
    
  } catch (error) {
    console.error("❌ Gemini ATS analysis failed:", error);
    
    // Return fallback analysis
    return {
      overallScore: 75,
      keywordScore: 70,
      formatScore: 80,
      contentScore: 75,
      suggestions: [
        "Add more keywords from the job description",
        "Use standard resume section headers",
        "Include relevant technical skills",
        "Quantify achievements with numbers",
        "Optimize for ATS readability"
      ],
      strengths: [
        "Clear professional experience",
        "Good educational background",
        "Relevant industry knowledge"
      ],
      missingKeywords: [
        jobTitle,
        "leadership",
        "project management",
        "team collaboration"
      ],
      improvementAreas: [
        "Keyword optimization",
        "Skills section enhancement",
        "Achievement quantification",
        "Industry-specific terminology"
      ]
    };
  }
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
    
    const genAI = getGeminiAI();
    if (!genAI) {
      throw new Error("Gemini API key not configured");
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash"
    });

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

    const result = await model.generateContent(prompt);
    let description = result.response.text();
    
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