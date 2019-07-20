import _Iot from 'aws-sdk/clients/iot'
import _Iam from 'aws-sdk/clients/iam'
import _Sts from 'aws-sdk/clients/sts'
import {region} from './aws'
import awsAsPromise from 'aws-sdk-as-promise'

import {log} from './log'
import assumeRolePolicyDocument from './assume-role-policy-document'
const Iot = awsAsPromise(new _Iot())
const Iam = awsAsPromise(new _Iam())
const sts = awsAsPromise(new _Sts())

const reg = /cert\/(.*)/
const fromArnToId = certificateArn => reg.exec(certificateArn)[1]

async function getAccountId() {
  const {Account} = await sts.getCallerIdentity()
  return Account
}

export async function configureRoleIdentities(name) {
  const RoleName = `mqtt-pf-${name}`
  const Description = 'role created by mqtt-port-forward cli to access topics'
  const Tags = [{Key: 'mqtt-port-forward', Value: 'mqtt-port-forward'}]
  const AssumeRolePolicyDocument = assumeRolePolicyDocument

  const {Role} = await Iam.createRole({RoleName, Description, Tags, AssumeRolePolicyDocument})
    .catch(err => err.code === 'EntityAlreadyExists' ? Iam.getRole({RoleName}) : err)

  const roleArn = Role.Arn
  const roleAlias = `${RoleName}-iot-role-alias`

  const retrieve = () => Iot.describeRoleAlias({roleAlias})
    .then(() => log.info(`Role exists: 'mqtt-pf-${name}' with iot alias of '${RoleName}-iot-role-alias'`))

  await Iot.createRoleAlias({roleAlias, roleArn})
    .then(() => log.info(`Created role 'mqtt-pf-${name}' with iot alias of '${RoleName}-iot-role-alias'`))
    .catch(err => err.code === 'ResourceAlreadyExistsException' ? retrieve() : err)
}

export async function deleteRoleIdentities(name) {
  const RoleName = `mqtt-pf-${name}`
  const roleAlias = `${RoleName}-iot-role-alias`

  await Iot.deleteRoleAlias({roleAlias})
    .catch(err => err.code === 'ResourceNotFoundException' ? undefined : err)
  await Iam.deleteRole({RoleName})
    .catch(err => err.code === 'NoSuchEntity' ? undefined : err)
}

export async function configureIotAccess(name) {
  const roleAlias = `mqtt-pf-${name}-iot-role-alias`
  const policyExists = await Iot.getPolicy({policyName: name}).catch(() => false)
  if (policyExists)
    await updatePolicyVersion(name, roleAlias)
  else
    return await createCertificateAndAssociatePolicy(name, roleAlias)
}

export async function deleteIotAccess(name) {
  await deletePolicyVersions(name)

  const {principals} = await Iot.listPolicyPrincipals({policyName: name})

  if (principals.length > 1)
    throw new Error(`Unexpected additional certificates found for policy: ${name}`)

  if (principals.length === 1) {
    const principal = principals[0]
    const certificateId = fromArnToId(principal)
    await Iot.detachPrincipalPolicy({policyName: name, principal})
    log.info(`Detached certificate from policy '${name}'`)
    await Iot.updateCertificate({certificateId, newStatus: 'INACTIVE'})
    await Iot.deleteCertificate({certificateId})
    log.info('Deleted certificate')
  }

  await Iot.deletePolicy({policyName: name})
    .then(() => log.info(`Removed policy '${name}'`))
    .catch(err => err.code === 'ResourceNotFoundException' ? undefined : err)
}

async function deletePolicyVersions(policyName) {
  const {policyVersions} = await Iot.listPolicyVersions({policyName})
    .catch(err => err.code === 'ResourceNotFoundException' ? {policyVersions: []} : err)

  for (const v of policyVersions.filter(p => !p.isDefaultVersion)) {
    await Iot.deletePolicyVersion({policyName, policyVersionId: v.versionId})
    log.info(`Removing from policy '${policyName}', document version number: ${v.versionId}`)
  }
}

async function updatePolicyVersion(policyName, roleAliasName) {
  const accountId = await getAccountId()
  await deletePolicyVersions(policyName)
  const {policyVersionId} = await Iot.createPolicyVersion({policyName, policyDocument: policyDocument(accountId, region, policyName, roleAliasName), setAsDefault: true})
  log.info(`Attached to policy '${policyName}', a new default document number: ${policyVersionId}`)
  await deletePolicyVersions(policyName)
}

async function createCertificateAndAssociatePolicy(policyName, roleAliasName) {
  const accountId = await getAccountId()

  await Iot.createPolicy({policyName, policyDocument: policyDocument(accountId, region, policyName, roleAliasName)})
  log.info(`Created a new policy '${policyName}', with default document number: 1`)

  const {certificateArn, certificatePem, keyPair} = await Iot.createKeysAndCertificate({setAsActive: true})
  log.info('Created an active certificate')
  const privateKey = keyPair.PrivateKey

  await Iot.attachPrincipalPolicy({policyName, principal: certificateArn})
  log.info(`Attached certificate to policy'${policyName}'`)

  return {privateKey, certificatePem}
}

const policyDocument = (accountId, region, policyName, roleAliasName) => JSON.stringify({
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Action: [
        'iot:AssumeRoleWithCertificate'
      ],
      Resource: [
        `arn:aws:iot:${region}:${accountId}:rolealias/${roleAliasName}`
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
        `arn:aws:iot:${region}:${accountId}:topicfilter/${policyName}/tunnel/*`,
        `arn:aws:iot:${region}:${accountId}:topic/${policyName}/tunnel/*`
      ]
    }
  ]
})
