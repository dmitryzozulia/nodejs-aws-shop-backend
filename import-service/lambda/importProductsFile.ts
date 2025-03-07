import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME;
const UPLOADED_FOLDER = process.env.UPLOADED_FOLDER || "uploaded";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,PUT,POST,OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Event:", JSON.stringify(event));

  try {
    const fileName = event.queryStringParameters?.name;

    if (!fileName) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: "File name is required" }),
      };
    }

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `${UPLOADED_FOLDER}/${fileName}`,
      ContentType: "text/csv",
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    console.log("Generated signed URL:", signedUrl);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(signedUrl),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
