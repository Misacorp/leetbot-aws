import * as cdk from "aws-cdk-lib";
import { aws_iam as iam } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { getDefaultLambdaConfig } from "@/src/util/infra";

export interface ISecureStringParameter {
  readonly parameterArn: string;
  readonly parameterName: string;
  grantRead: (grantee: iam.IGrantable) => iam.Grant;
  grantWrite: (grantee: iam.IGrantable) => iam.Grant;
}

export interface SecureStringParameterProps {
  readonly parameterName: string;
  readonly description?: string;
  // Placeholder value written during deployment
  readonly placeholderValue: string;
  readonly removalPolicy: cdk.RemovalPolicy;
}

/**
 * Creates and manages an SSM SecureString parameter through a Lambda-backed
 * custom resource.
 *
 * CloudFormation cannot create `SecureString` parameters natively, so this
 * construct uses `ssm:PutParameter` and `ssm:DeleteParameter` under the hood.
 * It is meant to manage the parameter shell and a placeholder value only.
 *
 * If cost is not the primary constraint, Secrets Manager remains the stronger
 * default for secret storage.
 */
export class SecureStringParameter
  extends Construct
  implements ISecureStringParameter
{
  public readonly parameterArn: string;
  public readonly parameterName: string;

  constructor(scope: Construct, id: string, props: SecureStringParameterProps) {
    super(scope, id);

    const defaultLambdaConfig = getDefaultLambdaConfig();

    this.parameterName = props.parameterName;
    this.parameterArn = cdk.Stack.of(this).formatArn({
      service: "ssm",
      resource: "parameter",
      resourceName: sanitizeParameterName(props.parameterName),
    });

    const handler = new NodejsFunction(this, "Handler", {
      ...defaultLambdaConfig,
      entry:
        "lib/constructs/generic/SecureStringParameter/secureStringParameterHandler.ts",
      handler: "handler",
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      bundling: {
        ...defaultLambdaConfig.bundling,
        externalModules: ["@aws-sdk/*"],
      },
    });

    handler.addPermission("AllowCloudFormationInvoke", {
      principal: new iam.ServicePrincipal("cloudformation.amazonaws.com"),
    });

    handler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ssm:PutParameter", "ssm:DeleteParameter"],
        resources: [this.parameterArn],
      }),
    );

    /**
     * CloudFormation invokes custom resources during stack lifecycle operations.
     * This Lambda runs on Create, Update, and Delete for this resource and must
     * report the result back to CloudFormation before the stack operation can
     * continue. If it fails to reply, the stack can become stuck until the
     * custom resource times out.
     */
    new cdk.CustomResource(this, "Resource", {
      serviceToken: handler.functionArn,
      resourceType: "Custom::SecureStringParameter",
      serviceTimeout: cdk.Duration.seconds(60),
      properties: {
        parameterName: props.parameterName,
        description: props.description,
        placeholderValue: props.placeholderValue,
        removalPolicy: props.removalPolicy,
      },
    });
  }

  public grantRead(grantee: iam.IGrantable): iam.Grant {
    return iam.Grant.addToPrincipal({
      grantee,
      actions: ["ssm:GetParameter", "ssm:GetParameters"],
      resourceArns: [this.parameterArn],
    });
  }

  public grantWrite(grantee: iam.IGrantable): iam.Grant {
    return iam.Grant.addToPrincipal({
      grantee,
      actions: ["ssm:PutParameter"],
      resourceArns: [this.parameterArn],
    });
  }
}

function sanitizeParameterName(parameterName: string): string {
  return parameterName.startsWith("/") ? parameterName.slice(1) : parameterName;
}
