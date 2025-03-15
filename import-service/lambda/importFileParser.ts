import { S3Event } from "aws-lambda";
import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import csv from "csv-parser";
import { Readable } from "stream";

const s3Client = new S3Client({});
const PARSED_FOLDER = "parsed";

export const handler = async (event: S3Event) => {
  console.log(
    "importFileParser lambda invoked with event:",
    JSON.stringify(event, null, 2)
  );

  try {
    for (const record of event.Records) {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

      console.log(`Processing file: ${key} from bucket: ${bucket}`);

      // Get the file from S3
      const { Body } = await s3Client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );

      if (Body instanceof Readable) {
        // Process the CSV file
        await new Promise((resolve, reject) => {
          Body.pipe(csv())
            .on("data", (data: any) => {
              console.log("Parsed CSV row:", JSON.stringify(data));
            })
            .on("error", (error: Error) => {
              console.error("Error parsing CSV:", error);
              reject(error);
            })
            .on("end", () => {
              console.log("Finished processing CSV file");
              resolve(null);
            });
        });

        // Move file to parsed folder
        const fileName = key.split("/").pop(); // Get filename from path
        const newKey = `${PARSED_FOLDER}/${fileName}`;

        console.log(`Moving file from ${key} to ${newKey}`);

        // 1. Copy to new location
        await s3Client.send(
          new CopyObjectCommand({
            Bucket: bucket,
            CopySource: `${bucket}/${key}`,
            Key: newKey,
          })
        );

        console.log("File copied to parsed folder");

        // 2. Delete from uploaded folder
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
          })
        );

        console.log("File deleted from uploaded folder");
      }
    }

    return {
      statusCode: 200,
      body: "Successfully processed and moved files",
    };
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};
