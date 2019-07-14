import path from 'path'
import webpack from 'webpack'
import TerserPlugin from 'terser-webpack-plugin'
import fs from 'fs'
import util from 'util'
import childProcess from 'child_process'
const exec = util.promisify(childProcess.exec)

const entry = {}
fs.readdirSync('./src/bin/')
  .filter(f => f.endsWith('.js'))
  .filter(f => !f.endsWith('webpack.config.js'))
  .forEach(f => entry[path.basename(f, '.js')] = `./src/bin/${f}`)

const makeExecutablePlugin = {
  apply: compiler => {
    compiler.hooks.afterEmit.tap('AfterEmitPlugin', async () => {
      for (const fileName of Object.keys(entry)) {
        const target = `./bin/${fileName}`
        const targetJs = `${target}.js`
        await fs.promises.rename(targetJs, target)
        await exec(`chmod +x "${target}"`)
      }
    })
  }
}

export default {
  entry,
  target: 'node',
  output: {
    path: path.join(path.join(process.cwd(), 'bin')),
    filename: '[name].js'
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          ecma: 8,
          toplevel: true,
          compress: {
            dead_code: true
          },
          verbose: true,
          output: {
            ecma: 8,
            comments: false,
          },
        },
      }),
    ],
  },
  externals: {
    'aws-sdk': 'commonjs aws-sdk',
    bufferutil: 'commonjs bufferutil',
    'utf-8-validate': 'commonjs utf-8-validate'
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules)/,
        use: {loader: 'babel-loader'}
      },
      {
        test: /\.js$/,
        use: ['remove-hashbag-loader']
      }
    ]
  },
  resolveLoader: {
    alias: {
      'remove-hashbag-loader': path.join(__dirname, '..', 'lib', 'remove-hashbag-loader')
    }
  },
  plugins: [
    new webpack.BannerPlugin({banner: '#!/usr/bin/env node-no-depreciation', raw: true}),
    makeExecutablePlugin
  ],
  devtool: 'node'
}
