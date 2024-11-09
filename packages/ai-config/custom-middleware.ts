import {
  Experimental_LanguageModelV1Middleware,
  generateId,
  LanguageModelV1StreamPart,
} from "ai";
import { HermesToolCallPrompt } from "./prompts";

export const customMiddleware: Experimental_LanguageModelV1Middleware = {
  // @ts-ignore
  transformParams: async ({ params }) => {
    // console.log("transformParams called");

    const processedPrompt = params.prompt.map((message) => {
      if (message.role === "assistant") {
        const toolCalls = message.content.filter(
          (content) => content.type === "tool-call"
        );
        if (toolCalls.length > 0) {
          return {
            role: "assistant",
            content: toolCalls.map(() => ({
              type: "text",
              text: "tool call detected",
            })),
          };
        }
      }

      if (message.role === "tool") {
        return {
          role: "user",
          content: [
            {
              type: "text",
              //   text: `<tool_response>${JSON.stringify(message.content)}</tool_response>`,
              text: "tool response detected",
            },
          ],
        };
      }

      return message;
    });

    const toolSystemPrompt =
      processedPrompt[0].role === "system"
        ? [
            {
              role: "system",
              content: HermesToolCallPrompt + "\n" + processedPrompt[0].content,
            },
            ...processedPrompt.slice(1),
          ]
        : [
            {
              role: "system",
              content: HermesToolCallPrompt,
            },
            ...processedPrompt,
          ];

    // console.log(`params: ${JSON.stringify(toolSystemPrompt, null, 2)}`);

    return {
      ...params,
      inputFormat: "messages",
      mode: {
        type: "regular",
      },
      stopSequences: ["</tool_call>"],
      prompt: toolSystemPrompt,
    };
  },

  wrapStream: async ({ doStream, params }) => {
    // console.log("doStream called");
    // console.log(`params: ${JSON.stringify(params, null, 2)}`);

    const { stream, ...rest } = await doStream();

    let generatedText = "";
    let toolCallString: string[] = [];
    // 페너럴 툴 콜에 대해서 인덱스 별로 호출되었는지 감지하기 위한 변수
    let toolCallStartIndex: number = -1;

    console.log("doStream called");

    const transformStream = new TransformStream<
      LanguageModelV1StreamPart,
      LanguageModelV1StreamPart
    >({
      transform(chunk, controller) {
        console.log(`chunk: ${JSON.stringify(chunk, null, 2)}`);
        if (chunk.type === "text-delta") {
          generatedText += chunk.textDelta;

          if (toolCallStartIndex >= 0) {
            // toolCallString += chunk.textDelta;
            if (!toolCallString[toolCallStartIndex]) {
              toolCallString[toolCallStartIndex] = "";
            }
            toolCallString[toolCallStartIndex] += chunk.textDelta;

            // console.log(`tool call string: ${toolCallString}`);
          } else if (chunk.textDelta.includes("<tool_call>")) {
            console.log("tool call detected!!!");
            toolCallStartIndex += 1;
          } else {
            controller.enqueue(chunk);
          }
        } else if (chunk.type === "finish") {
          if (toolCallString.length > 0) {
            console.log("tool call finished!!!");

            toolCallString.forEach((toolCall) => {
              try {
                const parsedToolCall = JSON.parse(toolCall);
                controller.enqueue({
                  type: "tool-call",
                  toolCallType: "function",
                  toolCallId: generateId(),
                  toolName: parsedToolCall.name,
                  args: JSON.stringify(parsedToolCall.arguments),
                });
              } catch (e) {
                console.log("error while parsing tool call");
                console.log(toolCall);
                console.log(e);
              }
            });
          }

          controller.enqueue(chunk);
        }
        controller.enqueue(chunk);
      },

      flush() {
        // console.log("doStream finished");
        // console.log(`generated text: ${generatedText}`);
        // console.log(`tool call string: ${toolCallString}`);
      },
    });

    return {
      stream: stream.pipeThrough(transformStream),
      ...rest,
    };
  },
};
