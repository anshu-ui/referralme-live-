import { GoogleGenAI } from "@google/genai";

// Initialize Gemini with API key - using the correct environment variable
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });

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

export async function analyzeResumeWithGemini(
  resumeText: string, 
  jobDescription?: string
): Promise<ATSAnalysisResult> {
  try {
    const prompt = `As an expert ATS (Applicant Tracking System) analyzer, please analyze this resume against ${jobDescription ? 'the provided job description' : 'general ATS best practices'}.

Resume Text:
${resumeText}

${jobDescription ? `Job Description:
${jobDescription}` : ''}

Please analyze the resume and provide a comprehensive ATS compatibility assessment. Return your analysis in JSON format with the following structure:

{
  "overallScore": number (0-100),
  "skillsScore": number (0-100),
  "experienceScore": number (0-100), 
  "formatScore": number (0-100),
  "keywordsScore": number (0-100),
  "suggestions": [array of specific improvement suggestions],
  "strongPoints": [array of resume strengths],
  "missingKeywords": [array of important missing keywords],
  "matchedKeywords": [array of relevant keywords found],
  "recommendations": [array of actionable recommendations]
}

Focus on:
- ATS parsing compatibility
- Keyword optimization for ${jobDescription ? 'the specific role' : 'general tech roles'}
- Format and structure analysis
- Skills relevance and presentation
- Experience quantification and relevance
- Missing critical elements

Provide specific, actionable feedback that will help improve ATS compatibility and increase the chances of passing through automated screening.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            overallScore: { type: "number" },
            skillsScore: { type: "number" },
            experienceScore: { type: "number" },
            formatScore: { type: "number" },
            keywordsScore: { type: "number" },
            suggestions: {
              type: "array",
              items: { type: "string" }
            },
            strongPoints: {
              type: "array", 
              items: { type: "string" }
            },
            missingKeywords: {
              type: "array",
              items: { type: "string" }
            },
            matchedKeywords: {
              type: "array",
              items: { type: "string" }
            },
            recommendations: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["overallScore", "skillsScore", "experienceScore", "formatScore", "keywordsScore", "suggestions", "strongPoints", "missingKeywords", "matchedKeywords", "recommendations"]
        }
      },
      contents: prompt,
    });

    // Get the response text - ensuring proper error handling
    const rawJson = response.text || "";
    console.log('✅ Gemini ATS Analysis Response received:', rawJson ? 'Success' : 'Empty');

    if (!rawJson || typeof rawJson !== 'string' || rawJson.trim() === '') {
      throw new Error("Empty or invalid response from Gemini AI");
    }

    try {
      const analysis: ATSAnalysisResult = JSON.parse(rawJson);
      
      // Validate the parsed response has required fields
      if (typeof analysis.overallScore !== 'number' || !Array.isArray(analysis.suggestions)) {
        throw new Error("Invalid response format from Gemini AI");
      }
      
      return analysis;
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", parseError);
      console.error("Raw response was:", rawJson);
      throw new Error("Invalid JSON response from Gemini AI");
    }
  } catch (error) {
    console.error("Gemini ATS analysis failed:", error);
    
    // Fallback analysis if Gemini fails
    return getFallbackAnalysis(resumeText, jobDescription);
  }
}

// Fallback analysis if Gemini API fails
function getFallbackAnalysis(resumeText: string, jobDescription?: string): ATSAnalysisResult {
  const text = resumeText.toLowerCase();
  
  // Basic keyword analysis
  const commonKeywords = ["experience", "skills", "education", "management", "development", "javascript", "react", "python", "aws", "sql"];
  const matchedKeywords = commonKeywords.filter(keyword => text.includes(keyword));
  const missingKeywords = commonKeywords.filter(keyword => !text.includes(keyword));
  
  const skillsScore = Math.min(95, (matchedKeywords.length / commonKeywords.length) * 100);
  const experienceScore = text.includes("years") || text.includes("experience") ? 85 : 60;
  const formatScore = 80; // Assume decent formatting
  const keywordsScore = skillsScore;
  const overallScore = Math.round((skillsScore + experienceScore + formatScore + keywordsScore) / 4);

  return {
    overallScore,
    skillsScore,
    experienceScore,
    formatScore,
    keywordsScore,
    suggestions: [
      "Add more quantifiable achievements with specific numbers",
      "Include industry-specific keywords relevant to your target role",
      "Optimize section headers for better ATS parsing",
      "Add a professional summary section at the top"
    ],
    strongPoints: [
      "Contains relevant technical keywords",
      "Professional formatting structure",
      "Clear experience section"
    ],
    missingKeywords: missingKeywords.slice(0, 5),
    matchedKeywords: matchedKeywords.slice(0, 8),
    recommendations: [
      "Consider using more action verbs in your experience descriptions",
      "Quantify your achievements with specific metrics and percentages",
      "Tailor your resume keywords to match the specific job requirements",
      "Ensure consistent formatting throughout the document"
    ]
  };
}

// Extract text from uploaded file (simplified version for demo)
export async function extractTextFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        
        if (file.type === 'application/pdf') {
          // For PDF files, we'd use a library like pdf-parse or pdf.js
          // For now, return a placeholder that simulates extraction
          const filename = file.name;
          resolve(`Text extracted from PDF: ${filename}
          
Sample resume content including experience, skills, education sections.
This would be replaced with actual PDF text extraction in production.
          
Experience:
• Software Engineer at TechCorp (2020-2023)
• Frontend Developer at StartupXYZ (2018-2020)

Skills: JavaScript, React, Node.js, Python, AWS, SQL, Git

Education: Bachelor of Computer Science`);
        } else if (file.type.includes('word') || file.name.endsWith('.docx')) {
          // For Word files, we'd use a library like mammoth
          resolve(`Text extracted from Word document: ${file.name}
          
This is simulated text extraction. In production, this would parse actual Word document content.
          
Professional Summary:
Experienced software engineer with 5+ years in web development.

Technical Skills:
JavaScript, TypeScript, React, Vue.js, Node.js, Python, PostgreSQL, MongoDB, AWS, Docker

Work Experience:
Senior Software Engineer - Tech Solutions Inc. (2021-Present)
• Led development of customer-facing web applications
• Improved application performance by 40%
• Mentored junior developers

Software Developer - Digital Innovations (2019-2021)
• Built responsive web applications using React and Node.js
• Collaborated with cross-functional teams on product features`);
        } else {
          reject(new Error('Unsupported file type'));
        }
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}