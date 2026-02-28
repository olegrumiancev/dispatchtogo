interface TriageInput {
  description: string;
  category: string;
  urgency: string;
  propertyType: string;
}

interface TriageResult {
  summary: string;
  urgencyScore: number;
  suggestedCategory: string;
  suggestedVendorSkills: string[];
}

/**
 * AI-based triage for service requests.
 *
 * For MVP this uses a rule-based heuristic. A future version will call an LLM
 * (e.g. OpenAI) to produce richer triage recommendations.
 */
export async function triageServiceRequest(
  input: TriageInput
): Promise<TriageResult> {
  const { description, category, urgency, propertyType } = input;

  // --- Urgency scoring (1\u201310) based on keywords + stated urgency -----------
  let score = 5; // baseline

  const urgencyMap: Record<string, number> = {
    EMERGENCY: 10,
    URGENT: 8,
    HIGH: 7,
    MEDIUM: 5,
    LOW: 3,
    ROUTINE: 2,
  };
  score = urgencyMap[urgency.toUpperCase()] ?? 5;

  const highUrgencyKeywords = [
    "flood",
    "fire",
    "burst",
    "leak",
    "sewage",
    "gas",
    "mold",
    "electrical",
    "sparking",
    "no heat",
    "no water",
    "broken pipe",
    "collapsed",
    "unsafe",
    "injury",
    "smoke",
  ];
  const desc = description.toLowerCase();
  for (const kw of highUrgencyKeywords) {
    if (desc.includes(kw)) {
      score = Math.min(10, score + 2);
      break;
    }
  }

  // --- Suggested vendor skills ----------------------------------------------
  const skillMap: Record<string, string[]> = {
    PLUMBING: ["Licensed Plumber", "Emergency Plumbing"],
    ELECTRICAL: ["Licensed Electrician", "Emergency Electrical"],
    HVAC: ["HVAC Technician", "Refrigeration"],
    LANDSCAPING: ["Landscaping", "Grounds Maintenance"],
    CLEANING: ["Commercial Cleaning", "Janitorial"],
    GENERAL_MAINTENANCE: ["Handyperson", "General Maintenance"],
    PEST_CONTROL: ["Pest Control", "Exterminator"],
    ROOFING: ["Roofing Contractor", "Emergency Tarping"],
    SNOW_REMOVAL: ["Snow Removal", "De-icing"],
  };
  const skills =
    skillMap[category.toUpperCase()] ?? ["General Maintenance"];

  // --- Summary ---------------------------------------------------------------
  const summary = [
    `Triage for ${category} request at ${propertyType} property.`,
    `Stated urgency: ${urgency} \u2192 computed score: ${score}/10.`,
    skills.length
      ? `Recommended vendor skills: ${skills.join(", ")}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    summary,
    urgencyScore: score,
    suggestedCategory: category,
    suggestedVendorSkills: skills,
  };
}
