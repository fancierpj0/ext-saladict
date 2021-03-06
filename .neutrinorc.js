const path = require('path')
const react = require('@neutrinojs/react')
const copy = require('@neutrinojs/copy')
const jest = require('@neutrinojs/jest')
const wext = require('neutrino-webextension')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
const MomentLocalesPlugin = require('moment-locales-webpack-plugin')
const DotenvPlugin = require('dotenv-webpack')
const argv = require('yargs').argv
const AfterBuildPlugin = require('./scripts/after-build')

module.exports = {
  options: {
    mains: {
      content: {
        entry: 'content',
        webext: {
          type: 'content_scripts',
          manifest: {
            matches: ['<all_urls>']
          },
          setup: 'content/__fake__/env.ts'
        }
      },

      selection: {
        entry: 'selection',
        webext: {
          type: 'content_scripts',
          manifest: {
            match_about_blank: true,
            all_frames: true,
            matches: ['<all_urls>']
          }
        }
      },

      popup: {
        entry: 'popup',
        webext: {
          type: 'browser_action',
          manifest: {
            default_icon: {
              '16': 'assets/icon-16.png',
              '19': 'assets/icon-19.png',
              '24': 'assets/icon-24.png',
              '38': 'assets/icon-38.png',
              '48': 'assets/icon-48.png',
              '128': 'assets/icon-128.png'
            }
          },
          setup: 'popup/__fake__/env.ts'
        }
      },

      options: {
        entry: 'options',
        webext: {
          type: 'options_ui',
          manifest: {
            open_in_tab: true
          },
          setup: 'options/__fake__/env.ts'
        }
      },

      background: {
        entry: 'background',
        webext: {
          type: 'background',
          setup: 'background/__fake__/env.ts'
        }
      },

      notebook: {
        entry: 'notebook'
      },

      history: {
        entry: 'history'
      },

      'quick-search': {
        entry: 'quick-search'
      },

      'word-editor': {
        entry: 'word-editor'
      },

      'audio-control': {
        entry: 'audio-control'
      }
    }
  },
  use: [
    react({
      image: {
        // remove `default` when `require` image
        // due to legacy code
        esModule: false
      },
      style: {
        test: /\.(css|scss)$/,
        modulesTest: /\.module\.(css|scss)$/,
        loaders: [
          // Define loaders as objects. Note: loaders must be specified in reverse order.
          // ie: for the loaders below the actual execution order would be:
          // input file -> sass-loader -> postcss-loader -> css-loader -> style-loader/mini-css-extract-plugin
          {
            loader: 'postcss-loader',
            options: {
              plugins: [require('autoprefixer')]
            },
            useId: 'postcss'
          },
          {
            loader: 'sass-loader',
            useId: 'scss'
          }
        ]
      },
      babel: {
        presets: [
          [
            '@babel/preset-env',
            {
              /* remove targets set by neutrino web preset preferring browserslistrc */
            }
          ],
          [
            '@babel/preset-typescript',
            {
              isTSX: true,
              allExtensions: true
            }
          ]
        ],
        plugins: [
          [
            'import',
            {
              libraryName: 'antd'
            }
          ]
        ]
      }
    }),
    copy({
      patterns: [
        { context: 'assets', from: '**/*', to: 'assets', toType: 'dir' },
        {
          context: 'src/_locales/manifest',
          from: '**/*',
          to: '_locales',
          toType: 'dir'
        }
      ]
    }),
    neutrino => {
      /* eslint-disable indent */

      // avoid collision
      neutrino.config.output.jsonpFunction('saladictJSONP')

      // transform *.shadow.(css|scss) to string
      // this will be injected into shadow-dom style tag
      // prettier-ignore
      const shadowStyleRules = neutrino.config.module
        .rule('style')
          .oneOf('shadow')
            .before('normal')
            .test(/\.shadow\.(css|scss)$/)
              .use('tostring')
                .loader('to-string-loader')
                .end()
              .use('minify')
              .after('css')
                .loader('clean-css-loader')
                .options({
                  level: 1,
                })
                .end()
      // copy loaders from normal to shadow
      // prettier-ignore
      neutrino.config.module
        .rule('style')
          .oneOf('normal')
            .uses.values()
              .filter(rule => !/^(extract|style)$/.test(rule.name))
              .forEach(rule => {
                shadowStyleRules
                  .use(rule.name)
                    .loader(rule.get('loader'))
                    .options(rule.get('options'))
              })

      // prettier-ignore
      neutrino.config
        .module
          .rule('compile') // add ts extensions for babel ect
            .test(/\.(mjs|jsx|js|ts|tsx)$/)
            .end()
          .end()
        .resolve
          .extensions // typescript extensions
            .add('.ts')
            .add('.tsx')
            .end()
          .alias // '@' src alias
            .set('@', path.join(__dirname, 'src'))
            .end()
          .end()
      /* eslint-enable indent */

      if (argv.mode === 'production') {
        // prettier-ignore
        neutrino.config
          .performance
            .hints(false)
            .end()
          .plugin('momentjs')
            .use(MomentLocalesPlugin, [{ localesToKeep: ['zh-cn', 'zh-tw'] }])
            .use(DotenvPlugin)
            .end()
          .optimization
            .merge({
              splitChunks: {
                cacheGroups: {
                  dictpanel: {
                    test: /([\\/]src[\\/]content[\\/])|([\\/]components[\\/]dictionaries[\\/])|([\\/]node_modules[\\/]react)/,
                    name: 'dictpanel',
                    chunks: ({ name }) => !/^(selection|audio-control|background)$/.test(name)
                  },
                  antd: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'antd',
                    chunks: ({ name }) => /^(notebook|options|history)$/.test(name),
                    reuseExistingChunk: true
                  }
                }
              },
            })
      }

      if (argv.analyze || argv.analyse) {
        // prettier-ignore
        neutrino.config
          .plugin('bundle-analyze')
          .use(BundleAnalyzerPlugin);
      }
    },
    jest({
      testRegex: ['test/specs/.*\\.spec\\.(ts|tsx|js|jsx)'],
      setupFilesAfterEnv: ['<rootDir>/config/jest/setupTests.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
      },
      transform: {
        '\\.(mjs|jsx|js|ts|tsx)$': require.resolve(
          '@neutrinojs/jest/src/transformer'
        )
      }
    }),
    wext({
      polyfill: true
    }),
    neutrino => {
      // prettier-ignore
      neutrino.config
        .plugin('after-build')
        .use(AfterBuildPlugin);
    }
  ]
}
