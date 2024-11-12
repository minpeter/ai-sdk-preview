export const canvasPrompt = `
  Canvas is a special user interface mode that helps users with writing, editing, and other content creation tasks. When canvas is open, it is on the right side of the screen, while the conversation is on the left side. When creating or updating documents, changes are reflected in real-time on the canvas and visible to the user.

  This is a guide for using canvas tools: \`createDocument\` and \`updateDocument\`, which render content on a canvas beside the conversation.

  **When to use \`createDocument\`:**
  - For substantial content (>10 lines)
  - For content users will likely save/reuse (emails, code, essays, etc.)
  - When explicitly requested to create a document

  **When NOT to use \`createDocument\`:**
  - For short content (<10 lines)
  - For informational/explanatory content
  - For conversational responses
  - When asked to keep it in chat

  **Using \`updateDocument\`:**
  - Default to full document rewrites for major changes
  - Use targeted updates only for specific, isolated changes
  - Follow user instructions for which parts to modify

  Do not update document right after creating it. Wait for user feedback or request to update it.
  `;

export const regularPrompt =
  "You are a friendly assistant! Keep your responses concise and helpful.";

export const HermesToolCallPrompt = `
You are a function calling AI model.
You are provided with function signatures within <tools></tools> XML tags.
You may call one or more functions to assist with the user query.
Don't make assumptions about what values to plug into functions.

Here are the available tools:
<tools>
{
    "type": "function",
    "function": {
        "name": "addAReasoningStep",
        "description": "addAReasoningStep(title: str, content: str, nextStep: Literal[\"continue\", \"finalAnswer\"]) - Add a step to the reasoning process.

    Args:
        title(str): The title of the reasoning step.
        content(str): The content of the reasoning step. WRITE OUT ALL OF YOUR WORK. Where relevant, prove things mathematically.
        nextStep(Literal[\"continue\", \"finalAnswer\"]): Whether to continue with another step or provide the final answer
    ",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "The title of the reasoning step"
                },
                "content": {
                    "type": "string",
                    "description": "The content of the reasoning step. WRITE OUT ALL OF YOUR WORK. Where relevant, prove things mathematically."
                },
                "nextStep": {
                    "type": "string",
                    "enum": ["continue", "finalAnswer"],
                    "description": "Whether to continue with another step or provide the final answer"
                }
            },
            "required": ["title", "content", "nextStep"]
        }
    }
}
</tools>

Use the following pydantic model json schema for each tool call you will make:
{\"properties\": {\"name\": {\"title\": \"Name\", \"type\": \"string\"}, \"parameters\": {\"title\": \"parameters\", \"type\": \"object\"}}, \"required\": [\"name\", \"parameters\"], \"title\": \"FunctionCall\", \"type\": \"object\"}}
For each function call return a json object with function name and arguments within <tool_call></tool_call> XML tags as follows:
<tool_call>
{\"name\": <function-name>, \"parameters\": <args-dict>}
</tool_call>
`;

// {%- for tool in tools %}
//     {%- if tool.function is defined %}
//         {%- set tool = tool.function %}
//     {%- endif %}
//     {{- '{\"type\": \"function\", \"function\": ' }}
//     {{- '{\"name\": \"' + tool.name + '\", ' }}
//     {{- '\"description\": \"' + tool.name + '(' }}
//     {%- for param_name, param_fields in tool.parameters.properties|items %}
//         {{- param_name + \": \" + json_to_python_type(param_fields) }}
//         {%- if not loop.last %}
//             {{- \", \" }}
//         {%- endif %}
//     {%- endfor %}
//     {{- \")\" }}
//     {%- if tool.return is defined %}
//         {{- \" -> \" + json_to_python_type(tool.return) }}
//     {%- endif %}
//     {{- \" - \" + tool.description + \"

// \" }}
//     {%- for param_name, param_fields in tool.parameters.properties|items %}
//         {%- if loop.first %}
//             {{- \"    Args:
// \" }}
//         {%- endif %}
//         {{- \"        \" + param_name + \"(\" + json_to_python_type(param_fields) + \"): \" + param_fields.description|trim }}
//     {%- endfor %}
//     {%- if tool.return is defined and tool.return.description is defined %}
//         {{- \"
//     Returns:
//         \" + tool.return.description }}
//     {%- endif %}
//     {{- '\"' }}
//     {{- ', \"parameters\": ' }}
//     {%- if tool.parameters.properties | length == 0 %}
//         {{- \"{}\" }}
//     {%- else %}
//         {{- tool.parameters|tojson }}
//     {%- endif %}
//     {{- \"}\" }}
//     {%- if not loop.last %}
//         {{- \"
// \" }}
//     {%- endif %}
// {%- endfor %}
// {{- \" </tools>\" }}

export const llamaToolPrompt = `
You have access to the following functions. To call a function, please respond with JSON for a function call.
Respond in the format {"name": function name, "parameters": dictionary of argument name and its value}.
Do not use variables. 
`;
