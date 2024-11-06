import { vacationSchemaObject } from "@/lib/schema";
import { customModel } from "@repo/ai-config";
import { streamObject } from "ai";

export async function POST() {
  const result = await streamObject({
    schema: vacationSchemaObject,
    output: "object",
    model: customModel(),
    prompt: "Generate 3 vacation destinations",
  });

  return result.toTextStreamResponse();
}
