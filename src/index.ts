import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {z} from "zod";
import * as dotenv from 'dotenv';
import {actionDeleteProductTranslation, getProducts} from './product.js';
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
    "get-products",
    "Returns information about the total number of products in pageInfo, ie. Due to the number you can use First: 1.",
    {
        first: z.number().min(1).max(100).default(10).describe("Count product to page"),
        after: z.string().describe("Cursor for pagination").nullable().optional(),
        identifier: z.any().describe("Filter by client ID (e.g. 'ABC-123', '1456', etc.)").nullable().optional(),
    },
    async ({first, after = null, identifier = null}) => {
        const result = await getProducts(
            LOCO_API_TOKEN,
            first,
            after,
            identifier
        );

        return {
            content: [{
                type: "text",
                text: JSON.stringify(result.data),
            }],
        };
    },
);

server.tool(
    "action-delete-product-translation",
    "Call this action to delete a product translation.",
    {
        productIdentifier: z.string().describe("Product client ID"),
        language: z.string().length(5).describe("Allow language is cs_CZ|sk_SK|pl_PL. If it is empty, it removes translations into all languages.").nullable().optional(),
    },
    async ({productIdentifier, language = null}) => {
        const result = await actionDeleteProductTranslation(
            LOCO_API_TOKEN,
            productIdentifier,
            language,
        );

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
