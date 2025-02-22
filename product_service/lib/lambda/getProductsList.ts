import { APIGatewayProxyResult } from "aws-lambda";

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
}

const products: Product[] = [
  { id: "1", name: "Product 1", price: 10, description: "Description 1" },
  { id: "2", name: "Product 2", price: 20, description: "Description 2" },
  { id: "3", name: "Product 3", price: 30, description: "Description 3" },
];

export const handler = async (): Promise<APIGatewayProxyResult> => {
  try {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Access-Control-Allow-Methods": "GET",
      },
      body: JSON.stringify(products),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
