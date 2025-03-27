import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {infer, z} from "zod";
import fetch from "node-fetch";
import * as gql from 'gql-query-builder'

const LOCO_API_BASE = "https://connector.local/api/graphql";

import * as dotenv from 'dotenv';
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

function getApiKey(): string {
    const apiKey = process.env.LOCO_API_TOKEN;
    if (!apiKey) {
        console.error("LOCO_API_TOKEN environment variable is not set");
        process.exit(1);
    }
    return apiKey;
}

const LOCO_API_TOKEN = getApiKey();

async function makeLocoRequestGraphql<T>(query: object): Promise<T | null> {
    const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${LOCO_API_TOKEN}`,
        'Content-Type': 'application/json',
    };

    try {
        const response = await fetch(LOCO_API_BASE, {
            method: 'POST',
            headers,
            body: JSON.stringify(query),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: any = await response.json() as any;
        return data as T; // Předpokládám, že data jsou v `data.data`
    } catch (error) {
        const message = `Error making Loco GraphQL request, error: ${error instanceof Error ? error.message : String(error)}\n`;
        throw new Error(`HTTP error! status: ${message}`);
    }
}

async function getProducts(first: number, after: string|null) {
    let variables: any = {
        //connectionIdExport: { value: 7, required: true },
        first: { value: first, required: true },
    }

    if (after !== null) {
        variables.after = after;
    }

    /*
    if (identifier !== null) {
        variables.identifier = identifier;
    }
     */

    const query = gql.query({
        operation: 'products',
        variables: variables,
        fields: [{
            edges: [{
                node: ['code', 'identifier']
            }],
            pageInfo: ['hasNextPage', 'endCursor', 'count', 'total']
        }]
    });

    let data;
    try {
        let response = await makeLocoRequestGraphql<any>(query);
        data = response.data.products
        if (!data) {
            return {
                success: false,
                message: "Failed to retrieve data from loco",
                data: null
            };
        }

    } catch (error) {
        let msg = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            message: msg,
            data: null
        };
    }

    if (data.edges.length === 0) {
        return {
            success: true,
            message: "No products found",
            data: []
        };
    }

    return {
        success: true,
        message: `Count product: ${data.edges.length}`,
        data: data
    };
}

server.tool(
    "get-loco-products",
    "Returns information about the total number of products in pageInfo, ie. Due to the number you can use First: 1.",
    {
        /*identifier: z.string()
            .min(2, 'You have exceeded the minimum number of characters')
            .max(20, 'You have exceeded the maximum number of characters')
            .describe("This is a clear client product identifier (eg 'ABC-123-H', '250', 'AACCDD')")
            .optional(),*/
        first: z.number()
            .min(1)
            .max(100)
            .describe("Count product to page")
            .optional(),
        after: z.string()
            .describe("Cursor for pagination")
            .optional(),
    },
    async ({first = 2, after = null}) => {
        const result = await getProducts(first, after);
        
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

/*
    console.log('-------------------------');
    console.log(getProducts());

 */
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
