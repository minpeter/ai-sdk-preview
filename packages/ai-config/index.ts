import { createFriendliAI } from "@friendliai/ai-provider";
import { experimental_wrapLanguageModel as wrapLanguageModel } from "ai";

import { DEFAULT_MODEL_NAME } from "./models";

import { customMiddleware } from "./custom-middleware";
import { hermesToolMiddleware } from "./hermes-middleware";
import { llamaToolMiddleware } from "./llama-middleware";

// The friendli engine supports tool calls, but I disabled them for this demo.
const friendli = createFriendliAI({
  // baseURL: "http://localhost:8000/v1",
});

export const customModel = (apiIdentifier: string = DEFAULT_MODEL_NAME) => {
  return wrapLanguageModel({
    model: friendli(apiIdentifier),
    middleware: customMiddleware,
  });
};

export const hermesModel = (apiIdentifier: string = DEFAULT_MODEL_NAME) => {
  return wrapLanguageModel({
    model: friendli(apiIdentifier),
    middleware: hermesToolMiddleware,
  });
};

export const llamaModel = (apiIdentifier: string = DEFAULT_MODEL_NAME) => {
  return wrapLanguageModel({
    model: friendli(apiIdentifier),
    middleware: llamaToolMiddleware,
  });
};
