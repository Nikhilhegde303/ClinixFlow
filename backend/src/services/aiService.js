import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

/**
 * @desc Transforms raw patient symptoms into a professional summary and flags risks.
 * @param {string} rawText - The patient's description of their condition.
 */
export const summarizeSymptoms = async (rawText) => {
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a professional medical assistant. 
                    1. Summarize the patient's text into exactly three concise bullet points. 
                    2. If you detect "Red Flags" (e.g., chest pain, difficulty breathing, sudden numbness, severe bleeding), set 'ai_risk_flag' to true.
                    Return the output in strict JSON format: 
                    { "summary": "string", "ai_risk_flag": boolean }`
                },
                {
                    role: "user",
                    content: rawText,
                },
            ],
            model: "llama3-8b-8192", // High speed, low latency
            response_format: { type: "json_object" },
        });

        return JSON.parse(chatCompletion.choices[0].message.content);
    } catch (error) {
        console.error("AI Processing Error:", error);
        // Fallback for safety: return original text as summary and set flag to false
        return { 
            summary: rawText.substring(0, 100) + "...", 
            ai_risk_flag: false 
        };
    }
};