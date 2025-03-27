import * as gql from 'gql-query-builder'
import { makeLocoRequestGraphql } from './api.js';

export async function getProducts(first: number, after: string|null, apiToken: string) {
    let variables: any = {
        first: { value: first, required: true },
    }

    if (after !== null) {
        variables.after = after;
    }

    const query = gql.query({
        operation: 'products',
        variables: variables,
        fields: [{
            edges: [{
                node: [
                    'productId', 'code', 'identifier', 'status',
                    {'translation': ['language', 'title']}
                ]
            }],
            pageInfo: ['hasNextPage', 'endCursor', 'count', 'total']
        }]
    });

    let data;
    try {
        let response = await makeLocoRequestGraphql<any>(query, apiToken);
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