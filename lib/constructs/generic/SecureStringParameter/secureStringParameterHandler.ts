import {
  DeleteParameterCommand,
  ParameterNotFound,
  PutParameterCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";
import type {
  CloudFormationCustomResourceDeleteEvent,
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse,
  CloudFormationCustomResourceUpdateEvent,
  Context,
} from "aws-lambda";

type RemovalPolicyMode = "DESTROY" | "RETAIN";

export interface ResourceProperties {
  parameterName: string;
  description?: string;
  placeholderValue: string;
  removalPolicy: RemovalPolicyMode;
}

const ssmClient = new SSMClient({});

/**
 * Lambda entry point for the `Custom::SecureStringParameter` resource.
 *
 * CloudFormation invokes this handler during stack Create, Update, and Delete
 * operations. The handler performs the matching SSM API call and then sends a
 * signed success/failure response back to CloudFormation. That response step is
 * mandatory; if we skip it, CloudFormation will wait until the custom resource
 * times out and the stack operation can stall or fail.
 */
export const handler = async (
  event: CloudFormationCustomResourceEvent,
  context: Context,
): Promise<void> => {
  // Do not wait for the Node event loop to drain after the response is sent.
  // This helps the handler exit promptly after replying to CloudFormation.
  context.callbackWaitsForEmptyEventLoop = false;

  const properties = event.ResourceProperties as unknown as ResourceProperties;
  const physicalResourceId =
    resolvePhysicalResourceId(event) ??
    createPhysicalResourceId(properties.parameterName);

  console.info("Handling secure string parameter request", {
    requestType: event.RequestType,
    logicalResourceId: event.LogicalResourceId,
    parameterName: properties.parameterName,
  });

  let status: CloudFormationCustomResourceResponse["Status"] = "SUCCESS";
  let reason: string | undefined;
  let updatedPhysicalResourceId = physicalResourceId;
  const data = {
    parameterName: properties.parameterName,
  };

  try {
    switch (event.RequestType) {
      case "Create": {
        await putParameter(properties, false);
        break;
      }
      case "Update": {
        const updateResult = await handleUpdate(event, properties);
        updatedPhysicalResourceId = updateResult.physicalResourceId;
        break;
      }
      case "Delete": {
        await handleDelete(event, properties);
        break;
      }
    }
  } catch (error) {
    status = "FAILED";
    reason = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to handle secure string parameter request", {
      requestType: event.RequestType,
      logicalResourceId: event.LogicalResourceId,
      parameterName: properties.parameterName,
      reason,
    });
  } finally {
    await sendCloudFormationResponse({
      event,
      context,
      status,
      reason,
      physicalResourceId: updatedPhysicalResourceId,
      data,
    });
  }
};

async function handleUpdate(
  event: CloudFormationCustomResourceUpdateEvent,
  properties: ResourceProperties,
): Promise<{ physicalResourceId: string }> {
  const oldProperties =
    event.OldResourceProperties as unknown as ResourceProperties;
  const parameterNameChanged =
    oldProperties.parameterName !== properties.parameterName;

  if (!parameterNameChanged) {
    await putParameter(properties, true);

    return {
      physicalResourceId: resolvePhysicalResourceId(event)!,
    };
  }

  // When the parameter name changes, CloudFormation treats this as a logical
  // replacement. We create the new parameter here and let the later Delete
  // event clean up the old physical resource if the removal policy allows it.
  await putParameter(properties, false);

  return {
    physicalResourceId: createPhysicalResourceId(properties.parameterName),
  };
}

async function handleDelete(
  event: CloudFormationCustomResourceDeleteEvent,
  properties: ResourceProperties,
): Promise<void> {
  // Delete may arrive during rollback after a failed create/update. In that
  // case the parameter may never have existed, which we treat as success.
  if (properties.removalPolicy === "RETAIN") {
    console.info("Skipping parameter deletion due to retain policy", {
      logicalResourceId: event.LogicalResourceId,
      parameterName: properties.parameterName,
    });

    return;
  }

  try {
    await ssmClient.send(
      new DeleteParameterCommand({
        Name: properties.parameterName,
      }),
    );
  } catch (error) {
    if (error instanceof ParameterNotFound) {
      console.info("Parameter already missing during delete", {
        logicalResourceId: event.LogicalResourceId,
        parameterName: properties.parameterName,
      });

      return;
    }

    throw error;
  }
}

async function putParameter(
  properties: ResourceProperties,
  overwrite: boolean,
): Promise<void> {
  await ssmClient.send(
    new PutParameterCommand({
      Name: properties.parameterName,
      Description: properties.description,
      Value: properties.placeholderValue,
      Type: "SecureString",
      Overwrite: overwrite,
    }),
  );
}

function resolvePhysicalResourceId(
  event: CloudFormationCustomResourceEvent,
): string | undefined {
  if ("PhysicalResourceId" in event && event.PhysicalResourceId) {
    return event.PhysicalResourceId;
  }

  return undefined;
}

function createPhysicalResourceId(parameterName: string): string {
  return `SecureStringParameter:${parameterName}`;
}

async function sendCloudFormationResponse({
  event,
  context,
  status,
  reason,
  physicalResourceId,
  data,
}: {
  event: CloudFormationCustomResourceEvent;
  context: Context;
  status: CloudFormationCustomResourceResponse["Status"];
  reason?: string;
  physicalResourceId: string;
  data?: CloudFormationCustomResourceResponse["Data"];
}): Promise<void> {
  // Lambda-backed custom resources must PUT a response document to the
  // presigned ResponseURL from the event. Returning from the handler alone is
  // not enough for CloudFormation to finish the resource operation.
  // Failure to do this will cause stack updates to hang.
  const responseBody = JSON.stringify({
    Status: status,
    Reason: reason ?? `See CloudWatch Logs: ${context.logStreamName}`,
    PhysicalResourceId: physicalResourceId,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    NoEcho: false,
    Data: data,
  });

  const response = await fetch(event.ResponseURL, {
    method: "PUT",
    body: responseBody,
  });

  if (!response.ok) {
    throw new Error(
      `CloudFormation response failed: ${response.status} ${response.statusText}`,
    );
  }
}
