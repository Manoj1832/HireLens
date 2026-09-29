#!/usr/bin/env python3
import os
import aws_cdk as cdk
from hirelens_stack import HireLensStack

app = cdk.App()

# Default to region ap-south-1 (Mumbai) and current account
env = cdk.Environment(
    account=os.getenv("CDK_DEFAULT_ACCOUNT", "702641624999"),
    region=os.getenv("CDK_DEFAULT_REGION", "ap-south-1"),
)

HireLensStack(app, "HireLensStack", env=env)

app.synth()
