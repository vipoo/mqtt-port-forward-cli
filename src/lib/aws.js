import AWS from 'aws-sdk/global'
import Iot from 'aws-sdk/clients/iot'
import awsAsPromise from 'aws-sdk-as-promise'

export const region = process.env.AWS_REGION || 'ap-southeast-2'

AWS.config.apiVersions = {
  iot: '2015-05-28',
  iam: '2010-05-08',
  sts: '2011-06-15'
}
AWS.config.update({region})

export let getAwsIotEndPoint = async () => {
  const iot = awsAsPromise(new Iot())
  const result = await iot.describeEndpoint({endpointType: 'iot:Data-ATS'})
  const endpoint = result.endpointAddress
  getAwsIotEndPoint = () => endpoint
  return endpoint
}

export default {getAwsIotEndPoint, region}
