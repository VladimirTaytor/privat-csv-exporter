const Papaparse = require("papaparse")
const path = require("path")
const fs = require("fs")
const clipboardy = require('clipboardy')
const iconv = require('iconv-lite');

const cwd = process.cwd()

const files = process.argv.slice(2) || []

const config_path = process.env.CONFIG_PATH

const config = config_path ? readConfigFile() : require('./default_config.json')

const WITH_FILTERING = config.withFiltering
const ENCODING = config.sourceEncoding

function readConfigFile() {
  const customConfig = fs.readFileSync(config_path,'utf-8')
  return JSON.parse(customConfig)
}

function readFiles(files) {
  return files.map(fileName => {
    const filePath = path.join(cwd, fileName)
    console.log(`Reading file: ${filePath}`)
    return iconv.decode(fs.readFileSync(filePath), ENCODING).toString()
  })
}

function parseCsv(csvString, skipHeaders = false) {
  return new Promise(resolve => {
    Papaparse.parse(csvString, {
      config: {
        skipEmptyLines: true,
      },
      complete: ({data}) => {
        const [headers, ...rows] = data
        const requiredFields = config.requiredFields || []
        let filteredHeaders = []
        let filteredRows = []

        for (let i = 0; i < headers.length; i++) {
          const header = WITH_FILTERING ?
            requiredFields.find(field => field.name === headers[i]) :
            {
              name: headers[i],
              exportedName: headers[i]
            }

          if (header) {
            filteredHeaders.push(header.exportedName)

            for (let j = 0; j < rows.length; j++) {
              const value = rows[j][i]
              if (!value) continue
              if (!filteredRows[j]) filteredRows[j] = []
              filteredRows[j].push(rows[j][i])
            }
          }
        }

        const toCSV = skipHeaders ? filteredRows : [filteredHeaders, ...filteredRows]
        const results = Papaparse.unparse(toCSV)

        return resolve(results)
      }
    })
  })
}

function store(data) {
  if (config.importToClipboard)
    clipboardy.writeSync(data)
  if (config.importToFile)
    fs.writeFileSync('result.csv', data)
}

function processImport() {
  const csvStrings = readFiles(files)

  const firstString = csvStrings.shift()
  const processes = [parseCsv(firstString), ...csvStrings.map(csvString => parseCsv(csvString, true))]

  return Promise.all(processes)
    .then(processedData => {
      const data = processedData.join('\n')
      return store(data)
    })
}

processImport()



