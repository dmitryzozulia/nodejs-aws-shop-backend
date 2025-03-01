import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
  TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

interface ProductData {
  title: string;
  description: string;
  price: number;
  count: number;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log(
    "createProduct lambda invoked with event:",
    JSON.stringify(
      {
        body: event.body,
        pathParameters: event.pathParameters,
        queryStringParameters: event.queryStringParameters,
        headers: event.headers,
      },
      null,
      2
    )
  );

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ message: "Missing request body" }),
      };
    }

    const productData: ProductData = JSON.parse(event.body);

    if (
      !productData.title ||
      !productData.description ||
      productData.price === undefined ||
      productData.count === undefined
    ) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message:
            "Missing required fields: title, description, price, and count are required",
        }),
      };
    }

    if (productData.price <= 0) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: "Price must be greater than 0",
        }),
      };
    }

    if (productData.count < 0 || !Number.isInteger(productData.count)) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: "Count must be a non-negative integer",
        }),
      };
    }

    const productId = uuidv4();

    const newProduct = {
      "id (String)": productId,
      title: productData.title.trim(),
      description: productData.description.trim(),
      price: productData.price,
    };

    const newStock = {
      product_id: productId,
      count: productData.count,
    };

    const transactParams: TransactWriteCommandInput = {
      TransactItems: [
        {
          Put: {
            TableName: process.env.PRODUCTS_TABLE,
            Item: newProduct,
            ConditionExpression: "attribute_not_exists(#id)",
            ExpressionAttributeNames: {
              "#id": "id (String)",
            },
          },
        },
        {
          Put: {
            TableName: process.env.STOCKS_TABLE,
            Item: newStock,
            ConditionExpression: "attribute_not_exists(product_id)",
          },
        },
      ],
    };

    console.log(
      "Executing transaction with params:",
      JSON.stringify(transactParams, null, 2)
    );

    // Execute transaction
    await docClient.send(new TransactWriteCommand(transactParams));

    console.log("Transaction completed successfully");

    return {
      statusCode: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        product: newProduct,
        stock: newStock,
      }),
    };
  } catch (error) {
    console.error("Error in transaction:", error);

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Error creating product and stock",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
