import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda"; // For Runtime
import * as nodejsLambda from "aws-cdk-lib/aws-lambda-nodejs"; // For NodejsFunction
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import { join } from "path";

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 Bucket
    const importBucket = new s3.Bucket(
      this,
      `import-service-bucket-${cdk.Aws.ACCOUNT_ID}`,
      {
        cors: [
          {
            allowedMethods: [
              s3.HttpMethods.GET,
              s3.HttpMethods.PUT,
              s3.HttpMethods.POST,
              s3.HttpMethods.HEAD,
            ],
            allowedOrigins: ["*"],
            allowedHeaders: ["*"],
            exposedHeaders: ["ETag"],
          },
        ],
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      }
    );

    // Create importFileParser Lambda using NodejsFunction
    const importFileParser = new nodejsLambda.NodejsFunction(
      this,
      "ImportFileParser",
      {
        runtime: lambda.Runtime.NODEJS_18_X, // Using Runtime from lambda
        handler: "handler",
        entry: join(__dirname, "../lambda/importFileParser.ts"),
        environment: {
          BUCKET_NAME: importBucket.bucketName,
        },
        bundling: {
          minify: true,
          sourceMap: true,
          externalModules: ["@aws-sdk/client-s3"],
        },
        timeout: cdk.Duration.seconds(30),
        memorySize: 256,
      }
    );

    // Create importProductsFile Lambda
    const importProductsFile = new nodejsLambda.NodejsFunction(
      this,
      "ImportProductsFile",
      {
        runtime: lambda.Runtime.NODEJS_18_X, // Using Runtime from lambda
        handler: "handler",
        entry: join(__dirname, "../lambda/importProductsFile.ts"),
        environment: {
          BUCKET_NAME: importBucket.bucketName,
          UPLOADED_FOLDER: "uploaded",
        },
        bundling: {
          minify: true,
          sourceMap: true,
          externalModules: [
            "@aws-sdk/client-s3",
            "@aws-sdk/s3-request-presigner",
          ],
        },
      }
    );

    // Grant permissions
    importBucket.grantPut(importProductsFile);
    importBucket.grantPutAcl(importProductsFile);
    importBucket.grantRead(importFileParser);
    importBucket.grantWrite(importFileParser);

    // Add S3 event notification
    importBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParser),
      { prefix: "uploaded/" }
    );

    // Create API Gateway
    const api = new apigateway.RestApi(this, "ImportApi", {
      defaultCorsPreflightOptions: {
        allowOrigins: ["*"],
        allowMethods: ["GET", "PUT", "POST", "OPTIONS"],
        allowHeaders: ["*"],
      },
    });

    // Add import endpoint
    const importResource = api.root.addResource("import");
    importResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(importProductsFile),
      {
        requestParameters: {
          "method.request.querystring.name": true,
        },
      }
    );

    // Outputs
    new cdk.CfnOutput(this, "BucketName", {
      value: importBucket.bucketName,
    });

    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: api.url,
    });
  }
}

