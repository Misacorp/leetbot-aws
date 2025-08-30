import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ddb from "aws-cdk-lib/aws-dynamodb";
import { type Grant, type IGrantable } from "aws-cdk-lib/aws-iam";
import { getRemovalPolicy } from "@/src/util/infra";

export interface ITable {
  grantReadData: (grantee: IGrantable) => Grant;
  grantWriteData: (grantee: IGrantable) => Grant;
  grantReadWriteData: (grantee: IGrantable) => Grant;
  tableArn: string;
  tableName: string;
}

export class Table extends Construct implements ITable {
  private readonly table: ddb.Table;

  constructor(scope: Construct, id: string) {
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
      removalPolicy: getRemovalPolicy(),
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
}
