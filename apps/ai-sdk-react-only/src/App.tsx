"use client";

import { useChat } from "ai/react";
import { createFriendliAI } from "@friendliai/ai-provider";
import { convertToCoreMessages, streamText } from "ai";
import { useState } from "react";
import { z } from "zod";

export default function App() {
  const [token, setToken] = useState<string>("");

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      experimental_throttle: 100,
      api: "/api/chat",
      fetch: async (_, options) => {
        const body = JSON.parse(options?.body as string);

        const friendli = createFriendliAI({
          apiKey: token,
        });

        const result = await streamText({
          model: friendli("meta-llama-3.1-8b-instruct"),
          messages: convertToCoreMessages(body.messages),
          tools: {
            weather: {
              description: "get the weather information",
              parameters: z.object({
                location: z.string(),
              }),
              execute: async ({ location }) => {
                return `The weather in ${location} is 30
                degrees Celsius with a 20% chance of rain.`;
              },
            },
          },
          maxSteps: 3,
        });

        return result.toDataStreamResponse();
      },
    });

  const isWaiting =
    isLoading && messages[messages.length - 1]?.role !== "assistant";

  return (
    <>
      <input
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Paste your token here"
      />

      {messages.map((message) => (
        <div key={message.id}>
          {`${message.role}: ${message.content}`}
          {message.toolInvocations?.map(
            (toolInvocation) =>
              `${toolInvocation.toolName}: ${JSON.stringify(
                toolInvocation.args
              )} -> ${toolInvocation.state}`
          )}
        </div>
      ))}

      {(isWaiting || error) &&
        (isWaiting
          ? "AI is thinking..."
          : error && "An error has occurred. Please try again later.")}

      <form onSubmit={handleSubmit}>
        <input name="prompt" value={input} onChange={handleInputChange} />
        <button type="submit">Submit</button>
      </form>
    </>
  );
}
