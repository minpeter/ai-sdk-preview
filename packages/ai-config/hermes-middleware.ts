import {
  Experimental_LanguageModelV1Middleware,
  generateId,
  LanguageModelV1StreamPart,
} from "ai";
import { HermesToolCallPrompt, llamaToolPrompt } from "./prompts";

export const hermesToolMiddleware: Experimental_LanguageModelV1Middleware = {
  // @ts-ignore
  transformParams: async ({ params }) => {
    // console.log("transformParams called");

    const processedPrompt = params.prompt.map((message) => {
      if (message.role === "assistant") {
        const toolCalls = message.content.filter(
          (content) => content.type === "tool-call"
        );

        message.content.map((content) => {
          if (content.type === "tool-call") {
            return {
              role: "assistant",
              content: toolCalls.map(() => ({
                type: "text",
                text: `<tool_call>"name": "${content.toolName}", "arguments": ${content.args}</tool_call>`,
              })),
            };
          } else {
            //
          }
        });
      }

      if (message.role === "tool") {
        return {
          role: "user",
          content: [
            {
              type: "text",
              text: message.content
                .map((content) => `<tool_response>${content}</tool_response>`)
                .join("\n"),
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
              content:
                "*Never perform two tool_calls in one turn*".toUpperCase() +
                HermesToolCallPrompt +
                "\n" +
                processedPrompt[0].content,
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

    console.log(
      `params: ${JSON.stringify(toolSystemPrompt.slice(1), null, 2)}`
    );

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
        if (chunk.type === "text-delta") {
          generatedText += chunk.textDelta;
          console.log(`chunk.textDelta: ${chunk.textDelta}`);

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
                const extractedJson = extractJson(toolCall);
                console.log(`toolCall: ${toolCall}`);
                console.log(`extractedJson: ${extractedJson}`);
                const parsedToolCall = JSON.parse(extractedJson[0]);

                // const extractedJson = extractJson(toolCall);
                // const parsedToolCall = fixBrokenJSON(extractedJson[0]);
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

                controller.enqueue({
                  type: "text-delta",
                  textDelta: `ERROR ON PARSING TOOL CALL: ${toolCall}`,
                });
                // console.log(e);
              }
            });
          }

          controller.enqueue(chunk);
        } else {
          controller.enqueue(chunk);
        }
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

function extractJson(text: string): string[] {
  const jsonStrings: string[] = [];
  const stack: number[] = [];
  let startIdx: number | null = null;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === "{") {
      if (stack.length === 0) {
        startIdx = i;
      }
      stack.push(i);
    } else if (char === "}") {
      stack.pop();
      if (stack.length === 0 && startIdx !== null) {
        const jsonStr = text.slice(startIdx, i + 1);
        try {
          JSON.parse(jsonStr);
          jsonStrings.push(jsonStr);
        } catch {}
        startIdx = null;
      }
    }
  }

  return jsonStrings;
}
