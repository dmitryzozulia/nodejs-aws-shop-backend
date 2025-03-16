// import-service/lambda/importFileParser.ts

import { S3Event } from "aws-lambda";
import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { Readable } from "stream";
import csv from "csv-parser";

const s3Client = new S3Client({});
const sqsClient = new SQSClient({});

export const handler = async (event: S3Event): Promise<void> => {
  console.log(
    "importFileParser lambda invoked with event:",
    JSON.stringify(event, null, 2)
  );

  try {
    for (const record of event.Records) {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

      console.log(`Processing file: ${key} from bucket: ${bucket}`);

      const { Body } = await s3Client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );

      if (!Body) {
        throw new Error("Empty file");
      }

      const stream = Body as Readable;
      const results: any[] = [];

      await new Promise((resolve, reject) => {
        stream
          .pipe(csv())
          .on("data", (data) => results.push(data))
          .on("end", async () => {
            try {
              console.log("Parsed CSV data:", results);

              // Send each product to SQS
              for (const product of results) {
                await sqsClient.send(
                  new SendMessageCommand({
                    QueueUrl: process.env.SQS_QUEUE_URL,
                    MessageBody: JSON.stringify({
                      title: product.title,
                      description: product.description,
                      price: Number(product.price),
                      count: Number(product.count),
                    }),
                  })
                );
                console.log(`Sent to SQS: ${JSON.stringify(product)}`);
              }

              // Move file to parsed folder
              const newKey = key.replace("uploaded", "parsed");
              await s3Client.send(
                new CopyObjectCommand({
                  Bucket: bucket,
                  CopySource: `${bucket}/${key}`,
                  Key: newKey,
                })
              );

              // Delete from uploaded folder
              await s3Client.send(
                new DeleteObjectCommand({
                  Bucket: bucket,
                  Key: key,
                })
              );

              resolve(undefined);
            } catch (error) {
              reject(error);
            }
          })
          .on("error", reject);
      });
    }
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

