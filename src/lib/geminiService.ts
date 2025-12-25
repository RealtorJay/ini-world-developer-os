
import { GoogleGenAI } from "@google/genai";
import { ProjectState, FinancialResults, WalkabilityResults } from '../types';

export const generatePartnerSummary = async (
  state: ProjectState,
  fin: FinancialResults,
  walk: WalkabilityResults
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const prompt = `
    Generate a professional, high-impact executive summary for a real estate investment partner for a walkable mixed-use project.
    
    KEY DATA:
    - Total Cost: $${fin.totalProjectCost.toLocaleString()}
    - Required Equity: $${fin.requiredEquity.toLocaleString()}
    - DSCR (Conservative): ${fin.dscr.toFixed(2)}
    - Phase 1 Standalone DSCR: ${fin.phase1Dscr.toFixed(2)}
    - Walkability Score: ${walk.finalScore.toFixed(0)}/100 (${walk.grade})
    - 5-Min Walk Compliance: ${walk.fiveMinWalkCompliant ? 'Yes' : 'No'}
    - Break-even Rent: $${fin.breakEvenRentPsf.toFixed(2)}/SF
    
    PROJECT DETAILS:
    - Acres: ${state.siteAcres}
    - Total SF: ${state.totalBuildSf}
    - Phase 1 SF: ${state.phase1Sf}
    - Hard Cost/SF: $${state.hardCostPsf}
    
    Write exactly three short paragraphs:
    1. Financial Confidence: Explain why the project pencils using the DSCR and Break-even numbers.
    2. Place Identity: Describe why the walkability score makes this a superior destination compared to traditional suburban retail.
    3. Capital Discipline: Highlight the phase strategy and why Phase 1 is a safe standalone bet for partners.
    
    Tone: Institutional, calm, precise. No fluff.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "Summary generation failed.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Error generating AI summary. Please check your API key and network connection.";
  }
};
