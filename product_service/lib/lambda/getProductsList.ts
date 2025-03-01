import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

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
    "getProductsList lambda invoked with event:",
    JSON.stringify(
      {
        queryStringParameters: event.queryStringParameters,
        headers: event.headers,
      },
      null,
      2
    )
  );

  try {
    const productsResult = await docClient.send(
      new ScanCommand({
        TableName: process.env.PRODUCTS_TABLE,
      })
    );

    console.log(
      "Products raw data:",
      JSON.stringify(productsResult.Items, null, 2)
    );

    const stocksResult = await docClient.send(
      new ScanCommand({
        TableName: process.env.STOCKS_TABLE,
      })
    );

    console.log(
      "Stocks raw data:",
      JSON.stringify(stocksResult.Items, null, 2)
    );

    const products =
      productsResult.Items?.map((product) => {
        const stock = stocksResult.Items?.find(
          (stock) => stock.product_id === product["id (String)"]
        );

        const transformedProduct = {
          id: product["id (String)"],
          title: product.title,
          description: product.description,
          price: Number(product.price),
          count: stock ? Number(stock.count) : 0,
        };

        console.log(
          "Transformed product:",
          JSON.stringify(transformedProduct, null, 2)
        );
        return transformedProduct;
      }) || [];

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(products),
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

