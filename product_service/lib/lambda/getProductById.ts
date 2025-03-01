import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log(
    "getProductById lambda invoked with event:",
    JSON.stringify(
      {
        pathParameters: event.pathParameters,
        queryStringParameters: event.queryStringParameters,
        headers: event.headers,
      },
      null,
      2
    )
  );

  try {
    const productId = event.pathParameters?.productId;
    console.log("Searching for product with ID:", productId);

    if (!productId) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ message: "Product ID is required" }),
      };
    }

    // Get product details
    const productResult = await docClient.send(
      new GetCommand({
        TableName: process.env.PRODUCTS_TABLE,
        Key: {
          "id (String)": productId,
        },
      })
    );

    console.log(
      "Product raw data:",
      JSON.stringify(productResult.Item, null, 2)
    );

    if (!productResult.Item) {
      return {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ message: "Product not found" }),
      };
    }

    const stockResult = await docClient.send(
      new GetCommand({
        TableName: process.env.STOCKS_TABLE,
        Key: {
          product_id: productId,
        },
      })
    );

    console.log("Stock raw data:", JSON.stringify(stockResult.Item, null, 2));

    const response = {
      id: productResult.Item["id (String)"],
      title: productResult.Item.title,
      description: productResult.Item.description,
      price: Number(productResult.Item.price),
      count: stockResult.Item ? Number(stockResult.Item.count) : 0,
    };

    console.log("Transformed response:", JSON.stringify(response, null, 2));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

