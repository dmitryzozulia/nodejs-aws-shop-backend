import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejsLambda from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

export class AutorizationServiceStack extends cdk.Stack {
  public readonly basicAuthorizer: lambda.IFunction;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    if (!process.env.AUTH_USERNAME || !process.env.AUTH_PASSWORD) {
      throw new Error(
        "Environment variables AUTH_USERNAME and AUTH_PASSWORD must be set"
      );
    }

    this.basicAuthorizer = new nodejsLambda.NodejsFunction(
      this,
      "BasicAuthorizer",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "handler",
        entry: join(__dirname, "../lambda/basicAuthorizer.ts"),
        environment: {
          AUTH_USERNAME: process.env.AUTH_USERNAME,
          AUTH_PASSWORD: process.env.AUTH_PASSWORD,
        },
      }
    );

    // Export the authorizer function ARN
    new cdk.CfnOutput(this, "BasicAuthorizerArn", {
      value: this.basicAuthorizer.functionArn,
      exportName: "BasicAuthorizerArn",
    });
  }
}

