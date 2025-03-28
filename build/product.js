import * as gql from 'gql-query-builder';
import { makeLocoRequestGraphql } from './api.js';
function graphqlQueryPageInfo() {
    return ['hasNextPage', 'endCursor', 'count', 'total'];
}
function graphqlQueryAction() {
    return [
        'status', { 'errors': ['code', 'message'] }
    ];
}
export async function getProducts(first, after = null, identifier = null) {
    let variables = {
        first: { value: first, required: true },
    };
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
                            { 'translation': ['language', 'title'] }
                        ]
                    }],
                pageInfo: graphqlQueryPageInfo()
            }]
    });
    let data;
    try {
        let response = await makeLocoRequestGraphql(query);
        data = response.data.products;
        if (!data) {
            return {
                success: false,
                message: "Failed to retrieve data from loco",
                data: null
            };
        }
    }
    catch (error) {
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
export async function actionDeleteProductTranslation(productIdentifier, language) {
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
        let response = await makeLocoRequestGraphql(query);
        data = response.data.productTranslationDelete;
        if (!data.status) {
            return {
                success: false,
                message: "Failed to retrieve data from loco",
                data: null
            };
        }
    }
    catch (error) {
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
