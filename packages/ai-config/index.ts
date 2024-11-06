import { friendli } from "@friendliai/ai-provider";
import { experimental_wrapLanguageModel as wrapLanguageModel } from "ai";

import { DEFAULT_MODEL_NAME } from "./models";

import { customMiddleware } from "./custom-middleware";

export const customModel = (apiIdentifier: string = DEFAULT_MODEL_NAME) => {
  return wrapLanguageModel({
    model: friendli(apiIdentifier),
    middleware: customMiddleware,
  });
};
