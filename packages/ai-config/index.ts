import { createFriendliAI } from "@friendliai/ai-provider";
import { experimental_wrapLanguageModel as wrapLanguageModel } from "ai";

import { DEFAULT_MODEL_NAME } from "./models";

import { customMiddleware } from "./custom-middleware";

const friendli = createFriendliAI({
  baseURL: "http://gpu03:8000/v1",
});

export const customModel = (apiIdentifier: string = DEFAULT_MODEL_NAME) => {
  return wrapLanguageModel({
    model: friendli(apiIdentifier),
    middleware: customMiddleware,
  });
};
