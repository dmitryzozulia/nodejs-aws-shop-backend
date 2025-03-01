import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as path from "path";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as iam from "aws-cdk-lib/aws-iam";

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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
        },
      }
    );

    const productsTableArn = `arn:aws:dynamodb:${this.region}:${this.account}:table/products`;
    const stocksTableArn = `arn:aws:dynamodb:${this.region}:${this.account}:table/stocks`;

    // Existing IAM policies
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

