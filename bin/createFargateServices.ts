import * as cdk from "aws-cdk-lib";
import * as ecs from "aws-cdk-lib/aws-ecs";
import type { TaskDefinition, FargateService } from "aws-cdk-lib/aws-ecs";
import type { Stack, Tag } from "aws-cdk-lib";
import type { ContainerProperties } from "./types";

// Define the directory that contains the container app
// (path to the Dockerfile's directory)
const CONTAINER_DIRECTORY = "./src/leetbot-watcher";

const myFunContainerProperties: ContainerProperties = {
  id: "MyFunContainer",
  containerPort: 80,
  image: ecs.ContainerImage.fromAsset(CONTAINER_DIRECTORY),
};

const containers: ContainerProperties[] = [myFunContainerProperties];

interface TaskDefinitionProperties {
  id: string;
  stack: Stack;
  containerProperties: ContainerProperties;
  tags?: Tag[];
}

/**
 * Creates Fargate task definition, port mapping and assigns tags to a given container
 * @param id Task definition id
 * @param stack Stack
 * @param containerProperties Container properties
 * @param tags Tags
 */
const createTaskDefinition = ({
  id,
  stack,
  containerProperties,
  tags,
}: TaskDefinitionProperties): TaskDefinition => {
  const taskDefinition = new ecs.FargateTaskDefinition(
    stack,
    `${id}TaskDefinition`
  );

  // Add container and port mappings to the task definition
  taskDefinition
    .addContainer(`${id}Container`, {
      image: containerProperties.image,
      memoryLimitMiB: 256,
      logging: new ecs.AwsLogDriver({ streamPrefix: `${id}` }),
    })
    .addPortMappings({
      containerPort: containerProperties.containerPort,
      protocol: ecs.Protocol.TCP,
    });

  // Add tags if they exist
  tags?.forEach((tag) => {
    cdk.Tags.of(taskDefinition).add(tag.key, tag.value);
  });

  return taskDefinition;
};

/**
 * Creates Fargate services for each given container.
 * Creates a single cluster and attaches each container to it.
 * @param stack Stack
 */
const createFargateServices = (stack: Stack): FargateService[] => {
  const cluster = new ecs.Cluster(stack, `${stack.stackName}Cluster`);

  return containers.map(
    (container) =>
      new ecs.FargateService(stack, `${container.id}FargateService`, {
        cluster,
        taskDefinition: createTaskDefinition({
          id: container.id,
          stack,
          containerProperties: container,
          tags: [new cdk.Tag("creator", "misjok")],
        }),
      })
  );
};

export default createFargateServices;
