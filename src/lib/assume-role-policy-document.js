export default JSON.stringify({
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: {
        Service: [ 'credentials.iot.amazonaws.com' ]
      },
      Action: [ 'sts:AssumeRole' ]
    }
  ]
})
