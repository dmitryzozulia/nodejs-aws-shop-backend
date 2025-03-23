import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejsLambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { join } from "path";

export class AuthorizationServiceStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Создаём Lambda авторизатора
    const authorizerLambda = new nodejsLambda.NodejsFunction(
      this,
      "BasicAuthorizer",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "handler",
        entry: join(__dirname, "../lambda/basicAuthorizer.ts"),
        environment: {
          dmitryzozulia: "TEST_PASSWORD",
        },
        bundling: {
          minify: true,
        },
        timeout: cdk.Duration.seconds(5),
        memorySize: 128,
      }
    );

    const api = new apigateway.RestApi(this, "AuthorizationApi", {
      restApiName: "Authorization Service",
      defaultCorsPreflightOptions: {
        allowOrigins: ["https://dzn1jbl6ljkq5.cloudfront.net/"],
        allowMethods: ["GET", "POST", "OPTIONS"],
        allowHeaders: ["Authorization", "Content-Type"],
        allowCredentials: true,
      },
    });

    // Создаём Token Authorizer
    const authorizer = new apigateway.TokenAuthorizer(this, "ApiAuthorizer", {
      handler: authorizerLambda,
      identitySource: "method.request.header.Authorization",
    });

    // Добавляем ресурс и метод
    const testResource = api.root.addResource("test");
    testResource.addMethod("GET", new apigateway.MockIntegration(), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // Выводим ARN авторизатора
    new cdk.CfnOutput(this, "ApiAuthorizerArn", {
      value: authorizerLambda.functionArn,
      exportName: "ApiAuthorizerArn",
    });
  }
}

