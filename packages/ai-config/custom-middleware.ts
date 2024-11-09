import {
  Experimental_LanguageModelV1Middleware,
  LanguageModelV1StreamPart,
} from "ai";
import { HermesToolCallPrompt } from "./prompts";

export const customMiddleware: Experimental_LanguageModelV1Middleware = {
  transformParams: async ({ params }) => {
    console.log("transformParams called");

    console.log(`params: ${JSON.stringify(params, null, 2)}`);
    return {
      //   ...params,
      inputFormat: "messages",
      mode: {
        type: "regular",
      },
      stopSequences: ["</tool_call>"],
      prompt:
        params.prompt[0].role === "system"
          ? [
              {
                role: "system",
                content: HermesToolCallPrompt + "\n" + params.prompt[0].content,
              },
              ...params.prompt.slice(1),
            ]
          : [
              {
                role: "system",
                content: HermesToolCallPrompt,
              },
              ...params.prompt,
            ],
    };
  },

  wrapStream: async ({ doStream, params }) => {
    console.log("doStream called");
    console.log(`params: ${JSON.stringify(params, null, 2)}`);

    const { stream, ...rest } = await doStream();

    let generatedText = "";
    let toolCallString = "";
    let StartToolCall = false;

    const transformStream = new TransformStream<
      LanguageModelV1StreamPart,
      LanguageModelV1StreamPart
    >({
      transform(chunk, controller) {
        if (chunk.type === "text-delta") {
          generatedText += chunk.textDelta;

          if (StartToolCall) {
            toolCallString += chunk.textDelta;
          } else if (chunk.textDelta.includes("<tool_call>")) {
            console.log("tool call detected!!!");
            StartToolCall = true;
          } else {
            controller.enqueue(chunk);
          }
        } else if (chunk.type === "finish") {
          if (StartToolCall) {
            console.log("tool call finished!!!");

            const toolCall = JSON.parse(toolCallString);

            controller.enqueue({
              type: "tool-call",
              toolCallType: "function",
              toolCallId: "1",
              toolName: toolCall.name,
              args: JSON.stringify(toolCall.arguments),
            });
          }

          controller.enqueue(chunk);
        } else {
          controller.enqueue(chunk);
        }
      },

      flush() {
        console.log("doStream finished");
        console.log(`generated text: ${generatedText}`);
        console.log(`tool call string: ${toolCallString}`);
      },
    });

    return {
      stream: stream.pipeThrough(transformStream),
      ...rest,
    };
  },
};
