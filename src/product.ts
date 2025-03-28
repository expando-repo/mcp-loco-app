import * as gql from 'gql-query-builder'
import { makeLocoRequestGraphql } from './api.js';

interface ActionData {
    status: string;
    errors: {
        code: string;
        message: string;
    }[];
}

interface PageInfoData {
    hasNextPage: boolean;
    endCursor: string|null;
    count: number;
    total: number;
}

interface ProductTranslationDeleteData {
    data: {
        productTranslationDelete: ActionData;
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

function graphqlQueryPageInfo(): string[]
{
    return ['hasNextPage', 'endCursor', 'count', 'total'];
}

function graphqlQueryAction()
{
    return [
        'status', {'errors': ['code', 'message']}
    ];
}


export async function getProducts(
    first: number,
    after: string|null = null,
    identifier: number|string|null = null
) {
    let variables: any = {
        first: { value: first, required: true },
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
                    {'translation': ['language', 'title']}
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

export async function actionDeleteProductTranslation(
    productIdentifier: number|string|null,
    language: string|null,
) {
    
    const query = gql.mutation({
        operation: 'productTranslationDelete',
        variables: {
            language: { value: language, type: 'LanguageEnum' },
            productIdentifier: { value: productIdentifier },
        },
        fields: graphqlQueryAction()
    });

    let data;
    try {
        let response = await makeLocoRequestGraphql<ProductTranslationDeleteData>(query);
        data = response.data.productTranslationDelete;

        if (!data.status) {
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

    return {
        success: true,
        message: `Delete translation status: ${data.status}`,
        data: data
    };
}