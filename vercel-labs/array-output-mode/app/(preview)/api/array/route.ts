import { streamObject } from "ai";
import { customModel } from "@repo/ai-config";
import { vacationSchema } from "@/lib/schema";

export async function POST() {
  const result = await streamObject({
    schema: vacationSchema,
    output: "array",
    model: customModel(),
    prompt: "Generate 3 vacation destinations",
  });

  return result.toTextStreamResponse();
}
