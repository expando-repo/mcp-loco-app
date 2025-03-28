import fetch from "node-fetch";
import * as dotenv from 'dotenv';

dotenv.config();

export function getApiKey(): string {
    const apiKey = process.env.LOCO_API_TOKEN;
    if (!apiKey) {
        console.error("LOCO_API_TOKEN environment variable is not set");
        process.exit(1);
    }
    return apiKey;
}

export function getLocoApiBase(): string {
    const apiBase = process.env.LOCO_API_BASE;
    if (!apiBase) {
        return "https://loco-app.expando.dev/api/graphql";
    }
    return apiBase;
}

export async function makeLocoRequestGraphql<T>(query: object): Promise<T> {

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