import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

interface Product {
  id: string;
  name: string;
  price: number;
}

// Mock database
const products: Product[] = [
  { id: "1", name: "Product 1", price: 10 },
  { id: "2", name: "Product 2", price: 20 },
  { id: "3", name: "Product 3", price: 30 },
];

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Event:", event); // For debugging

  try {
    // Get productId from path parameters
    const productId = event.pathParameters?.productId;

    if (!productId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ message: "Product ID is required" }),
      };
    }

    // Find product by id
    const product = products.find((p) => p.id === productId);

    if (!product) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ message: "Product not found" }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Access-Control-Allow-Methods": "GET",
      },
      body: JSON.stringify(product),
    };
  } catch (error) {
    console.error("Error:", error); // For debugging
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
