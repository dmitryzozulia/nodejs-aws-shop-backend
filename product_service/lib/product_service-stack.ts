// product-service/lib/product-service-stack.ts

import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as path from "path";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Fn } from "aws-cdk-lib";

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create SNS Topic
    const createProductTopic = new sns.Topic(this, "CreateProductTopic", {
      topicName: "createProductTopic",
    });

    // Add email subscription
    createProductTopic.addSubscription(
      new subscriptions.EmailSubscription("z1dima1z@gmail.com")
    );

    // Import SQS queue from Import Service
    const catalogItemsQueue = sqs.Queue.fromQueueArn(
      this,
      "ImportServiceQueue",
      Fn.importValue("CatalogItemsQueueArn")
    );

    // Lambda Functions
    const getProductsList = new lambdaNodejs.NodejsFunction(
      this,
      "GetProductsList",
      {
        entry: path.join(__dirname, "./lambda/getProductsList.ts"),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_18_X,
        timeout: cdk.Duration.seconds(30),
        environment: {
          PRODUCTS_TABLE: "products",
          STOCKS_TABLE: "stocks",
        },
      }
    );

    const getProductById = new lambdaNodejs.NodejsFunction(
      this,
      "GetProductById",
      {
        entry: path.join(__dirname, "./lambda/getProductById.ts"),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_18_X,
        timeout: cdk.Duration.seconds(30),
        environment: {
          PRODUCTS_TABLE: "products",
          STOCKS_TABLE: "stocks",
        },
      }
    );

    const createProduct = new lambdaNodejs.NodejsFunction(
      this,
      "CreateProduct",
      {
        entry: path.join(__dirname, "./lambda/createProduct.ts"),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_18_X,
        timeout: cdk.Duration.seconds(30),
        environment: {
          PRODUCTS_TABLE: "products",
          STOCKS_TABLE: "stocks",
          SNS_TOPIC_ARN: createProductTopic.topicArn,
        },
      }
    );

    const catalogBatchProcess = new lambdaNodejs.NodejsFunction(
      this,
      "CatalogBatchProcess",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "handler",
        entry: path.join(__dirname, "lambda/catalogBatchProcess.ts"),
        environment: {
          PRODUCTS_TABLE: "products",
          STOCKS_TABLE: "stocks",
          SNS_TOPIC_ARN: createProductTopic.topicArn,
        },
        bundling: {
          minify: true,
          sourceMap: true,
          externalModules: [
            "@aws-sdk/client-dynamodb",
            "@aws-sdk/lib-dynamodb",
            "@aws-sdk/client-sns",
          ],
        },
      }
    );

    // Configure SQS trigger for Lambda
    catalogBatchProcess.addEventSource(
      new SqsEventSource(catalogItemsQueue, {
        batchSize: 5,
      })
    );

    // Grant permissions
    catalogItemsQueue.grantConsumeMessages(catalogBatchProcess);
    createProductTopic.grantPublish(catalogBatchProcess);
    createProductTopic.grantPublish(createProduct);

    const productsTableArn = `arn:aws:dynamodb:${this.region}:${this.account}:table/products`;
    const stocksTableArn = `arn:aws:dynamodb:${this.region}:${this.account}:table/stocks`;

    // IAM policies
    getProductsList.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["dynamodb:Scan", "dynamodb:GetItem", "dynamodb:Query"],
        resources: [productsTableArn, stocksTableArn],
      })
    );

    getProductById.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["dynamodb:GetItem", "dynamodb:Query"],
        resources: [productsTableArn, stocksTableArn],
      })
    );

    createProduct.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["dynamodb:TransactWriteItems", "dynamodb:PutItem"],
        resources: [productsTableArn, stocksTableArn],
      })
    );

    catalogBatchProcess.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["dynamodb:PutItem"],
        resources: [productsTableArn, stocksTableArn],
      })
    );

    // Create API Gateway
    const api = new apigateway.RestApi(this, "ProductsApi", {
      restApiName: "Product Service",
      deployOptions: {
        stageName: "prod",
        tracingEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
        ],
      },
    });

    const products = api.root.addResource("products");

    // API Methods
    products.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsList),
      {
        methodResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
            },
          },
        ],
      }
    );

    products.addMethod(
      "POST",
      new apigateway.LambdaIntegration(createProduct),
      {
        methodResponses: [
          {
            statusCode: "201",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
            },
          },
          {
            statusCode: "400",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
            },
          },
          {
            statusCode: "500",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
            },
          },
        ],
      }
    );

    const product = products.addResource("{productId}");
    product.addMethod("GET", new apigateway.LambdaIntegration(getProductById), {
      methodResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
        {
          statusCode: "404",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
        {
          statusCode: "500",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
      ],
    });

    // Stack Outputs
    new cdk.CfnOutput(this, "ProductsListUrl", {
      value: `${api.url}products`,
      description: "URL for products list",
    });

    new cdk.CfnOutput(this, "ProductByIdUrl", {
      value: `${api.url}products/{productId}`,
      description:
        "URL for product by ID (replace {productId} with an actual ID)",
    });

    new cdk.CfnOutput(this, "CreateProductUrl", {
      value: `${api.url}products`,
      description: "URL for creating products (POST method)",
    });
  }
}

