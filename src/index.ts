#!/usr/bin/env node

import {Server} from "@modelcontextprotocol/sdk/server/index.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import * as gql from 'gql-query-builder'
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";

//import * as dotenv from 'dotenv';
//dotenv.config();


function getApiKey(): string {
    const apiKey = process.env.LOCO_API_TOKEN;
    if (!apiKey) {
        console.error("LOCO_API_TOKEN environment variable is not set");
        process.exit(1);
    }
    return apiKey;
}

function getLocoApiBase(): string {
    const apiBase = process.env.LOCO_API_BASE;
    if (!apiBase) {
        return "https://loco-app.expando.dev/api/graphql";
    }
    return apiBase;
}

async function makeLocoRequestGraphql<T>(query: object): Promise<T> {

    let apiToken = getApiKey();
    const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
    };

    try {
        const response = await fetch(getLocoApiBase(), {
            method: 'POST',
            headers,
            body: JSON.stringify(query),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json() as T;
    } catch (error) {
        const message = `Error making Loco GraphQL request, error: ${error instanceof Error ? error.message : String(error)}\n`;
        throw new Error(`HTTP error! status: ${message}`);
    }
}


interface ActionData {
    status: string;
    errors: {
        code: string;
        message: string;
    }[];
}

interface PageInfoData {
    hasNextPage: boolean;
    endCursor: string | null;
    count: number;
    total: number;
}

interface ProductTranslationDeleteData {
    data: {
        productTranslationDelete: ActionData;
    }
}

interface GlossaryItemCreateOrUpdateData {
    data: {
        glossaryItemCreateOrUpdate: {
            glossaries: {
                glossaryId: string;
            }[],
            errors: {
                code: string;
                message: string;
            }[];
        };
    }
}

interface ProductsData {
    data: {
        products: {
            edges: any,
            pageInfo: PageInfoData,
        }
    }
}

function graphqlQueryPageInfo(): string[] {
    return ['hasNextPage', 'endCursor', 'count', 'total'];
}

function graphqlQueryAction() {
    return [
        'status', {'errors': ['code', 'message']}
    ];
}

function languagesArray()
{
    return ["cs_CZ", "sk_SK", "pl_PL", "en_GB", "de_DE", "hr_HR", "hu_HU", "fr_FR", "it_IT", "ro_RO", "sl_SI", "de_AT", "uk_UA", "lt_LT", "en_US", "ru_RU", "es_ES", "nl_NL", "da_DK", "bg_BG", "pt_PT", "el_GR", "lv_LV", "et_EE", "vi_VN", "fi_FI", "sv_SE", "nb_NO", "tr_TR", "mt_MT", "ja_JP", "id_ID", "ka_GE", "is_IS",];
}

function createResponse(message: string, isError: boolean = false) {
    return {
        content: [{
            type: "text",
            text: message,
        }],
        isError: isError
    };
}

const PRODUCT_LIST_TOOL: Tool = {
    name: "product_list",
    description: "Returns information about the total number of products in pageInfo, ie. Due to the number you can use First: 1.",
    inputSchema: {
        type: "object",
        properties: {
            first: {
                type: "number",
                description: "Count product to page"
            },
            after: {
                type: "string",
                description: "Cursor for pagination"
            },
            identifier: {
                type: "string",
                description: "Filter by client ID (e.g. 'ABC-123', '1456', etc.)"
            }
        },
        required: ["first"]
    }
};

const PRODUCT_DELETE_TRANSLATION_TOOL: Tool = {
    name: "product_delete_translation",
    description: "Call this action to delete a product translation.",
    inputSchema: {
        type: "object",
        properties: {
            productIdentifier: {
                type: "string",
                description: "Product client ID"
            },
            language: {
                type: "string",
                description: "Language for delete. If it is empty, it removes translations into all languages.",
                enum: languagesArray()
            }
        },
        required: ["productIdentifier"]
    }
};

const GLOSSARY_ITEM_CREATE_OR_UPDATE_TOOL: Tool = {
    name: "glossary_item_create_or_update",
    description: "Call this event to create a glossary for translation. If there is a source text in a given language, the translation will be updated.",
    inputSchema: {
        type: "object",
        properties: {
            languageFrom: {
                type: "string",
                description: "Source text language",
                enum: languagesArray()
            },
            textSource: {
                type: "string",
                description: "Source text glossary"
            },
            languageTo: {
                type: "string",
                description: "Target text language",
                enum: languagesArray()
            },
            textTarget: {
                type: "string",
                description: "Target text glossary"
            },
        },
        required: ["languageFrom", "textSource", "languageTo", "textTarget"]
    }
};

const LOCO_TOOLS = [
    PRODUCT_LIST_TOOL,
    PRODUCT_DELETE_TRANSLATION_TOOL,
    GLOSSARY_ITEM_CREATE_OR_UPDATE_TOOL,
] as const;

const productNode = [
    'productId', 'status', 'identifier', 'code', 'url',  'imageId',
    {'translation': ['language', 'title']}
];

async function handleProductList(
    first: number,
    after: string | null = null,
    identifier: string | null = null
) {

    let variables: any = {
        first: {value: first, required: true},
    }

    if (after !== null) {
        variables.after = after;
    }

    if (identifier !== null) {
        variables.identifier = identifier.toString();
    }

    const query = gql.query({
        operation: 'products',
        variables: variables,
        fields: [{
            edges: [{
                node: [
                    'productId', 'code', 'identifier', 'status',
                    {'translation': ['language', 'title', 'description']}
                ]
            }],
            pageInfo: graphqlQueryPageInfo()
        }]
    });

    let data;
    try {
        let response = await makeLocoRequestGraphql<ProductsData>(query);
        data = response.data.products
        if (!data) {
            return createResponse("Failed to retrieve data from loco", true);
        }
    } catch (error) {
        let msg = error instanceof Error ? error.message : String(error);
        return createResponse(msg, true);
    }

    if (data.edges.length === 0) {
        return createResponse("No products found", true);
    }

    return createResponse(JSON.stringify(data), true);
}

async function handleProductDeleteTranslation(
    productIdentifier: string,
    language: string | null = null
) {

    const query = gql.mutation({
        operation: 'productTranslationDelete',
        variables: {
            language: {value: language, type: 'LanguageEnum'},
            productIdentifier: {value: productIdentifier},
        },
        fields: graphqlQueryAction()
    });

    let data;
    try {
        let response = await makeLocoRequestGraphql<ProductTranslationDeleteData>(query);
        data = response.data.productTranslationDelete;
        if (!data.status) {
            return createResponse("Failed to retrieve data from loco", true);
        }

    } catch (error) {
        let msg = error instanceof Error ? error.message : String(error);
        return createResponse(msg, true);
    }
    return createResponse(JSON.stringify(data));
}

async function handleGlossaryItemCreateOrUpdate(
    languageFrom: string,
    textSource: string,
    languageTo: string,
    textTarget: string,
) {

    const query = gql.mutation({
        operation: 'glossaryItemCreateOrUpdate',
        variables: {
            'input': {
                value: [{
                    languageFrom: languageFrom,
                    textSource: textSource,
                    languageTo: languageTo,
                    textTarget: textTarget,
                }],
                type: '[CreateGlossaryInput!]'
            }
        },
        fields: [
            {'glossaries': ['glossaryId']}, {'errors': ['code', 'message']}
        ]
    });

    let data;
    try {
        let response = await makeLocoRequestGraphql<GlossaryItemCreateOrUpdateData>(query);
        data = response.data.glossaryItemCreateOrUpdate;
        if (data.errors.length > 0) {
            return createResponse("Failed to retrieve data from loco", true);
        }
    } catch (error) {
        let msg = error instanceof Error ? error.message : String(error);
        return createResponse(msg, true);
    }
    return createResponse(JSON.stringify(data));
}

// Server setup
const server = new Server(
    {
        name: "mcp-server/loco-app",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    },
);

// Set up request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: LOCO_TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        switch (request.params.name) {
            case "product_list": {
                const { first } = request.params.arguments as { first: number };
                const { after } = request.params.arguments as { after: string | null };
                const { identifier } = request.params.arguments as { identifier: string | null };
                return await handleProductList(first, after, identifier);
            }

            case "product_delete_translation": {
                const { productIdentifier } = request.params.arguments as { productIdentifier: string };
                const { language } = request.params.arguments as { language: string | null };
                return await handleProductDeleteTranslation(productIdentifier, language);
            }

            case "glossary_item_create_or_update": {
                const { languageFrom } = request.params.arguments as { languageFrom: string };
                const { textSource } = request.params.arguments as { textSource: string };
                const { languageTo } = request.params.arguments as { languageTo: string };
                const { textTarget } = request.params.arguments as { textTarget: string };
                return await handleGlossaryItemCreateOrUpdate(languageFrom, textSource, languageTo, textTarget);
            }

            default:
                return createResponse(`Unknown tool: ${request.params.name}`, true);
        }
    } catch (error) {
        return createResponse(`Error: ${error instanceof Error ? error.message : String(error)}`, true);
    }
});

async function runServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Loco MCP Server running on stdio");
}

runServer().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});