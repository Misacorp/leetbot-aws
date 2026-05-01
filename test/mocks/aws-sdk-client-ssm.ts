export const ssmSendMock = jest.fn();

export class SSMClient {
  public send = ssmSendMock;
}

export class PutParameterCommand {
  public input: unknown;

  constructor(input: unknown) {
    this.input = input;
  }
}

export class DeleteParameterCommand {
  public input: unknown;

  constructor(input: unknown) {
    this.input = input;
  }
}

export class ParameterNotFound extends Error {}
