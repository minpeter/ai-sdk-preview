// Define your models here.

export interface Model {
  id: string;
  label: string;
  apiIdentifier: string;
  description: string;
}

export const models: Array<Model> = [
  {
    id: "meta-llama-3.1-8b-instruct",
    label: "Meta LLaMA 3.1 8B Instruct",
    apiIdentifier: "meta-llama-3.1-8b-instruct",
    description: "$0.1 / 1M tokens",
  },
  {
    id: "meta-llama-3.1-70b-instruct",
    label: "Meta LLaMA 3.1 70B Instruct",
    apiIdentifier: "meta-llama-3.1-70b-instruct",
    description: "$0.6 / 1M tokens",
  },
  {
    id: "mixtral-8x7b-instruct-v0-1",
    label: "Mixtral 8x7B Instruct v0.1",
    apiIdentifier: "mixtral-8x7b-instruct-v0-1",
    description: "$0.4 / 1M tokens",
  },
] as const;

export const DEFAULT_MODEL_NAME: string = "meta-llama-3.1-8b-instruct";
