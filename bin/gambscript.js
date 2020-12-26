#!/usr/bin/env node
const ncp = require('ncp').ncp
const path = require('path')
const fs = require('fs')
const { exec } = require('child_process')

const [node, script, ...args] = process.argv

function usage() {
  console.log('Usage: ')
  console.log('\t[npx ]gambscript create <module-name>')
  console.log('\t[npx ]gambscript transpile <module-name> [<output-directory>]')
  console.log('\nThe default <output-directory> value is "./src"\n\n')
  process.exit(0)
}

if (args.length < 2) {
  console.log('Module name is missing.\n')
  usage()
}

const command = args[0]
if (command != 'create' && command != 'transpile') {
  console.log('Invalid command name. Use "create" or "transpile.\n')
  usage()
}

const moduleName = args[1]
if (typeof moduleName != 'string') {
  console.log('Invalid module name. It must be a readable string.\n')
  usage()
}

if (moduleName.trim().length === 0) {
  console.log("Invalid module name. It can't be empty.\n")
  usage()
}

const outputDirectory = (() => {
  if (command == 'transpile') {
    if (args.length > 3) {
      usage()
    }

    if (args.length === 2) {
      return 'src'
    }

    return args[2]
  }

  return '<irrelevant>'
})()

const referenceDirectory = process.env['BUILD_REFERENCE_DIRECTORY']
  ? process.env['BUILD_REFERENCE_DIRECTORY']
  : __dirname

function Copy(origin, target) {
  return new Promise((res, err) => {
    ncp(origin, target, function (e) {
      if (e) {
        err(e)
      } else {
        res(target)
      }
    })
  })
}

function SaveFile(fname, contents) {
  return new Promise((res, err) => {
    fs.writeFile(fname, contents, (error) => {
      if (error) {
        err(error)
      } else res(fname)
    })
  })
}

function ReadFile(fname) {
  return new Promise((res, err) => {
    fs.readFile(fname, 'utf8', (error, data) => {
      if (error) {
        err(error)
      } else {
        res(data)
      }
    })
  })
}

function Exec(command) {
  console.log(command)
  return new Promise((res, err) => {
    exec(command, (error, stdout, stderr) => {
      console.log(stdout)
      console.log(stderr)
      if (error) {
        err(error)
      } else {
        res({ stdout, stderr })
      }
    })
  })
}

async function transpile(module, outdir) {
  ncp.limit = 4
  try {
    // The (##include"~~lib/header.scm") has been moved to lib.scm, otherwise, the entire project stops working.
    const gsc =
      'gsc -prelude "(define-cond-expand-feature|enable-type-checking|)(define-cond-expand-feature|disable-auto-forcing|)' +
      '(define-cond-expand-feature| disable-sharp-dot|)(define-cond-expand-feature| disable-bignum|)' +
      '(define-cond-expand-feature| disable-ratnum|)(define-cond-expand-feature| disable-cpxnum|)' +
      '(define-cond-expand-feature|disable-smp|)" -target js '

    const buildPackageName = path.join(process.cwd(), '.gambscript', outdir, module)
    const outputDirectory = path.join(process.cwd(), outdir)
    const packageName = path.join(outputDirectory, module + '.js')
    const sourceName = path.join(path.dirname(__dirname), 'scheme')
    if (!fs.existsSync(buildPackageName)) {
      fs.mkdirSync(buildPackageName, { recursive: true })
    }
    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true })
    }
    if (
      module.split(path.sep).length > 0 ||
      module.split('\\').length > 0 ||
      module.split('/').length > 0
    ) {
      let dirname = path.join(outputDirectory, path.dirname(module))
      if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true })
      }
    }

    console.log('Building the application...')
    await Exec(
      `${gsc} -o ${path.join(buildPackageName, 'app.js')} -c ${path.join(module, 'app.scm')}`
    )
    console.log()

    console.log('Building the default library...')
    process.chdir(path.join(path.dirname(__dirname), 'scheme'))
    await Exec(
      `${gsc} -o ${path.join(buildPackageName, 'lib.js')} -c ${path.join(sourceName, 'lib.scm')}`
    )
    console.log()

    console.log('Linking the application...')
    process.chdir(path.join(buildPackageName))
    await Exec(`${gsc} -link -l lib app.js`)
    console.log()

    const utils = await ReadFile(path.join(sourceName, '__javascript-support', 'utils.js'))

    const app_ = await ReadFile(path.join(buildPackageName, 'app_.js'))
    const lib = await ReadFile(path.join(buildPackageName, 'lib.js'))
    const app = await ReadFile(path.join(buildPackageName, 'app.js'))
    const linkedApplication = `${app_}\n${lib}\n${app}`
    const readFunctions = new Set([])
    const readvariables = new Set([])
    const globalFunction = /^(([a-zA-Z0-9_]+)\s+=\s+function).*$/
    const globalVariable = /^([a-zA-Z0-9_]+)\s+=.*$/
    const requirement = /^\s*\/\*\*\*GAMBSCRIPT-REQUIRE\*\*\*\/(.*)\/\*\*\*GAMBSCRIPT-REQUIRE\*\*\*\/\s*$/
    const requirements = []
    let processedLinkedApplication = ''

    linkedApplication.split('\n').forEach((l) => {
      const matchFunction = l.match(globalFunction)
      if (matchFunction) {
        const functionName = matchFunction[2]
        if (!readFunctions.has(functionName)) {
          readFunctions.add(functionName)
          processedLinkedApplication +=
            `function ${functionName} ` + l.replace(/^[a-zA-Z0-9_]+\s+=\s+function/, '') + '\n'
        }
      } else {
        const matchVariable = l.match(globalVariable)
        if (matchVariable) {
          const variableName = matchVariable[1]
          if (!readvariables.has(variableName)) {
            processedLinkedApplication += 'var ' + l + '\n'
          } else {
            processedLinkedApplication += l + '\n'
          }
        } else {
          const throwMatch = /throw ".*"/
          const throwMatchVariable = l.match(throwMatch)
          if (throwMatchVariable) {
            processedLinkedApplication += 'return obj;\n'
          } else {
            const requirementMatchVariable = l.match(requirement)
            if (requirementMatchVariable) {
              requirements.push(requirementMatchVariable[1])
              processedLinkedApplication += '\n'
            } else {
              processedLinkedApplication += l + '\n'
            }
          }
        }
      }
    })
    processedLinkedApplication += '\nconst P = g_scm2host;'
    processedLinkedApplication += '\nconst R = g_host2scm;\n'
    await SaveFile(
      path.join(buildPackageName, 'index.js'),
      requirements.join('\n') + '\n\n\n' + utils + '\n\n\n' + processedLinkedApplication
    )
    console.log('Finished building scheme Module.\n')

    await Copy(path.join(buildPackageName, 'index.js'), packageName)
    console.log(`Finished releasing new generated module: ${packageName}\n`)
  } catch (e) {
    console.log('CSS and JAVASCRIPT preprocessor error: ', e)
  }
}

async function create(module) {
  if (fs.existsSync(module)) {
    console.log(`Unable to create module "${module}". Directory exists.`)
    process.exit(-2)
  } else {
    // Create module directory:
    fs.mkdirSync(module, { recursive: true })

    try {
      // Copy template files:
      const schemeFileDirectory = path.join(path.dirname(__dirname), 'scheme')
      const appModel = await ReadFile(path.join(schemeFileDirectory, 'app-model.scm'))
      let appContents = ''
      let head = ['..']
      if (module.split(path.sep).length > 1) {
        head = [...new Array(module.split(path.sep).length).keys()].map(() => '..')
      } else if (module.split('/').length > 1) {
        head = [...new Array(module.split('/').length).keys()].map(() => '..')
      } else if (module.split('\\').length > 1) {
        head = [...new Array(module.split('\\').length), keys()].map(() => '..')
      }

      appModel.split('\n').forEach((l) => {
        appContents +=
          l.replace(
            '***DEFAULT-MACROS-PATH***',
            head.join('/') + '/node_modules/gambscript/scheme/default-macros.scm'
          ) + '\n'
      })
      await SaveFile(path.join(module, 'app.scm'), appContents)
    } catch (error) {
      console.log('Error creating module: ', error.message)
      process.exit(-3)
    }
  }
}

if (command == 'create') {
  create(moduleName)
} else if (command == 'transpile') {
  transpile(moduleName, outputDirectory)
} else {
  console.log('Unexpected error.')
  process.exit(-1)
}
