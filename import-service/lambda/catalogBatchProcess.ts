import { SQSHandler } from "aws-lambda";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

// Initialize DynamoDB client
const ddbClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(ddbClient);
const sns = new SNSClient();

export const handler: SQSHandler = async (event) => {
  try {
    for (const record of event.Records) {
      const product = JSON.parse(record.body);

      // Save to DynamoDB using PutCommand
      await dynamodb.send(
        new PutCommand({
          TableName: process.env.PRODUCTS_TABLE!,
          Item: product,
        })
      );

      // Publish to SNS
      await sns.send(
        new PublishCommand({
          TopicArn: process.env.SNS_TOPIC_ARN,
          Message: JSON.stringify({
            message: "Product created successfully",
            product,
          }),
        })
      );
    }
  } catch (error) {
    console.error("Error processing batch:", error);
    throw error;
  }
};
