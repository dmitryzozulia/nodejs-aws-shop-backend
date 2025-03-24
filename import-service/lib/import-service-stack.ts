import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejsLambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { join } from "path";

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 Bucket
    const importBucket = new s3.Bucket(this, "XXXXXXXXXXXXXXXXXXX", {
      bucketName: `import-service-bucket-${cdk.Aws.ACCOUNT_ID}`,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: ["https://dzn1jbl6ljkq5.cloudfront.net"],
          allowedHeaders: ["*"],
          exposedHeaders: ["ETag"],
        },
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Create SQS Queue
    const catalogItemsQueue = new sqs.Queue(this, "CatalogItemsQueue", {
      queueName: "catalogItemsQueue",
      visibilityTimeout: cdk.Duration.seconds(30),
    });

    // Create API Gateway
    const api = new apigateway.RestApi(this, "ImportApi", {
      restApiName: "Import Service",
      defaultCorsPreflightOptions: {
        allowOrigins: ["https://dzn1jbl6ljkq5.cloudfront.net"],
        allowMethods: ["GET", "OPTIONS"],
        allowHeaders: [
          "Content-Type",
          "Authorization",
          "X-Amz-Date",
          "X-Api-Key",
          "X-Amz-Security-Token",
        ],
        allowCredentials: true,
      },
    });

    // Create importFileParser Lambda
    const importFileParser = new nodejsLambda.NodejsFunction(
      this,
      "ImportFileParser",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "handler",
        entry: join(__dirname, "../lambda/importFileParser.ts"),
        environment: {
          BUCKET_NAME: importBucket.bucketName,
          SQS_QUEUE_URL: catalogItemsQueue.queueUrl,
        },
        bundling: {
          minify: true,
          sourceMap: true,
          externalModules: ["@aws-sdk/client-s3", "@aws-sdk/client-sqs"],
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
        runtime: lambda.Runtime.NODEJS_18_X,
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
        timeout: cdk.Duration.seconds(30),
        memorySize: 256,
      }
    );

    // Grant S3 permissions
    importBucket.grantPut(importProductsFile);
    importBucket.grantPutAcl(importProductsFile);
    importBucket.grantRead(importFileParser);
    importBucket.grantWrite(importFileParser);

    // Grant SQS permissions
    catalogItemsQueue.grantSendMessages(importFileParser);

    // Add S3 event notification
    importBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParser),
      { prefix: "uploaded/", suffix: ".csv" }
    );

    // Reference the existing authorizer Lambda function
    const authorizerFn = lambda.Function.fromFunctionArn(
      this,
      "ImportServiceAuthorizerFn",
      "arn:aws:lambda:us-east-1:711387097400:function:AuthorizationServiceStack-BasicAuthorizer2B49C1FC-ArzxW83XLhvD"
    );

    // Create the permission for API Gateway to invoke the authorizer
    new lambda.CfnPermission(this, "AuthorizerInvokePermission", {
      action: "lambda:InvokeFunction",
      functionName: authorizerFn.functionName,
      principal: "apigateway.amazonaws.com",
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${api.restApiId}/*`,
    });

    // Create the authorizer
    const authorizer = new apigateway.TokenAuthorizer(
      this,
      "ImportServiceAuthorizer",
      {
        handler: authorizerFn,
        identitySource: apigateway.IdentitySource.header("Authorization"),
        resultsCacheTtl: cdk.Duration.seconds(0), // Disable caching for testing
      }
    );

    // Add import endpoint with authorization
    const importResource = api.root.addResource("import");

    // Add GET method with Lambda integration
    importResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(importProductsFile, {
        proxy: true,
        integrationResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin":
                "'https://dzn1jbl6ljkq5.cloudfront.net'",
              "method.response.header.Access-Control-Allow-Headers":
                "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'",
              "method.response.header.Access-Control-Allow-Methods":
                "'GET,OPTIONS'",
              "method.response.header.Access-Control-Allow-Credentials":
                "'true'",
            },
          },
        ],
      }),
      {
        authorizer: authorizer,
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        requestParameters: {
          "method.request.querystring.name": true,
        },
        methodResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
              "method.response.header.Access-Control-Allow-Headers": true,
              "method.response.header.Access-Control-Allow-Methods": true,
              "method.response.header.Access-Control-Allow-Credentials": true,
            },
          },
        ],
      }
    );

    // Stack Outputs
    new cdk.CfnOutput(this, "BucketName", {
      value: importBucket.bucketName,
    });

    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: api.url,
    });

    new cdk.CfnOutput(this, "CatalogItemsQueueUrl", {
      value: catalogItemsQueue.queueUrl,
      exportName: "CatalogItemsQueueUrl",
    });

    new cdk.CfnOutput(this, "CatalogItemsQueueArn", {
      value: catalogItemsQueue.queueArn,
      exportName: "CatalogItemsQueueArn",
    });
  }
}

