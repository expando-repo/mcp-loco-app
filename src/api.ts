import fetch from "node-fetch";
import * as dotenv from 'dotenv';

dotenv.config();

const LOCO_API_BASE = "https://connector.local/api/graphql";

export function getApiKey(): string {
    const apiKey = process.env.LOCO_API_TOKEN;
    if (!apiKey) {
        console.error("LOCO_API_TOKEN environment variable is not set");
        process.exit(1);
    }
    return apiKey;
}

export async function makeLocoRequestGraphql<T>(query: object, apiToken: string): Promise<T | null> {
    const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${apiToken}`,
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
        return data as T;
    } catch (error) {
        const message = `Error making Loco GraphQL request, error: ${error instanceof Error ? error.message : String(error)}\n`;
        throw new Error(`HTTP error! status: ${message}`);
    }
} 