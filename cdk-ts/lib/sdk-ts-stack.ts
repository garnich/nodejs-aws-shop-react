import * as cdk from 'aws-cdk-lib';
import {
  aws_cloudfront as cf,
  aws_s3 as s3,
  aws_s3_deployment as s3d,
  aws_iam as iam,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class SdkTsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const CFOriginAccessIdentity = new cf.OriginAccessIdentity(
      this,
      "GarnichUserCFOAI",
      {
        comment: "OriginAccessIdentity for GarnichUserCF",
      }
    );

    const GarnichBucket = new s3.Bucket(this, "GarnichBucket", {
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      bucketName: "garnich-bucket",
      publicReadAccess: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      versioned: false,
      websiteIndexDocument: "index.html",
    });

    GarnichBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [GarnichBucket.arnForObjects("*")],
        principals: [
          new iam.CanonicalUserPrincipal(
            CFOriginAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId
          ),
        ],
      })
    );

    const distribution = new cf.CloudFrontWebDistribution(
      this,
      "SolidadosCloudfrontDistribution",
      {
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: GarnichBucket,
              originAccessIdentity: CFOriginAccessIdentity,
            },
            behaviors: [{ isDefaultBehavior: true }],
          },
        ],
      }
    );

    new s3d.BucketDeployment(this, "SolidadosBucketDeployment", {
      destinationBucket: GarnichBucket,
      distribution,
      distributionPaths: ["/*"],
      sources: [s3d.Source.asset("../dist")],
    });
  }
}
