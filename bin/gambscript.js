#!/usr/bin/env node
const ncp = require('ncp').ncp
const path = require('path')
const fs = require('fs')
const { exec } = require('child_process')

const [node, script, ...args] = process.argv

/**
 * Show usage text and exit back to shell.
 */
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

/**
 * Convert ncp recursive copy function to a promise, to be used in async/await functions.
 * @param {string} origin Path of the original file to be copied.
 * @param {string} target Path where the copy will be pasted.
 * @return {Promise} The promise representing the asynchronous call to ncp.
 */
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

/**
 * Convert asynchronous function writeFile, from Node File System module, to a promise.
 * @param {string} fname The name of the file to be saved.
 * @param {string} contents The contents to be saved in the file.
 * @returns {Promise} The promise indicating the end of the process or an error.
 */
function SaveFile(fname, contents) {
  return new Promise((res, err) => {
    fs.writeFile(fname, contents, (error) => {
      if (error) {
        err(error)
      } else res(fname)
    })
  })
}

/**
 * Convert asynchronous function readFile, from Node File System module, to a promise.
 * @param {string} fname The path and name of the file to be read
 * @returns {Promise} The Promise containing read data or an error.
 */
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

/**
 * Execute a shell command asynchronously.
 * @param {string} command The shell command to be executed.
 * @returns {Promise} The promise containing success output or error.
 */
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

/**
 * Execute Gambit-C transpilation from Scheme to Javascript on "module" and save transpiled module on "outdir".
 * @param {string} module The path of Scheme module directory to be transpiled
 * @param {string} outdir The path of the directory where the transpiled module will reside, after its generation.
 */
async function transpile(module, outdir) {
  // The number of concurrent file copies allowed when using ncp:
  ncp.limit = 4

  // Start the transpilation process. Any error the procedure will be interupted (by an exception raise)
  try {
    // This is the GSC compilation command call
    // The (##include"~~lib/header.scm") has been moved to lib.scm, otherwise, the entire project stops working.
    const gsc =
      'gsc -prelude "(define-cond-expand-feature|enable-type-checking|)(define-cond-expand-feature|disable-auto-forcing|)' +
      '(define-cond-expand-feature| disable-sharp-dot|)(define-cond-expand-feature| disable-bignum|)' +
      '(define-cond-expand-feature| disable-ratnum|)(define-cond-expand-feature| disable-cpxnum|)' +
      '(define-cond-expand-feature|disable-smp|)" -target js '

    // Variable defining where to build intermediary files (buildPackageName):
    const buildPackageName = path.join(process.cwd(), '.gambscript', outdir, module)
    // The output directory for the final Javascript module:
    const outputDirectory = path.join(process.cwd(), outdir)
    // The final javascript module name:
    const packageName = path.join(outputDirectory, module + '.js')
    // The source directory where to look for standard Scheme libraries and scripts for Gambscript:
    const sourceName = path.join(path.dirname(__dirname), 'scheme')

    // Create the build package directory if it doesn't exist:
    if (!fs.existsSync(buildPackageName)) {
      fs.mkdirSync(buildPackageName, { recursive: true })
    }

    // Create the output directory if it doesn't exist:
    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true })
    }

    // Create the module directory, if the module name isn't a single file name,
    // but a path, with intermediary directories:
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

    //
    // Start transpilation process here:
    //
    console.log('Building the application...')
    // Build the app.scm file, in the module passed as parameter, calling the GSC command declared above:
    await Exec(
      `${gsc} -o ${path.join(buildPackageName, 'app.js')} -c ${path.join(module, 'app.scm')}`
    )
    console.log()

    console.log('Building the default library...')
    // Build the scheme/lib.scm library, present in the "scheme" folder of this project:
    process.chdir(path.join(path.dirname(__dirname), 'scheme'))
    await Exec(
      `${gsc} -o ${path.join(buildPackageName, 'lib.js')} -c ${path.join(sourceName, 'lib.scm')}`
    )
    console.log()

    console.log('Linking the application...')
    // Link the app.scm output (app.js) and the compiled lib (lib.js)
    process.chdir(path.join(buildPackageName))
    await Exec(`${gsc} -link -l lib app.js`)
    console.log()

    //
    // Start transpilation post-process, to compatibilize Gambit JS script to CommonJS, treatable by Webpack.
    //

    // Load the javascript utils functions (from scheme/__javascript-support/utils.js file
    const utils = await ReadFile(path.join(sourceName, '__javascript-support', 'utils.js'))

    // Load the Javascript fragments generated by the linking process:
    const app_ = await ReadFile(path.join(buildPackageName, 'app_.js'))
    const lib = await ReadFile(path.join(buildPackageName, 'lib.js'))
    const app = await ReadFile(path.join(buildPackageName, 'app.js'))

    // Merge all Javascript fragments into a single big string, representing the entire module:
    const linkedApplication = `${app_}\n${lib}\n${app}`

    // Create the variables to handle variable declarations and function redeclarations:
    const readFunctions = new Set([])
    const readvariables = new Set([])

    // Regexen to identify non declared global functions:
    const globalFunction = /^(([a-zA-Z0-9_]+)\s+=\s+function).*$/

    // and non declared global variables:
    const globalVariable = /^([a-zA-Z0-9_]+)\s+=.*$/

    // Regex to identify Javascript CommonJS imports (that using the "require" keyword)
    const requirement = /^\s*\/\*\*\*GAMBSCRIPT-REQUIRE\*\*\*\/(.*)\/\*\*\*GAMBSCRIPT-REQUIRE\*\*\*\/\s*$/

    // Set to store the requirements declared in Scheme scripts. It's a set to avoid duplication of imports/requires,
    // which can lead to Javascript compilation errors:
    const requirements = new Set([])

    // Variable to store the postprocessed Javascript script, now compatible with CommonJS and Webpack:
    let processedLinkedApplication = ''

    //
    // Process line to line the linked application.
    //
    // This algorithm is O(n) complexity, where n is the number of lines in the linked application.
    // Each line is processed to math by "globalFunction", "globalVariable" and "requirement" regexen.
    //
    // Since regexen are implemented as State-Machine automaton, which are O(m) complex, m being the
    // number of characters in the string, and the number of matches peformed is four, at most, the
    // complexity of each line processing is O(4*m).
    //
    // Since each line processed has complexity O(4*m) and the loop has complexity O(n), the overall
    // complexity of post-processing is O(n * 4 * m) = O(4*n*m) = O(n*m) = O(c), where c is the total
    // number of caracters in the entire linkedApplication.
    //
    // Since the overall complexity of this algorithm is linear, it's an optimized post processor, with very
    // good performance.
    //

    // Loop on each line of linked application, and get each line for further processing:>
    linkedApplication.split('\n').forEach((l) => {
      const matchFunction = l.match(globalFunction)
      // Starting verifing if a global function has been declared.
      // A global function, on Gambit-C compiler output, takes the form of "g_xxxx = function (....)"
      // The postprocessing change this form to "function g_xxxx(...)", which is canonical to Javascript and
      // better accepted by Webpack and any ES6 code processors.
      if (matchFunction) {
        const functionName = matchFunction[2]
        // IF the global function is found, verify if it's alread declared
        if (!readFunctions.has(functionName)) {
          // If not, add the found function to the read functions
          readFunctions.add(functionName)
          // And adjust its declaration:
          processedLinkedApplication +=
            `function ${functionName} ` + l.replace(/^[a-zA-Z0-9_]+\s+=\s+function/, '') + '\n'
        } else {
          // Ignore variable if it's alread read:
          processedLinkedApplication += l + '\n'
        }
      } else {
        const matchVariable = l.match(globalVariable)
        // Now verifies if a global variable has been declared.
        // Gambit-C Javascript transpile doesn't declare the global variables, it just assign them. Although
        // this is valid Javascript, it's not STRICT Javascript, since Strict Javascript requires all variables
        // to be declared. So, if a global variable is assigned, This code verifies if the variable has been
        // previously declared. If not, it declares it
        if (matchVariable) {
          // Found the variable here.
          const variableName = matchVariable[1]
          // Verify if the variable is already declared
          if (!readvariables.has(variableName)) {
            // If not, add the found varaible to the list of read variables
            readvariables.add(variableName)
            // Add declaration symbol to the variable
            processedLinkedApplication += 'var ' + l + '\n'
          } else {
            // Ignore variable if it's alread read:
            processedLinkedApplication += l + '\n'
          }
        } else {
          // The g_host2scm and g_scm2host throws exception if a type of datum is not known in the conversion.
          // This exception can break the code in unexpected ways. A more palatable aproach is just return the raw
          // variable to Scheme, from Javascript, or to Javascript, from Scheme. This behavior is fundamental to
          // the proper call of Javascript functions from Javascript objects in Scheme code (the !xa, !sa macros,
          // for example). The next four lines search for the undesirable exception raises and replace them by an
          // object return to caller.
          const throwMatch = /throw ".*"/
          const throwMatchVariable = l.match(throwMatch)
          if (throwMatchVariable) {
            processedLinkedApplication += 'return obj;\n'
          } else {
            // As a last action, the script looks for "require" declarations in code (by the macro !js-require),
            // collect them, and remove them from the postprocessed code.
            // The collected requires will be added to the start of the Javascript Module, to be handled by Webpack
            // properly:
            const requirementMatchVariable = l.match(requirement)
            if (requirementMatchVariable) {
              requirements.add(requirementMatchVariable[1])
              processedLinkedApplication += '\n'
            } else {
              processedLinkedApplication += l + '\n'
            }
          }
        }
      }
    })

    // Add two constants to turn inline Javascript code more readable:
    processedLinkedApplication += '\nconst P = g_scm2host;'
    processedLinkedApplication += '\nconst R = g_host2scm;\n'

    // Save the postprocessed module as an "index.js" file, in the temporary module folder:
    await SaveFile(
      path.join(buildPackageName, 'index.js'),
      [...requirements].join('\n') + '\n\n\n' + utils + '\n\n\n' + processedLinkedApplication
    )
    console.log('Finished building scheme Module.\n')

    // Now, copy the index.js module from the temporary module folder to its final place in the project:
    await Copy(path.join(buildPackageName, 'index.js'), packageName)
    console.log(`Finished releasing new generated module: ${packageName}\n`)
  } catch (e) {
    // Just present to standard output the raised error:
    console.log('Gambscript transpilation error: ', e)
  }
}

/**
 * Create a Scheme module from a name
 * @param {string} module The module name or complete path
 */
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

      // Set the default import default-macros.scm in the generated app.scm file. The path to this
      // file must be tweaked in accord to the full path of the generated module.
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

//
// The next lines execute the commands chosen by the user:
//
if (command == 'create') {
  create(moduleName)
} else if (command == 'transpile') {
  transpile(moduleName, outputDirectory)
} else {
  console.log('Unexpected error.')
  process.exit(-1)
}
