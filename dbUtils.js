const mongodb = require('mongodb'),
    utils = require('./utils'),
    fs = require('fs')
require('dotenv').config()
require('colors')

const MongoClient = mongodb.MongoClient
let ObjectID = mongodb.ObjectID

async function connect(db_url) {
    return new Promise((resolve, reject) => {
        MongoClient.connect(db_url, { useNewUrlParser: true }, (err, client) => {
            if (err) {
                reject(err)
            } else {
                resolve(client)
            }
        })
    })
}

async function loadAll(db, collection) {
    return new Promise((resolve, reject) => {
        db.collection(collection).aggregate([ { $match: {} }, { $sort: { timestamp: -1 } } ]).toArray((err, data) => {
            if (err)
                reject(err)
            else
                resolve(data)
        })
    })
}

/**
 * 
 * @param {MongoDB} db 
 * @param {String} collectionName 
 * @param {Array of smth} data
 * uploads all data array to db to collection with name collectionName 
 */
async function uploadData(db, collectionName, data) {
    return new Promise((resolve, reject) => {
        if (data.length == 0) {
            resolve()
        } else {
            db.collection(collectionName).insertMany(data, err => {
                if (err) reject(err)
                else resolve()
            })
        }
    })
}

async function clearCollection(db, collection) {
    return new Promise((resolve, reject) => {
        db.collection(collection).deleteMany({}, (err, info) => {
            if (err) {
                console.log(err)
                reject()
            } else {
                resolve()
            }
        })
    })
}

const checkData = data => {
    const result = {
        ok: 0, failed: 0, feedback: []
    }
    for (let i = 0; i != data.length; ++i) {
        const validation = utils.validateRecord(data[i])
        if (validation !== null) {
            result.failed += 1
            result.feedback.push({ index: i, reason: validation })
        } else {
            result.ok += 1
        }
    }
    return result
}

const restoreFromBackup = (db_url, db_name, backupFile) => {
    return new Promise((resolve, reject) => {
        console.log('First of all we need to create special backup for information which is currently in database'.cyan)
        const fName = Date.now() + '.json'
        console.log(`It will be saved in ${fName}`.yellow)
        makeBackup(db_url, db_name, fName)
            .then(() => {
                console.log('Backup has been done successfully'.green)
                
                console.log('Now the database will be cleared'.yellow)
                connect(db_url).then(client => {
                    const db = client.db(db_name)
                    db.collection('data').deleteMany({}, (err, info) => {
                        if (err) {
                            console.log(err)
                            client.close()
                            reject()
                        } else {
                            console.log(`${info.result.n} objects was deleted`.yellow)
                            
                            const data = JSON.parse(fs.readFileSync(backupFile, 'utf-8'))
                            db.collection('data').insertMany(data, (err, res) => {
                                if (err) {
                                    console.log(err)
                                    client.close()
                                    reject()
                                } else {
                                    console.log(`Inserted ${res.insertedCount} elements`.green)
                                    client.close()
                                    resolve()
                                }
                            })

                        }
                    })

                }).catch(err => {
                    console.log(err)
                    reject()
                })
                
            })
            .catch(() => {
                console.log('Error occurred while saving backup'.red)
                reject()
            })
    })
}

async function saveToFile(fileName, obj) {
    return new Promise((resolve, reject) => {
        fs.writeFile(fileName, JSON.stringify(obj), err => {
            if (err)
                reject(err)
            else
                resolve()
        })
    })
}

async function makeBackup(db_url, db_name, collection, backupFileName) {
    let client, db
    try {
        client = await connect(db_url)
        db = client.db(db_name)
        console.log('Connected'.green)
    } catch (err) {
        console.log(err)
        return
    }
    let data
    try {
        data = await loadAll(db, collection)
        console.log(`Loaded ${data.length} elements`.green)  
    } catch (err) {
        console.log(err)
        return
    }

    try {
        saveToFile(backupFileName, data)
    } catch (err) {
        console.log(err)
        return
    }

    client.close()
    console.log('  BACKUP SAVED  '.bgGreen.black)
}

async function applyTransformToCollection(db_url, db_name, collectionName, transformation) {
    let client, db
    try {
        client = await connect(db_url)
        db = client.db(db_name)
    } catch (err) {
        if (err) console.log(err)
        return
    }
    console.log('connected'.green)
    let data
    try {
        data = await loadAll(db, collectionName)
    } catch (err) {
        console.log(err)
        client.close()
        return
    }
    console.log(`Loaded ${data.length} records`.green)

    try {
        await clearCollection(db, collectionName)
    } catch (err) {
        console.log(err)
        client.close()
        return
    }

    console.log('Collection was cleared'.magenta)

    for (let i = 0; i != data.length; ++i)
        data[i] = transformation(data[i])

    try {
        uploadData(db, collectionName, data)
    } catch (err) {
        console.log(err)
        client.close()
        return
    }

    console.log('Successfully transformed'.green)
    
    client.close()
}

let db_url = process.env.db_url.replace('<dbuser>', process.env.db_user).replace('<dbpassword>', process.env.db_password)
async function backupCollections(collections) {
    for (collection of collections) {
        await makeBackup(db_url, 'moneysaverdb', collection, `backup-${collection}.json`)
    }
}

backupCollections([ 'data', 'wallets', 'tags', 'users', 'templates' ])

// makeBackup(db_url, 'moneysaverdb', 'backup.json')
// restoreFromBackup(db_url, 'moneysaverdb', 'backup.json').then(() => {
//     console.log('  Restored  '.bgGreen.black)
//     process.exit(0)
// })

// transformCollection(db_url, 'moneysaverdb', 'data', (value) => {
//     return Object.assign({ daily: true }, value)
// }).then(() => {
//     console.log('  Transformed  '.green)
// })
