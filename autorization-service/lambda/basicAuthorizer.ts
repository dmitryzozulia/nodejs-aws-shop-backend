import {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
} from "aws-lambda";

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  console.log("Event:", JSON.stringify(event));

  if (
    !event.authorizationToken ||
    !event.authorizationToken.startsWith("Basic ")
  ) {
    throw new Error("Unauthorized");
  }

  const encodedCreds = event.authorizationToken.split(" ")[1];
  const decodedCreds = Buffer.from(encodedCreds, "base64").toString("utf-8");
  const [username, password] = decodedCreds.split(":");

  const validUsername = process.env.AUTH_USERNAME || "dmitryzozulia";
  const validPassword = process.env.AUTH_PASSWORD || "TEST_PASSWORD";

  if (username === validUsername && password === validPassword) {
    return generatePolicy(username, "Allow", event.methodArn);
  } else {
    return generatePolicy(username, "Deny", event.methodArn);
  }
};

const generatePolicy = (
  principalId: string,
  effect: "Allow" | "Deny",
  resource: string
): APIGatewayAuthorizerResult => ({
  principalId,
  policyDocument: {
    Version: "2012-10-17",
    Statement: [
      {
        Action: "execute-api:Invoke",
        Effect: effect,
        Resource: resource,
      },
    ],
  },
});
