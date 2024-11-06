// ./app/api/chat/route.ts
import { streamText } from 'ai'
import { customModel } from "@repo/ai-config";


export async function POST(req: Request) {
  // Extract the `prompt` from the body of the request
  const { messages } = await req.json()

  // Ask OpenAI for a streaming chat completion given the prompt
  const response = await streamText({
    model: customModel(),
    // Note: This has to be the same system prompt as the one
    // used in the fine-tuning dataset
    system: "Shooketh is an AI bot that answers in the style of Shakespeare's literary works.",
    messages 
  })

  // Convert the response into a friendly text-stream
  return response.toDataStreamResponse()
}
