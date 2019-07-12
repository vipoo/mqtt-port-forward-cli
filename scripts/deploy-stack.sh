#!/bin/bash

set -e
set -x

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"

STACK_NAME=spike

$DIR/aws-cloudformation.sh deploy \
    --template-file aws/template.yaml \
    --stack-name $STACK_NAME \
    --capabilities CAPABILITY_IAM

role_arn=$(aws --region ap-southeast-2 cloudformation describe-stacks \
               --stack-name $STACK_NAME \
               --query 'Stacks[].Outputs[]' --output text | grep DeviceAccessRole | cut -f 3)

aws iot delete-role-alias --role-alias spike-iot-role-alias > /dev/null 2>&1 || true

aws iot create-role-alias \
    --role-alias spike-iot-role-alias \
    --role-arn $role_arn
