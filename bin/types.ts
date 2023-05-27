import type { ContainerImage } from "aws-cdk-lib/aws-ecs";

export interface ContainerProperties {
  id: string;
  containerPort: number;
  image: ContainerImage;
}
