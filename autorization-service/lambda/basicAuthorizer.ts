import {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
} from "aws-lambda";

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  console.log("Event: ", JSON.stringify(event));

  const { authorizationToken, methodArn } = event;

  // Get credentials from environment variables
  const validUsername = process.env.AUTH_USERNAME;
  const validPassword = process.env.AUTH_PASSWORD;

  if (!authorizationToken || !validUsername || !validPassword) {
    throw new Error("Unauthorized"); // Return 401
  }

  try {
    // Remove "Basic " from token
    const token = authorizationToken.replace("Basic ", "");
    // Decode base64
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    // Split into username and password
    const [username, password] = decoded.split(":");

    console.log(`Username: ${username}`);

    const effect =
      username !== validUsername || password !== validPassword
        ? "Deny"
        : "Allow";

    if (effect === "Deny") {
      throw new Error("Forbidden"); // Return 403
    }

    return {
      principalId: username,
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: effect,
            Resource: methodArn,
          },
        ],
      },
    };
  } catch (error) {
    console.error("Error: ", error);
    throw new Error(
      error instanceof Error && error.message === "Unauthorized"
        ? "Unauthorized"
        : "Forbidden"
    );
  }
};
