import AWS from './aws'
import fs from 'fs'
const Iot = new AWS.Iot()

const log = {
  info: (...args) => console.log(...args), // eslint-disable-line no-console
}

export async function configureIotAccess(policyName) {

  const policyExists = await Iot.getPolicy({policyName}).catch(() => false)
  if (policyExists)
    await updatePolicyVersion(policyName)
  else
    await createCertificateAndAssociatePolicy(policyName)
}

async function deletePolicyVersions(policyName) {
  const {policyVersions} = await Iot.listPolicyVersions({policyName})
  for (const v of policyVersions.filter(p => !p.isDefaultVersion))
    await Iot.deletePolicyVersion({policyName, policyVersionId: v.versionId})
}

async function updatePolicyVersion(policyName) {
  log.info(`Updating policy document for ${policyName}`)

  await deletePolicyVersions(policyName)

  await Iot.createPolicyVersion({policyName, policyDocument: policyDocument(policyName), setAsDefault: true})

  await deletePolicyVersions(policyName)
}

async function createCertificateAndAssociatePolicy(policyName) {
  log.info('Creating a certificate and an associated policy')

  await Iot.createPolicy({policyName, policyDocument: policyDocument(policyName)})

  const {certificateArn, certificatePem, keyPair} = await Iot.createKeysAndCertificate({setAsActive: true})
  const privateKey = keyPair.PrivateKey
  await Promise.all([
    fs.promises.writeFile('./aws/private.pem.key', privateKey),
    fs.promises.writeFile('./aws/certificate.pem.crt', certificatePem)
  ])

  await Iot.attachPrincipalPolicy({policyName, principal: certificateArn})
}

const policyDocument = (policyName) => JSON.stringify({
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Action: [
        'iot:AssumeRoleWithCertificate'
      ],
      Resource: [
        'arn:aws:iot:ap-southeast-2:672317684965:rolealias/spike-iot-role-alias'
      ]
    },
    {
      Effect: 'Allow',
      Action: [
        'iot:Connect'
      ],
      Resource: [
        '*'
      ]
    },
    {
      Effect: 'Allow',
      Action: [
        'iot:Subscribe',
        'iot:Receive',
        'iot:Publish'
      ],
      Resource: [
        `arn:aws:iot:ap-southeast-2:672317684965:topicfilter/${policyName}/tunnel/*`,
        `arn:aws:iot:ap-southeast-2:672317684965:topic/${policyName}/tunnel/*`
      ]
    }
  ]
})
