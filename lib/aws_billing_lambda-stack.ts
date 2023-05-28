import * as cdk from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

import * as iam from "aws-cdk-lib/aws-iam";

export class AwsBillingLambdaStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const billingLambda = new NodejsFunction(this, "BillingLambda", {
      entry: "./lambda/index.ts",
      handler: "handler",
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
    });

    const ssmPolicy = new iam.PolicyStatement({
      actions: ["ssm:GetParameter"],
      resources: ["arn:aws:ssm:*:*:parameter/billing_lambda_app/*"],
    });
    billingLambda.addToRolePolicy(ssmPolicy);

    const kmsPolicy = new iam.PolicyStatement({
      actions: ["kms:Decrypt"],
      resources: ["*"],
    });
    billingLambda.addToRolePolicy(kmsPolicy);

    const cePolicy = new iam.PolicyStatement({
      actions: ["ce:GetCostAndUsage"],
      resources: ["*"],
    });
    billingLambda.addToRolePolicy(cePolicy);

    const rule = new events.Rule(this, "BillingLambdaRule", {
      schedule: events.Schedule.cron({ minute: "0", hour: "4" }),
    });

    rule.addTarget(new targets.LambdaFunction(billingLambda));
  }
}
