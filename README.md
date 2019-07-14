# MQTT Port Forwarding command line tools
-----------

This project provides some basic command line tools to manage and create a MQTT port forwarding setup.

It uses the package [mqtt-port-forward](https://www.npmjs.com/package/mqtt-port-forward).

For more details on the process, see the above module.

This cli works with the AWS IoT broker service.

Please note that the cli have only been tested on a linux platform. (ubuntu)

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Example](#example)
- [License](#license)


## Install

```sh
$ npm install -g mqtt-port-formward-cli
```

## Usage

There are 2 main commands:

1. `aws-configure-access`
2. `mqtt-port-forward`

Each command provides basic help (eg: aws-configure-access --help)

## Example

Say you have a device in the field, and you want to be able to ssh to it from your computer.  It has sshd configured,
to accept only connection from localhost on port 22.

To achieve this, you need to establish an MQTT topic to forward the ssh requests.

A service is needed to be running on the device, listening for MQTT messages, which it then forwards to
the local sshd service.

On your computer, you have another service, that listens on a specific port (say 2222), and when
a connection it established, it will forward the connection, via MQTT topic, to the device.

Thus, you now have a ssh session over your secure MQTT connection.

The following, show the steps to simulate this process on your own computer, using AWS's Iot broker service.

1. First create a private key pair, to access the AWS Iot Broker

```
  aws-configure-access create mydevice
```

The above command requires you have the [aws cli](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html) tools setup and configured to access your AWS account.

It will create a new Iot certificate and policy to allow for publishing on a specific topic (mydevice/tunnel/+/+).

The private key and certificate will be downloaded to your computer.

2. Start the incoming port forwarding service

```
  DEBUG=mqtt:pf:info* mqtt-port-forward.js in mydevice
```

NB: The DEBUG environment just enables some basic logging - without it, you will not see any logging.

3. In another terminal session, start the outgoing port fowarding service

```
  DEBUG=mqtt:pf:info* mqtt-port-forward.js out mydevice
```

4. And now, you can establish an ssh session to your local computer, but thru the MQTT port forwarding

```
ssh -p 2222 127.0.0.1
```

## License

[MIT](LICENSE) © Dean Netherton
