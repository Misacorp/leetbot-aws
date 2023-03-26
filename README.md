# Leetbot AWS

## Deployment Troubleshooting

### No bucket named `xyz`. Is account `123` bootstrapped?

Fix this by doing the following:

1. Log in to the AWS Management Console and navigate to Cloudformation.
2. Delete the `CDKToolkit` stack.
3. Run `npx cdk bootstrap`. 
 
Deployment should work now.

## Resources

[EventBridge Scheduler to start and stop EC2 instances](https://serverlessland.com/patterns/eventbridge-schedule-to-ec2-cdk)

> Simple pattern that starts and stops given EC2 instances based on time of day, timezone and days of week