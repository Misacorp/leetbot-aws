import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ddb from "aws-cdk-lib/aws-dynamodb";
import * as backup from "aws-cdk-lib/aws-backup";
import * as events from "aws-cdk-lib/aws-events";
import { type Grant, type IGrantable } from "aws-cdk-lib/aws-iam";
import { getRemovalPolicy } from "@/src/util/infra";

export interface ITable {
  grantReadData: (grantee: IGrantable) => Grant;
  grantWriteData: (grantee: IGrantable) => Grant;
  grantReadWriteData: (grantee: IGrantable) => Grant;
  tableArn: string;
  tableName: string;
}

interface Props {
  readonly environment: string;
}

export class Table extends Construct implements ITable {
  private readonly table: ddb.Table;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    this.table = new ddb.Table(this, "LeetTable", {
      partitionKey: {
        name: "pk1",
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: "sk1",
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: getRemovalPolicy(props.environment),
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "gsi2",
      partitionKey: {
        name: "pk2",
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: "sk2",
        type: ddb.AttributeType.STRING,
      },
    });

    this.setupDailyBackup(props.environment);

    new cdk.CfnOutput(this, "TableName", {
      value: this.table.tableName,
      description: "DynamoDB table name",
    });
  }

  public grantReadData(grantee: IGrantable): Grant {
    return this.table.grantReadData(grantee);
  }

  public grantWriteData(grantee: IGrantable): Grant {
    return this.table.grantWriteData(grantee);
  }

  public grantReadWriteData(grantee: IGrantable): Grant {
    return this.table.grantReadWriteData(grantee);
  }

  public get tableArn(): string {
    return this.table.tableArn;
  }

  public get tableName(): string {
    return this.table.tableName;
  }

  private setupDailyBackup(environment: string): void {
    // Where to back up
    const backupVault = new backup.BackupVault(this, "TableBackupVault", {});

    // How to back up
    const backupPlan = new backup.BackupPlan(this, "TableBackupPlan", {
      backupPlanRules: [
        new backup.BackupPlanRule({
          scheduleExpression: events.Schedule.cron({
            minute: "37",
            hour: "03",
            day: "*",
            month: "*",
            year: "*",
          }),
          scheduleExpressionTimezone: cdk.TimeZone.EUROPE_HELSINKI,
          deleteAfter: cdk.Duration.days(7),
          startWindow: cdk.Duration.hours(2),
          completionWindow: cdk.Duration.hours(10),
          backupVault,
        }),
      ],
    });

    // What to back up
    backupPlan.addSelection("TableSelection", {
      resources: [backup.BackupResource.fromDynamoDbTable(this.table)],
    });

    // Apply removal policy to the backup plan
    backupPlan.applyRemovalPolicy(getRemovalPolicy(environment));
  }
}
