import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

interface ProductData {
  title: string;
  description: string;
  price: number;
  count?: number;
}

const validateProductData = (
  data: any
): { isValid: boolean; message: string } => {
  // Check if all required fields exist
  if (!data.title || !data.description || data.price === undefined) {
    return {
      isValid: false,
      message:
        "Missing required fields: title, description, and price are required",
    };
  }

  // Validate title
  if (typeof data.title !== "string" || data.title.trim().length === 0) {
    return {
      isValid: false,
      message: "Title must be a non-empty string",
    };
  }

  // Validate description
  if (
    typeof data.description !== "string" ||
    data.description.trim().length === 0
  ) {
    return {
      isValid: false,
      message: "Description must be a non-empty string",
    };
  }

  // Validate price
  if (typeof data.price !== "number" || data.price <= 0) {
    return {
      isValid: false,
      message: "Price must be a positive number",
    };
  }

  // Validate count if provided
  if (
    data.count !== undefined &&
    (typeof data.count !== "number" ||
      data.count < 0 ||
      !Number.isInteger(data.count))
  ) {
    return {
      isValid: false,
      message: "Count must be a non-negative integer",
    };
  }

  return {
    isValid: true,
    message: "Valid",
  };
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse the incoming request body
    let productData: ProductData;
    try {
      productData = JSON.parse(event.body || "{}");
    } catch (e) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
        },
        body: JSON.stringify({
          message: "Invalid JSON in request body",
        }),
      };
    }

    // Validate the data
    const validation = validateProductData(productData);
    if (!validation.isValid) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
        },
        body: JSON.stringify({
          message: validation.message,
        }),
      };
    }

    // Generate a new UUID for the product
    const productId = uuidv4();

    // Create new product object
    const newProduct = {
      "id (String)": productId,
      title: productData.title.trim(),
      description: productData.description.trim(),
      price: productData.price,
    };

    // Create stock object
    const newStock = {
      product_id: productId,
      count:
        productData.count !== undefined
          ? productData.count
          : Math.floor(Math.random() * 100) + 1, // Default random stock if not provided
    };

    // Save product to DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: process.env.PRODUCTS_TABLE || "products",
        Item: newProduct,
      })
    );

    // Save stock to DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: process.env.STOCKS_TABLE || "stocks",
        Item: newStock,
      })
    );

    return {
      statusCode: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        product: newProduct,
        stock: newStock,
      }),
    };
  } catch (error) {
    console.error("Error creating product and stock:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
