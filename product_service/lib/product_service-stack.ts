import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as path from "path";

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create Lambda functions
    const getProductsList = new lambda.Function(this, "GetProductsList", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "getProductsList.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "lambda")),
      timeout: cdk.Duration.seconds(30), // Add timeout
    });

    const getProductById = new lambda.Function(this, "GetProductById", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "getProductsById.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "lambda")),
      timeout: cdk.Duration.seconds(30), // Add timeout
    });

    // Create API Gateway
    const api = new apigateway.RestApi(this, "ProductsApi", {
      restApiName: "Product Service",
      deployOptions: {
        stageName: "prod",
        tracingEnabled: true, // Enable X-Ray tracing
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

    // Create /products endpoint
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

    // Create /products/{productId} endpoint
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

    // Output the API URLs
    new cdk.CfnOutput(this, "ProductsListUrl", {
      value: `${api.url}products`,
      description: "URL for products list",
    });

    new cdk.CfnOutput(this, "ProductByIdUrl", {
      value: `${api.url}products/{productId}`,
      description:
        "URL for product by ID (replace {productId} with an actual ID)",
    });
  }
}

