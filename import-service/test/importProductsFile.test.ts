import { APIGatewayProxyEvent } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Create mock S3 client
const mockSend = jest.fn();
const mockS3Client = {
  send: mockSend,
};

// Mock the modules
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(() => mockS3Client),
  PutObjectCommand: jest.fn(),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn(),
}));

// Import after mocks
import { handler } from "../lambda/importProductsFile";

describe("importProductsFile Lambda", () => {
  const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": true,
  };

  const BUCKET_NAME = "XXXXXXXXXXX";
  const UPLOADED_FOLDER = "uploaded";

  beforeEach(() => {
    jest.clearAllMocks();
    // Set environment variables before each test
    process.env.BUCKET_NAME = BUCKET_NAME;
    process.env.UPLOADED_FOLDER = UPLOADED_FOLDER;
    // Suppress console logs during tests
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up environment variables after each test
    delete process.env.BUCKET_NAME;
    delete process.env.UPLOADED_FOLDER;
    // Restore console logs
    jest.restoreAllMocks();
  });

  it("should return 400 when name parameter is missing", async () => {
    const eventWithoutName: APIGatewayProxyEvent = {
      queryStringParameters: {},
    } as any;

    const result = await handler(eventWithoutName);

    expect(result).toEqual({
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Name parameter is required" }),
    });

    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  it("should handle S3 errors", async () => {
    const mockEvent: APIGatewayProxyEvent = {
      queryStringParameters: {
        name: "test.csv",
      },
    } as any;

    const mockError = new Error("S3 error");
    (getSignedUrl as jest.Mock).mockRejectedValue(mockError);

    const result = await handler(mockEvent);

    expect(result).toEqual({
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Error generating signed URL" }),
    });
  });
});
