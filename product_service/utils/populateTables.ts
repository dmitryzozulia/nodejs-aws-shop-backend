import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const products = [
  {
    "id (String)": uuidv4(),
    description: "Short Product Description1",
    price: 24,
    title: "ProductOne",
  },
  {
    "id (String)": uuidv4(),
    description: "Short Product Description7",
    price: 15,
    title: "ProductTitle",
  },
  {
    "id (String)": uuidv4(),
    description: "Short Product Description2",
    price: 23,
    title: "Product",
  },
  {
    "id (String)": uuidv4(),
    description: "Short Product Description4",
    price: 15,
    title: "ProductTest",
  },
  {
    "id (String)": uuidv4(),
    description: "Short Product Descriptio1",
    price: 23,
    title: "Product2",
  },
  {
    "id (String)": uuidv4(),
    description: "Short Product Description7",
    price: 15,
    title: "ProductName",
  },
];

async function populateTables() {
  try {
    const productIds: string[] = [];

    for (const product of products) {
      const productId = product["id (String)"];
      productIds.push(productId);

      await docClient.send(
        new PutCommand({
          TableName: process.env.PRODUCTS_TABLE || "products",
          Item: product,
        })
      );

      console.log(`Added product: ${product.title}`);
    }

    for (const productId of productIds) {
      await docClient.send(
        new PutCommand({
          TableName: process.env.STOCKS_TABLE || "stocks",
          Item: {
            product_id: productId,
            count: Math.floor(Math.random() * 100) + 1,
          },
        })
      );

      console.log(`Added stock for product ID: ${productId}`);
    }

    console.log("Successfully populated both tables!");
  } catch (error) {
    console.error("Error populating tables:", error);
  }
}

populateTables();
