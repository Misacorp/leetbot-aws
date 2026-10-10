import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigwV2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigwV2Integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import type * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import type { ILambdaLayers } from "@/lib/constructs/Discord/LambdaLayers";
import type { ITable } from "@/lib/constructs/Table";
import {
  type ISecureStringParameter,
  SecureStringParameter,
} from "@/lib/constructs/generic/SecureStringParameter/SecureStringParameter";
import { PLACEHOLDER_PARAM_VALUE } from "@/src/util/constants";
import {
  createLogGroup,
  getDefaultLambdaConfig,
  getLogLevel,
  getMinify,
  getRemovalPolicy,
} from "@/src/util/infra";

interface Props {
  readonly layers: ILambdaLayers;
  readonly table: ITable;
  readonly environment: string;
}

/**
 * Read-only HTTP API that exposes leet days to the Leet Creatures game.
 *
 * HTTP APIs have no API keys, so the Lambda checks a bearer key itself against
 * SHA-256 hashes kept in an SSM SecureString parameter. The table is only ever
 * granted read access.
 */
export class LeetApi extends Construct {
  public readonly api: apigwV2.IHttpApi;
  public readonly apiFunction: lambda.IFunction;
  public readonly consumerKeyHashes: ISecureStringParameter;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    // Comma-separated SHA-256 hashes of valid keys (two at most, for rotation).
    // The real value is written by scripts/createApiKey.sh.
    this.consumerKeyHashes = new SecureStringParameter(
      this,
      "ConsumerKeyHashes",
      {
        parameterName: `/leetbot/${props.environment}/api/consumer-key-hashes`,
        placeholderValue: PLACEHOLDER_PARAM_VALUE,
        removalPolicy: getRemovalPolicy(props.environment),
        description: "SHA-256 hashes of valid Leet API consumer keys",
      },
    );

    const apiFunction = new NodejsFunction(this, "LeetApiFunction", {
      ...getDefaultLambdaConfig(),
      entry: "src/leetApi/handler/leetApiHandler.ts",
      handler: "handler",
      timeout: cdk.Duration.seconds(10),
      logGroup: createLogGroup(
        this,
        "LeetApiFunctionLogGroup",
        props.environment,
      ),
      bundling: {
        minify: getMinify(props.environment),
        externalModules: ["@aws-sdk/*", "date-fns", "date-fns-tz", "pino"],
      },
      layers: [props.layers.dateFnsLayer, props.layers.pinoLayer],
      environment: {
        TABLE_NAME: props.table.tableName,
        API_KEY_HASHES_PARAM_NAME: this.consumerKeyHashes.parameterName,
        LOG_LEVEL: getLogLevel(props.environment),
      },
      description: "Read-only Leet API for the Leet Creatures game.",
    });

    this.apiFunction = apiFunction;

    // The API must never write
    props.table.grantReadData(apiFunction);
    this.consumerKeyHashes.grantRead(apiFunction);

    const httpApi = new apigwV2.HttpApi(this, "LeetApiRoot", {
      apiName: `${props.environment}-LeetApi`,
      description: "Read-only API for the Leet Creatures game",
    });

    this.api = httpApi;

    const integration = new apigwV2Integrations.HttpLambdaIntegration(
      "LeetApiIntegration",
      apiFunction,
    );

    httpApi.addRoutes({
      path: "/v1/health",
      methods: [apigwV2.HttpMethod.GET],
      integration,
    });
    httpApi.addRoutes({
      path: "/v1/guilds/{guildId}/days",
      methods: [apigwV2.HttpMethod.GET],
      integration,
    });

    // Access logs never include request headers, so keys stay out of them
    const accessLogGroup = createLogGroup(
      this,
      "LeetApiAccessLogs",
      props.environment,
    );

    const defaultStage = httpApi.defaultStage?.node
      .defaultChild as apigwV2.CfnStage;
    defaultStage.accessLogSettings = {
      destinationArn: accessLogGroup.logGroupArn,
      format: JSON.stringify({
        requestId: "$context.requestId",
        requestTime: "$context.requestTime",
        httpMethod: "$context.httpMethod",
        routeKey: "$context.routeKey",
        path: "$context.path",
        status: "$context.status",
        error: {
          message: "$context.error.message",
          messageString: "$context.error.messageString",
        },
        responseLength: "$context.responseLength",
        responseLatency: "$context.responseLatency",
        sourceIp: "$context.identity.sourceIp",
        userAgent: "$context.identity.userAgent",
        integrationError: "$context.integration.error",
        integrationStatus: "$context.integration.status",
        integrationLatency: "$context.integration.latency",
      }),
    };

    // Rate-limit the stage
    defaultStage.defaultRouteSettings = {
      throttlingRateLimit: 5,
      throttlingBurstLimit: 10,
    };

    new cdk.CfnOutput(this, "LeetApiUrl", {
      value: httpApi.apiEndpoint,
      description: "Base URL of the Leet API (no trailing slash)",
    });

    new cdk.CfnOutput(this, "ConsumerKeyHashesParameter", {
      value: this.consumerKeyHashes.parameterName,
      description: "SSM parameter name for Leet API consumer key hashes",
    });
  }
}
