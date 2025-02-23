import { APIGatewayProxyEvent } from "aws-lambda";

export const createAPIGatewayProxyEvent = (
  pathParameters: { [name: string]: string } | null = null
): APIGatewayProxyEvent => {
  return {
    pathParameters,
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: "GET",
    isBase64Encoded: false,
    path: pathParameters?.productId
      ? `/products/${pathParameters.productId}`
      : "/products",
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: "123456789012",
      apiId: "api-id",
      authorizer: {},
      protocol: "HTTP/1.1",
      httpMethod: "GET",
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: "127.0.0.1",
        user: null,
        userAgent: null,
        userArn: null,
      },
      path: pathParameters?.productId
        ? `/products/${pathParameters.productId}`
        : "/products",
      stage: "prod",
      requestId: "request-id",
      requestTimeEpoch: 1234567890,
      resourceId: "resource-id",
      resourcePath: pathParameters?.productId
        ? "/products/{productId}"
        : "/products",
    },
    resource: pathParameters?.productId ? "/products/{productId}" : "/products",
  };
};
