import program from 'commander'
import {promises as fsp} from 'fs'
import os from 'os'
import path from 'path'

export async function getDefaultDir() {
  const homeConfigPath = path.join(os.homedir(), '.mqtt-port-forward')
  await fsp.mkdir(homeConfigPath, {recursive: true})
  return homeConfigPath
}

export async function getMqttOptions() {
  const homeConfigPath = await getDefaultDir()
  const configPath = path.join(homeConfigPath, 'config.json')

  const configFilePath = program.config || configPath

  const defaults = JSON.stringify({
    keepalive: 60,
    qos: 1
  }, null, 2)

  await fsp
    .mkdir()
    .catch(() => {})
    .then(() => fsp.writeFile(configFilePath, defaults, {flag: 'wx'}))
    .catch(() => {})

  const content = await fsp.readFile(configFilePath, 'utf8')
  return JSON.parse(content)
}

export async function saveConfig(options) {
  const homeConfigPath = await getDefaultDir()
  const configPath = path.join(homeConfigPath, 'config.json')

  const configFilePath = program.config || configPath

  return await fsp.writeFile(configFilePath, JSON.stringify(options, null, 2))
}
