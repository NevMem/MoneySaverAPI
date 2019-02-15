const fs = require('fs')
require('colors')

const MAX_BUFFER_SIZE = 128

let buffer = { visits: [] }

function flush() { // TODO: make it faster
    let stats = { visits: [] }
    try {
        let fromFile = fs.readFileSync('stats.json', 'utf-8')
        let fromFileJSON = JSON.parse(fromFile)
        stats = fromFileJSON
    } catch (err) {
        console.log(err)
    }
    stats.visits.push(...buffer.visits)
    try {
        fs.writeFileSync('stats.json', JSON.stringify(stats), 'utf-8')
        buffer.visits = []
    } catch (err) {
        console.log(err)
    }
}

function visit(time, method, url, userIP) {
    buffer.visits.push({
        time, method, url, userIP
    })
    if (buffer.visits.length == MAX_BUFFER_SIZE)
        flush()
}

/* exports */
exports.visit = visit
exports.flush = flush