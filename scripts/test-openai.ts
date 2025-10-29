import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

async function testOpenAI() {
  console.log("🧪 Testing OpenAI API connection...");
  console.log("API Key:", process.env.OPENAI_API_KEY?.substring(0, 20) + "...");

  try {
    const result = await generateText({
      model: openai("gpt-4o"),
      prompt: "Say hello in one word",
    });

    console.log("✅ OpenAI API is working!");
    console.log("Response:", result.text);
    console.log("Usage:", result.usage);
  } catch (error) {
    console.error("❌ OpenAI API test failed:");
    console.error(error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
    }
  }
}

testOpenAI();
