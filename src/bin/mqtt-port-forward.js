import program from 'commander'
import {getAwsIotEndPoint} from './../lib/aws'
import {getMqttOptions} from '../lib/config'
import awsIot from 'aws-iot-device-sdk'
import {forwardMqttToLocalPort, forwardLocalPortToMqtt} from 'mqtt-port-forward'
import debug from 'debug'

debug.enable('mqtt:pf:info')

program
  .version(process.env.npm_package_version)
  .option('-c, --config <file>', 'path to configuration json file (default ~/.mqtt-port-forward/config.js')

program
  .command('out <topic-name>')
  .description('Establish an mqtt listener to forward packets to a local socket')
  .action(mqttPortForwardOut)

program
  .command('in <topic-name>')
  .description('Establish a socket listener to forward packets to an mqtt topic')
  .action(mqttPortForwardIn)

program
  .description('Configure port forwarding over mqtt topics')
  .parse(process.argv)

async function mqttPortForwardOut(topic) {
  const configOptions = await getMqttOptions()
  const endpoint = await getAwsIotEndPoint()

  const options = {
    host: endpoint,
    debug: false,
    keepalive: 60,
    qos: 1,
    ...configOptions
  }

  const client = awsIot.device({...options, clientId: `${topic}-out`})
  //const client = await createMqttClient({...options, clientId: '${topic}-out'})

  forwardMqttToLocalPort(client, 22, topic)
}

async function mqttPortForwardIn(topic) {
  const configOptions = await getMqttOptions()
  const endpoint = await getAwsIotEndPoint()

  const options = {
    host: endpoint,
    debug: false,
    keepalive: 60,
    qos: 1,
    ...configOptions
  }

  const client = awsIot.device({...options, clientId: `${topic}-in`})
  //const client = await createMqttClient({...options, clientId: '${topic}-in'})
  forwardLocalPortToMqtt(client, 2222, topic)
}
