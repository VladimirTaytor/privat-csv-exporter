const Papaparse = require("papaparse")
const fs = require("fs")

const args = process.argv.slice(2) || ['']

const filename = args
const data = fs.readFileSync('./uah_utf.csv', 'utf-8')

const WITH_FILTERING = false

Papaparse.parse(data, {
  config: {
    skipEmptyLines: true,
  },
  complete: ({data}) => {
    const [headers, ...rows] = data
    const requiredFields = [
      {
        name: 'Счет',
        exportedName: 'Account'
      },
      {
        name: 'Номер документа',
        exportedName: 'Check #'
      },
      {
        name: 'Дата операции',
        exportedName: 'Date'
      },
      {
        name: 'Корреспондент',
        exportedName: 'Payee'
      },
      {
        name: 'Сумма',
        exportedName: 'Amount'
      },
      {
        name: 'Назначение платежа',
        exportedName: 'Memo'
      }
    ]
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

    const toCSV = [filteredHeaders, ...filteredRows]

    const results = Papaparse.unparse(toCSV)

    fs.writeFileSync('./new_data.csv', results)
  }
})



