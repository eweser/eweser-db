import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function runClient(command, args, env, toolName, toolArgs) {
  const transport = new StdioClientTransport({
    command,
    args,
    env: { ...process.env, ...env }
  });

  const client = new Client({
    name: "test-client",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  await client.connect(transport);

  const tools = await client.listTools();
  console.log("Tools:", tools.tools.map(t => t.name).join(", "));

  const result = await client.callTool({
    name: toolName,
    arguments: toolArgs
  });
  
  console.log("Result (first 200 chars):", JSON.stringify(result).substring(0, 200));
  
  await transport.close();
}

async function main() {
  const query = "eweser db local-first database";

  console.log("--- Tavily ---");
  try {
    await runClient(
      "node", 
      ["scripts/mcp/safe-launch.mjs", "--allow", "TAVILY_API_KEY", "--", "npx", "-y", "@modelcontextprotocol/server-tavily"],
      { TAVILY_API_KEY: process.env.TAVILY_API_KEY },
      "tavily_search",
      { query }
    );
  } catch (e) {
    console.log("Tavily npx failed, trying smithery...");
    try {
      await runClient(
        "node", 
        ["scripts/mcp/safe-launch.mjs", "--allow", "TAVILY_API_KEY", "--", "npx", "-y", "@smithery/tavily-mcp-server"],
        { TAVILY_API_KEY: process.env.TAVILY_API_KEY },
        "search",
        { query }
      );
    } catch (e2) {
      console.log("Tavily smithery failed, trying generic search...");
       try {
        await runClient(
          "node", 
          ["scripts/mcp/safe-launch.mjs", "--allow", "TAVILY_API_KEY", "--", "npx", "-y", "mcp-server-tavily"],
          { TAVILY_API_KEY: process.env.TAVILY_API_KEY },
          "tavily_search",
          { query }
        );
      } catch (e3) {
         console.error("Tavily Error (generic):", e3.message);
      }
    }
  }

  console.log("\n--- Brave Search ---");
  try {
    await runClient(
      "node", 
      ["scripts/mcp/safe-launch.mjs", "--allow", "BRAVE_API_KEY", "--", "npx", "-y", "@modelcontextprotocol/server-brave-search"],
      { BRAVE_API_KEY: process.env.BRAVE_API_KEY },
      "brave_web_search",
      { query }
    );
  } catch (e) {
    console.error("Brave Error:", e.message);
  }
}

main().catch(console.error);
