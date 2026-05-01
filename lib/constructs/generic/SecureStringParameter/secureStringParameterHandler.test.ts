import type {
  CloudFormationCustomResourceCreateEvent,
  CloudFormationCustomResourceDeleteEvent,
  CloudFormationCustomResourceUpdateEvent,
  Context,
} from "aws-lambda";
import {
  handler,
  type ResourceProperties,
} from "./secureStringParameterHandler";
import {
  ParameterNotFound,
  ssmSendMock,
} from "@/test/mocks/aws-sdk-client-ssm";

const baseProperties: ResourceProperties = {
  parameterName: "/test/secure-string",
  description: "test parameter",
  placeholderValue: "change-me",
  removalPolicy: "DESTROY",
};

describe("secureStringParameterHandler", () => {
  const fetchMock = jest.fn();
  const sendMock = ssmSendMock;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  const context = {
    logStreamName: "test-log-stream",
    callbackWaitsForEmptyEventLoop: true,
  } as Context;

  beforeAll(() => {
    consoleInfoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    context.callbackWaitsForEmptyEventLoop = true;
  });

  afterAll(() => {
    consoleInfoSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("creates the secure string parameter and reports success", async () => {
    await handler(createCreateEvent(), context);

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].input).toEqual({
      Name: "/test/secure-string",
      Description: "test parameter",
      Value: "change-me",
      Type: "SecureString",
      Overwrite: false,
    });

    expect(context.callbackWaitsForEmptyEventLoop).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/response",
      expect.objectContaining({
        method: "PUT",
      }),
    );

    expect(getResponseBody(fetchMock)).toMatchObject({
      Status: "SUCCESS",
      PhysicalResourceId: "SecureStringParameter:/test/secure-string",
      Data: { parameterName: "/test/secure-string" },
    });
  });

  it("updates in place when the parameter name is unchanged", async () => {
    await handler(createUpdateEvent(), context);

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].input).toEqual({
      Name: "/test/secure-string",
      Description: "test parameter",
      Value: "change-me",
      Type: "SecureString",
      Overwrite: true,
    });

    expect(getResponseBody(fetchMock)).toMatchObject({
      Status: "SUCCESS",
      PhysicalResourceId: "SecureStringParameter:/test/secure-string",
    });
  });

  it("creates a replacement parameter on rename and returns a new physical id", async () => {
    await handler(
      createUpdateEvent({
        parameterName: "/test/new-secure-string",
      }),
      context,
    );

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].input).toEqual({
      Name: "/test/new-secure-string",
      Description: "test parameter",
      Value: "change-me",
      Type: "SecureString",
      Overwrite: false,
    });

    expect(getResponseBody(fetchMock)).toMatchObject({
      Status: "SUCCESS",
      PhysicalResourceId: "SecureStringParameter:/test/new-secure-string",
      Data: { parameterName: "/test/new-secure-string" },
    });
  });

  it("deletes the parameter on destroy", async () => {
    await handler(createDeleteEvent(), context);

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].input).toEqual({
      Name: "/test/secure-string",
    });

    expect(getResponseBody(fetchMock)).toMatchObject({
      Status: "SUCCESS",
      PhysicalResourceId: "SecureStringParameter:/test/secure-string",
    });
  });

  it("skips deletion when removal policy is retain", async () => {
    await handler(
      createDeleteEvent({
        removalPolicy: "RETAIN",
      }),
      context,
    );

    expect(sendMock).not.toHaveBeenCalled();
    expect(getResponseBody(fetchMock)).toMatchObject({
      Status: "SUCCESS",
    });
  });

  it("treats missing parameters on delete as success", async () => {
    sendMock.mockRejectedValueOnce(new ParameterNotFound());

    await handler(createDeleteEvent(), context);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getResponseBody(fetchMock)).toMatchObject({
      Status: "SUCCESS",
    });
  });

  it("reports failure back to CloudFormation when SSM work fails", async () => {
    sendMock.mockRejectedValueOnce(new Error("boom"));

    await handler(createCreateEvent(), context);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getResponseBody(fetchMock)).toMatchObject({
      Status: "FAILED",
      Reason: "boom",
      PhysicalResourceId: "SecureStringParameter:/test/secure-string",
    });
  });

  it("uses the existing physical resource id on delete events", async () => {
    await handler(
      createDeleteEvent({}, "SecureStringParameter:/existing-physical-id"),
      context,
    );

    expect(getResponseBody(fetchMock)).toMatchObject({
      PhysicalResourceId: "SecureStringParameter:/existing-physical-id",
    });
  });
});

function createCreateEvent(
  properties: Partial<ResourceProperties> = {},
): CloudFormationCustomResourceCreateEvent {
  return {
    RequestType: "Create",
    ResponseURL: "https://example.com/response",
    StackId: "stack-id",
    RequestId: "request-id",
    ResourceType: "Custom::SecureStringParameter",
    LogicalResourceId: "TestResource",
    ServiceToken: "service-token",
    ResourceProperties: {
      ServiceToken: "service-token",
      ...baseProperties,
      ...properties,
    },
  };
}

function createUpdateEvent(
  properties: Partial<ResourceProperties> = {},
): CloudFormationCustomResourceUpdateEvent {
  return {
    RequestType: "Update",
    ResponseURL: "https://example.com/response",
    StackId: "stack-id",
    RequestId: "request-id",
    ResourceType: "Custom::SecureStringParameter",
    LogicalResourceId: "TestResource",
    PhysicalResourceId: "SecureStringParameter:/test/secure-string",
    ServiceToken: "service-token",
    ResourceProperties: {
      ServiceToken: "service-token",
      ...baseProperties,
      ...properties,
    },
    OldResourceProperties: {
      ServiceToken: "service-token",
      ...baseProperties,
    },
  };
}

function createDeleteEvent(
  properties: Partial<ResourceProperties> = {},
  physicalResourceId: string = "SecureStringParameter:/test/secure-string",
): CloudFormationCustomResourceDeleteEvent {
  return {
    RequestType: "Delete",
    ResponseURL: "https://example.com/response",
    StackId: "stack-id",
    RequestId: "request-id",
    ResourceType: "Custom::SecureStringParameter",
    LogicalResourceId: "TestResource",
    PhysicalResourceId: physicalResourceId,
    ServiceToken: "service-token",
    ResourceProperties: {
      ServiceToken: "service-token",
      ...baseProperties,
      ...properties,
    },
  };
}

function getResponseBody(fetchFn: jest.Mock) {
  const options = fetchFn.mock.calls[0][1] as { body: string };

  return JSON.parse(options.body);
}
