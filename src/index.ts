import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {z} from "zod";
import * as dotenv from 'dotenv';
import { getProducts } from './product.js';
import { getApiKey } from './api.js';

dotenv.config();

// Create server instance
const server = new McpServer({
    name: "loco",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});

const LOCO_API_TOKEN = getApiKey();

server.tool(
    "get-loco-products",
    "Returns information about the total number of products in pageInfo, ie. Due to the number you can use First: 1.",
    {
        first: z.number().min(1).max(100).describe("Count product to page").optional(),
        after: z.string().describe("Cursor for pagination").optional(),
    },
    async ({first = 10, after = null}) => {
        const result = await getProducts(first, after, LOCO_API_TOKEN);
        
        return {
            content: [{
                type: "text",
                text: JSON.stringify(result.data),
            }],
        };
    },
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Loco MCP Server");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
