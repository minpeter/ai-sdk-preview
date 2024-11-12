import {
  Experimental_LanguageModelV1Middleware,
  generateId,
  LanguageModelV1StreamPart,
} from "ai";
import { HermesToolCallPrompt, llamaToolPrompt } from "./prompts";
import { isParsableJson } from "@ai-sdk/provider-utils";

export const customMiddleware: Experimental_LanguageModelV1Middleware = {
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

interface CodeBlock {
  start: number;
  end: number;
}

function findCodeBlockRegions(text: string): CodeBlock[] {
  const codeBlockRegex = /```[\s\S]*?```/g;
  const regions: CodeBlock[] = [];
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    regions.push({ start: match.index, end: match.index + match[0].length });
  }

  return regions;
}

//updated extractJson function to handle code blocks with { }
function extractJsonExcludingCodeBlocks(
  text: string,
  codeBlocks: CodeBlock[]
): string[] {
  const jsonStrings: string[] = [];
  const stack: number[] = [];
  let startIdx: number | null = null;
  let currentPos = 0;

  // Function to check if current position is inside any code block
  function isInsideCodeBlock(pos: number): boolean {
    return codeBlocks.some((block) => pos >= block.start && pos < block.end);
  }

  for (let i = 0; i < text.length; i++) {
    if (isInsideCodeBlock(i)) {
      // If inside a code block, skip to the end of the block
      const block = codeBlocks.find(
        (block) => i >= block.start && i < block.end
      );
      if (block) {
        i = block.end - 1; // -1 because the loop will increment i
        continue;
      }
    }

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
        if (isParsableJson(jsonStr)) {
          jsonStrings.push(jsonStr);
        }
        startIdx = null;
      }
    }
  }

  return jsonStrings;
}

const llamaBuiltInTools = new Set([
  "code-interpreter",
  "brave-search",
  "wolfram-alpha",
]);

export const llamaToolMiddleware: Experimental_LanguageModelV1Middleware = {
  //@ts-ignore
  transformParams: async ({ params }) => {
    // TODO: add support for object-tool and object-json so that we can use the tool middleware for them
    if (
      params.mode.type === "object-tool" ||
      params.mode.type === "object-json"
    ) {
      return params;
    }

    let builtInTools: string[] = [];
    let providedTools: typeof params.mode.tools = [];
    let fullSystemPrompt: string = ``;

    // convert to underscores because llama does better with pythonic standards
    if (params.mode.tools) {
      params.mode.tools.forEach((tool) => {
        if (llamaBuiltInTools.has(tool.name))
          builtInTools.push(tool.name.replace("-", "_"));
        else providedTools.push(tool);
      });
    }

    const processedPrompt = params.prompt.map((message) => {
      switch (message.role) {
        case "system": {
          const systemPrompt = message.content;

          if (builtInTools.length > 0) {
            fullSystemPrompt += `Environment: ipython`;
            const realBuiltInTools = builtInTools.filter(
              (tool) => tool !== "code_interpreter"
            );
            if (realBuiltInTools.length > 0) {
              fullSystemPrompt += `
                          Tools: ${realBuiltInTools.filter((tool) => tool !== "code_interpreter").join(", ")} 
                          `;
            }
          }
          fullSystemPrompt += `
      Cutting Knowledge Date: December 2023
      Today Date: ${new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}`;

          if (providedTools.length > 0) {
            fullSystemPrompt += `
      ${llamaToolPrompt}
      ${JSON.stringify(providedTools)}
      `;
          }

          fullSystemPrompt += `\n${systemPrompt}`;

          return {
            role: "system",
            content: fullSystemPrompt.trim(),
          };
        }
        case "assistant": {
          const assistantContent = message.content.map((content) => {
            if (content.type === "tool-call") {
              return `
                      {
                        "name": "${content.toolName}",
                        "arguments": ${JSON.stringify(content.args)}
                      }
                      `;
            } else {
              return content.text;
            }
          });

          return {
            role: "assistant",
            content: assistantContent.join("\n"),
          };
        }
        case "tool": {
          const toolContent = message.content.map((content) => {
            if (content.isError) {
              return `
                      {
                        "output": "Error executing tool: ${content.toolName}.",
                      }
                    `;
            }

            return `{
                      "name": ${content.toolName},
                      "output": ${content.result},
                    }`;
          });

          return {
            role: "ipython",
            content: toolContent.join(", "),
          };
        }
        default: {
          return message;
        }
      }
    });

    console.dir(processedPrompt, { depth: null });

    return {
      ...params,
      inputFormat: "messages",
      mode: {
        type: "regular",
      },
      prompt: processedPrompt,
    };
  },
  wrapGenerate: async ({ doGenerate }) => {
    const result = await doGenerate();

    const { text } = result;

    let processedText = text;
    let toolCalls: (typeof result)["toolCalls"] = [];
    let ipython = false;

    if (!processedText) return result;

    if (processedText.startsWith("<|python_tag|>")) ipython = true;

    if (ipython) {
      processedText = processedText.slice("<|python_tag|>".length);

      // built in tools follow the pattern <tool_name>.call(query="query")
      // currently only brave_search and wolfram_alpha are supported
      const builtInRegex =
        /\b(?<tool_name>\w+)\.call\(query="(?<query>[^"]*)"\)/;
      const match = processedText.match(builtInRegex);

      if (match && match.groups) {
        const toolName = match.groups.tool_name;
        const query = match.groups.query;
        toolCalls.push({
          toolName: toolName.replace("_", "-"),
          args: JSON.stringify({
            query,
          }),
          toolCallType: "function",
          toolCallId: generateId(9),
        });
      } else if (isParsableJson(processedText)) {
        // smaller llama models don't have any built-in tools but sometimes have the ipython tag for json tools

        const parsedTool = JSON.parse(processedText);
        toolCalls.push({
          toolName: parsedTool.name,
          args: JSON.stringify(parsedTool.parameters),
          toolCallId: generateId(9),
          toolCallType: "function",
        });
      } else if (processedText.includes(";")) {
        // smaller llama models sometimes split their tool calls with ; instead of ,
        const splitText = processedText.split(";");
        splitText.forEach((text) => {
          if (isParsableJson(text)) {
            const parsedTool = JSON.parse(text);
            toolCalls.push({
              toolName: parsedTool.name,
              args: JSON.stringify(parsedTool.parameters),
              toolCallId: generateId(9),
              toolCallType: "function",
            });
          }
        });
      } else {
        // if there's an ipython tag, but no built-in tool or json tool , assume code_interpreter
        toolCalls.push({
          toolName: "code-interpreter",
          args: JSON.stringify({
            code: processedText,
          }),
          toolCallType: "function",
          toolCallId: generateId(9),
        });
      }
    }

    // regular json tool calls
    const codeBlocks = findCodeBlockRegions(processedText);

    const jsonSegments = extractJsonExcludingCodeBlocks(
      processedText,
      codeBlocks
    );

    for (const jsonSegment of jsonSegments) {
      if (isParsableJson(jsonSegment)) {
        try {
          const parsedJson = JSON.parse(jsonSegment);
          const validToolCall =
            typeof parsedJson === "object" &&
            parsedJson !== null &&
            typeof parsedJson.name === "string" &&
            typeof parsedJson.parameters === "object" &&
            parsedJson.parameters !== null;

          if (validToolCall) {
            toolCalls.push({
              toolName: parsedJson.name,
              args: JSON.stringify(parsedJson.parameters),
              toolCallType: "function",
              toolCallId: generateId(9),
            });
          }
        } catch {
          continue;
        }
      }
    }

    return {
      ...result,
      text: processedText,
      toolCalls,
    };
  },
};
