import { createFriendliAI } from "@friendliai/ai-provider";
import { experimental_wrapLanguageModel as wrapLanguageModel } from "ai";

import { DEFAULT_MODEL_NAME } from "./models";

import { customMiddleware, llamaToolMiddleware } from "./custom-middleware";

// The friendli engine supports tool calls, but I disabled them for this demo.
const friendli = createFriendliAI({
  baseURL: "http://localhost:8000/v1",
});

export const customModel = (apiIdentifier: string = DEFAULT_MODEL_NAME) => {
  return wrapLanguageModel({
    model: friendli(apiIdentifier),
    middleware: customMiddleware,
  });
};

export const llamaModel = (apiIdentifier: string = DEFAULT_MODEL_NAME) => {
  return wrapLanguageModel({
    model: friendli(apiIdentifier),
    middleware: llamaToolMiddleware,
  });
};
