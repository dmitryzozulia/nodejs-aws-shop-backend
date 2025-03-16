import { SQSHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
  TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { v4 as uuidv4 } from "uuid";

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const sns = new SNSClient({});

export const handler: SQSHandler = async (event) => {
  console.log(
    "catalogBatchProcess lambda invoked with event:",
    JSON.stringify(event, null, 2)
  );

  try {
    for (const record of event.Records) {
      try {
        const productData = JSON.parse(record.body);
        console.log("Processing product:", productData);

        // Validate product data
        if (
          !productData.title ||
          !productData.description ||
          productData.price === undefined
        ) {
          throw new Error(
            `Invalid product data: ${JSON.stringify(productData)}`
          );
        }

        const productId = uuidv4();

        const transactParams: TransactWriteCommandInput = {
          TransactItems: [
            {
              Put: {
                TableName: process.env.PRODUCTS_TABLE!,
                Item: {
                  "id (String)": productId,
                  title: productData.title,
                  description: productData.description,
                  price: Number(productData.price),
                },
              },
            },
            {
              Put: {
                TableName: process.env.STOCKS_TABLE!,
                Item: {
                  product_id: productId,
                  count: Number(productData.count) || 0,
                },
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

        // Send SNS notification
        await sns.send(
          new PublishCommand({
            TopicArn: process.env.SNS_TOPIC_ARN,
            Subject: "New Product Created",
            Message: JSON.stringify({
              message: "Product created successfully via import",
              product: {
                id: productId,
                ...productData,
              },
            }),
          })
        );

        console.log(`Successfully processed product: ${productData.title}`);
      } catch (error) {
        console.error("Error processing record:", error);
        // Don't throw here to continue processing other records
      }
    }
  } catch (error) {
    console.error("Error in batch processing:", error);
    throw error;
  }
};
