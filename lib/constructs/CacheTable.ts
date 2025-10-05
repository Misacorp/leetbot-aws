import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ddb from "aws-cdk-lib/aws-dynamodb";
import { type Grant, type IGrantable } from "aws-cdk-lib/aws-iam";

export interface ICacheTable {
  grantReadData: (grantee: IGrantable) => Grant;
  grantWriteData: (grantee: IGrantable) => Grant;
  grantReadWriteData: (grantee: IGrantable) => Grant;
  tableArn: string;
  tableName: string;
}

/**
 * Lightweight table used for caching values.
 */
export class CacheTable extends Construct implements ICacheTable {
  private readonly table: ddb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.table = new ddb.Table(this, "LeetTable", {
      partitionKey: {
        name: "id",
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: "ttl",
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
