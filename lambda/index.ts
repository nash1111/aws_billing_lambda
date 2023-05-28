import * as AWS from "aws-sdk";
import { IncomingWebhook } from "@slack/webhook";

exports.handler = async function () {
  const ssm = new AWS.SSM();
  const slackWebhookUrlParam = await ssm
    .getParameter({
      Name: "/billing_lambda_app/slackWebhookUrl",
      WithDecryption: true,
    })
    .promise();
  const slackWebhookUrl = slackWebhookUrlParam.Parameter?.Value || "";

  const webhook = new IncomingWebhook(slackWebhookUrl);

  const costExplorer = new AWS.CostExplorer({ region: "us-east-1" });
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const params: AWS.CostExplorer.Types.GetCostAndUsageRequest = {
    TimePeriod: {
      Start: firstDayOfMonth.toISOString().substring(0, 10),
      End: today.toISOString().substring(0, 10),
    },
    Granularity: "MONTHLY",
    Metrics: ["UnblendedCost"],
  };

  const data = await costExplorer.getCostAndUsage(params).promise();

  if (data && data.ResultsByTime && data.ResultsByTime[0]) {
    const amount = data.ResultsByTime[0].Total?.UnblendedCost.Amount;
    console.log(`Total cost for the month so far: $${amount}`);

    const message = `Total cost for the month so far: $${amount}`;
    await webhook.send({
      text: message,
    });
  } else {
    console.log("No cost data available");
  }
};
