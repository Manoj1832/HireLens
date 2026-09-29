from aws_cdk import (
    Stack,
    CfnOutput,
    RemovalPolicy,
    Duration,
    aws_s3 as s3,
    aws_ecr as ecr,
    aws_ec2 as ec2,
    aws_iam as iam,
)
from constructs import Construct


class HireLensStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # -------------------------------------------------------------
        # 1. Amazon S3: Private Resume Storage
        # -------------------------------------------------------------
        resume_bucket = s3.Bucket(
            self,
            "HireLensResumeBucket",
            bucket_name=f"hirelens-resumes-{self.account}-{self.region}",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            encryption=s3.BucketEncryption.S3_MANAGED,
            enforce_ssl=True,
            versioned=True,
            removal_policy=RemovalPolicy.RETAIN,
            cors=[
                s3.CorsRule(
                    allowed_methods=[s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
                    allowed_origins=["*"],
                    allowed_headers=["*"],
                    max_age=3600,
                )
            ],
        )

        # -------------------------------------------------------------
        # 2. Amazon ECR: Container Registries
        # -------------------------------------------------------------
        backend_repo = ecr.Repository(
            self,
            "HireLensBackendRepo",
            repository_name="hirelens-backend",
            image_scan_on_push=True,
            removal_policy=RemovalPolicy.RETAIN,
            lifecycle_rules=[
                ecr.LifecycleRule(
                    max_image_count=10,
                    description="Keep only the latest 10 production images",
                )
            ],
        )

        # -------------------------------------------------------------
        # 3. Amazon VPC: Cost-Effective Public Multi-AZ Network
        # -------------------------------------------------------------
        # 2 AZs with public subnets only (no costly NAT Gateways required)
        vpc = ec2.Vpc(
            self,
            "HireLensVpc",
            max_azs=2,
            nat_gateways=0,
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name="Public",
                    subnet_type=ec2.SubnetType.PUBLIC,
                    cidr_mask=24,
                )
            ],
        )

        # -------------------------------------------------------------
        # 4. Security Group: Web, API, SSH
        # -------------------------------------------------------------
        security_group = ec2.SecurityGroup(
            self,
            "HireLensSecurityGroup",
            vpc=vpc,
            description="Security Group for HireLens Full-Stack EC2 host",
            allow_all_outbound=True,
        )
        security_group.add_ingress_rule(
            ec2.Peer.any_ipv4(),
            ec2.Port.tcp(80),
            "Allow HTTP traffic",
        )
        security_group.add_ingress_rule(
            ec2.Peer.any_ipv4(),
            ec2.Port.tcp(443),
            "Allow HTTPS traffic",
        )
        security_group.add_ingress_rule(
            ec2.Peer.any_ipv4(),
            ec2.Port.tcp(3000),
            "Allow Next.js Web Frontend access",
        )
        security_group.add_ingress_rule(
            ec2.Peer.any_ipv4(),
            ec2.Port.tcp(8000),
            "Allow FastAPI Backend API & Swagger Docs",
        )
        security_group.add_ingress_rule(
            ec2.Peer.any_ipv4(),
            ec2.Port.tcp(22),
            "Allow SSH administration",
        )

        # -------------------------------------------------------------
        # 5. IAM Role: EC2 Instance Profile with S3, SES, and ECR access
        # -------------------------------------------------------------
        ec2_role = iam.Role(
            self,
            "HireLensEc2Role",
            assumed_by=iam.ServicePrincipal("ec2.amazonaws.com"),
            description="Instance role for HireLens EC2 instance",
        )
        # Enable AWS Systems Manager Session Manager (secure browser shell without SSH keys)
        ec2_role.add_managed_policy(
            iam.ManagedPolicy.from_aws_managed_policy_name("AmazonSSMManagedInstanceCore")
        )

        # S3 Resume Bucket read/write permissions
        resume_bucket.grant_read_write(ec2_role)

        # Amazon SES transactional email sending permissions
        ec2_role.add_to_policy(
            iam.PolicyStatement(
                actions=["ses:SendEmail", "ses:SendRawEmail"],
                resources=["*"],
                effect=iam.Effect.ALLOW,
            )
        )

        # ECR pull access for docker containers
        backend_repo.grant_pull(ec2_role)

        # -------------------------------------------------------------
        # 6. EC2 Production Instance
        # -------------------------------------------------------------
        # Ubuntu 24.04 LTS (x86_64) AMI for ap-south-1
        ubuntu_ami = ec2.MachineImage.generic_linux(
            {
                "ap-south-1": "ami-053b12d3152c0cc71",
                "us-east-1": "ami-04b4f1a9cf54c11d0",
            }
        )


        # Cloud-init UserData to install Docker, Docker Compose, and prepare directory
        user_data = ec2.UserData.for_linux()
        user_data.add_commands(
            "set -e",
            "export DEBIAN_FRONTEND=noninteractive",
            "apt-get update -y",
            "apt-get install -y ca-certificates curl gnupg lsb-release git unzip",
            # Install Docker
            "install -m 0755 -d /etc/apt/keyrings",
            "curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc",
            "chmod a+r /etc/apt/keyrings/docker.asc",
            'echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null',
            "apt-get update -y",
            "apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin",
            "systemctl enable docker",
            "systemctl start docker",
            "usermod -aG docker ubuntu",
            # Install AWS CLI v2
            "curl 'https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip' -o 'awscliv2.zip'",
            "unzip -q awscliv2.zip && ./aws/install && rm -rf aws awscliv2.zip",
            # Create project directory
            "mkdir -p /opt/hirelens",
            "chown -R ubuntu:ubuntu /opt/hirelens",
            "echo 'HireLens host environment provisioned successfully.' > /opt/hirelens/provision.log"
        )

        instance = ec2.Instance(
            self,
            "HireLensAppServer",
            instance_type=ec2.InstanceType.of(
                ec2.InstanceClass.BURSTABLE3,
                ec2.InstanceSize.MEDIUM,
            ),
            machine_image=ubuntu_ami,
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PUBLIC),
            security_group=security_group,
            role=ec2_role,
            user_data=user_data,
            block_devices=[
                ec2.BlockDevice(
                    device_name="/dev/sda1",
                    volume=ec2.BlockDeviceVolume.ebs(
                        30,
                        volume_type=ec2.EbsDeviceVolumeType.GP3,
                        encrypted=True,
                        delete_on_termination=True,
                    ),
                )
            ],
        )

        # -------------------------------------------------------------
        # 7. CloudFormation Outputs
        # -------------------------------------------------------------
        CfnOutput(
            self,
            "S3ResumeBucketName",
            value=resume_bucket.bucket_name,
            description="Private S3 Bucket for Candidate Resume PDFs",
        )
        CfnOutput(
            self,
            "EcrBackendRepositoryUri",
            value=backend_repo.repository_uri,
            description="ECR Repository URI for HireLens Backend Image",
        )
        CfnOutput(
            self,
            "Ec2PublicIp",
            value=instance.instance_public_ip,
            description="Public IPv4 Address of HireLens Production EC2 Server",
        )
        CfnOutput(
            self,
            "Ec2PublicDns",
            value=instance.instance_public_dns_name,
            description="Public DNS Name of HireLens Production EC2 Server",
        )
        CfnOutput(
            self,
            "FrontendAppUrl",
            value=f"http://{instance.instance_public_ip}:3000",
            description="Next.js Web Frontend URL (No domain required)",
        )
        CfnOutput(
            self,
            "BackendDocsUrl",
            value=f"http://{instance.instance_public_ip}:8000/docs",
            description="FastAPI Interactive OpenAPI / Swagger Documentation URL",
        )
        CfnOutput(
            self,
            "SsmConnectCommand",
            value=f"aws ssm start-session --target {instance.instance_id} --profile hirelens",
            description="AWS Systems Manager one-click terminal session command",
        )
