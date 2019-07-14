import program from 'commander'
import path from 'path'
import {getDefaultDir, getMqttOptions, saveConfig} from '../lib/config'
import caFile from '../lib/amazon-root-ca1-pem'
import {promises as fsp} from 'fs'
import {configureRoleIdentities, deleteRoleIdentities, configureIotAccess, deleteIotAccess} from '../lib/aws-iot-access'
import {log} from '../lib/log'

program
  .version(process.env.npm_package_version)
  .option('-c, --config <file>', 'path to configuration json file (default ~/.mqtt-port-forward/config.js')
  .option('-d, --dir <path>', 'path to directory to store the download certificates (defaults to ~/.mqtt-port-forward/)')

program
  .command('create <topic-name>')
  .description('Create roles, certificate and associated policy for use with port forwarding topics.')
  .action(createResources)

program
  .command('delete <topic-name>')
  .description('Delete roles, certificate and associated policy for use with port forwarding topics.')
  .action(deleteResources)

program
  .parse(process.argv)

async function deleteResources(topicName) {
  await deleteIotAccess(topicName)
  await deleteRoleIdentities(topicName)
}

async function createResources(topicName) {
  const homeConfigPath = await getDefaultDir()
  const configOptions = await getMqttOptions()

  const outputDir = program.dir ? path.join(process.cwd(), program.dir) : homeConfigPath
  configOptions.keyPath = path.join(outputDir, 'private.key')
  configOptions.certPath = path.join(outputDir, 'certificate.crt')
  configOptions.caPath = path.join(outputDir, 'AmazonRootCA1.pem')

  await fsp.mkdir(outputDir, {recursive: true})
  await fsp.writeFile(configOptions.caPath, caFile, {flag: 'wx'}).catch(() => {})

  await saveConfig(configOptions)

  await configureRoleIdentities(topicName)
  const keys = await configureIotAccess(topicName)

  if (keys) {
    const {privateKey, certificatePem} = keys
    await Promise.all([
      fsp.writeFile(configOptions.keyPath, privateKey),
      fsp.writeFile(configOptions.certPath, certificatePem)
    ])
    log.info(`Saved private and certificate files in ${outputDir}`)
  }
}
