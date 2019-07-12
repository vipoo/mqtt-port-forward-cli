import {forwardMqttToLocalPort, forwardLocalPortToMqtt} from 'mqtt-port-forward'
import {createMqttClient} from './lib/mqtt'
import {getAwsIotEndPoint} from './lib/aws'

async function simulateDeviceCode(options) {
  const client = await createMqttClient({...options, clientId: 'spike-out'})
  forwardMqttToLocalPort(client, 22, 'spike')
}

async function simulateBackOffice(options) {
  const client = await createMqttClient({...options, clientId: 'spike-in'})
  forwardLocalPortToMqtt(client, 2222, 'spike')
}

async function main() {
  const endpoint = await getAwsIotEndPoint()
  const options = {
    keyPath: './aws/private.pem.key',
    certPath: './aws/certificate.pem.crt',
    caPath: './aws/AmazonRootCA1.pem',
    host: endpoint,
    debug: true,
    keepalive: 60,
    qos: 1
  }

  switch (process.argv[2]) {
  case 'out':
    simulateDeviceCode(options)
    break

  case 'in':
    simulateBackOffice(options)
    break
  }
}

main()
