const mongodb = require('mongodb'), 
    jwt = require('jsonwebtoken'), 
    fs = require('fs'),
    utils = require('./utils')
require('dotenv').config()
require('colors')

const MongoClient = mongodb.MongoClient
let ObjectID = mongodb.ObjectID
let db_url = process.env.db_url.replace('<dbuser>', process.env.db_user).replace('<dbpassword>', process.env.db_password)

let db = undefined

async function checkToken(token, login) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, process.env.jwt_secret, (err, decoded) => {
            if (err) reject('token is invalid')
            else {
                if (decoded.login === login)
                    resolve()
                else reject('token is invalid')
            }
        })
    })
}

exports.connect = () => {
    return new Promise((resolve, reject) => {
        MongoClient.connect(db_url, { useNewUrlParser: true }, (err, client) => {
            if (err) {
                reject(err)
            } else {
                db = client.db(process.env.db_name)
                resolve()
            }
        })
    })
}

exports.get_data = (user_token, login) => {
    console.log('Start loading data')
    let startTime = Date.now()
    return new Promise((resolve, reject) => {
        db.collection('data').aggregate([ { $match: { login: login } }, { $sort: { timestamp: -1 } } ]).toArray((err, data) => {
            console.log(('Loading from MongoDB consumed: ' + (Date.now() - startTime) + ' ms').cyan)
            if (err) {
                reject(err)
            } else {
                resolve(data)
            }
        })
    })
}

exports.add = (token, login, date, name, wallet, value, tags, daily) => {
    if (date) {
        date.minute = parseInt(date.minute)
        date.hour = parseInt(date.hour)
        date.day = parseInt(date.day)
        date.month = parseInt(date.month)
        date.year = parseInt(date.year)
    } else {
        /**
         * If date is not specified date will be filled from current time
         */
        let current = new Date
        date = {
            year: current.getFullYear(), 
            month: current.getMonth() + 1, 
            day: current.getDate(), 
            hour: current.getHours(), 
            minute: current.getMinutes()
        }
        console.log('Date was set as current time'.red)
    }

    let timestamp = date.minute + date.hour * 60 + date.day * 24 * 60 + date.month * 31 * 24 * 60 + date.year * 12 * 31 * 24 * 60
    if (value > 0)
        value = -value
    return new Promise((resolve, reject) => {
        db.collection('data').insert({ 
            login: login, 
            date: date, 
            name: name, 
            wallet: wallet, 
            value: value, 
            timestamp: timestamp, 
            tags: tags,
            daily: daily
        }).then(data => {
            resolve('ok')
        })
        .catch(err => {
            reject(err)
        })
    })
}

exports.remove = (token, login, record_id) => {
    return new Promise((resolve, reject) => {
        db.collection('data').deleteOne({ login: login, _id: new ObjectID(record_id) }).then(data => {
            if (data.result.n == 1) {
                resolve({ type: 'ok' })
            } else {
                reject({ type: 'error', error: 'element was not found' })    
            }
        }).catch(err => {
            reject(err)
        })
    })
}

function getUserTags(db, login) {
    return new Promise((resolve, reject) => {
        db.collection('tags').find({ owner: login }).toArray((err, data) => {
            if (err) {
                reject(err)
            } else {
                resolve(data.map(elem => elem.tagName))
            }
        })
    })
}

exports.tags = (token, login) => {
    return new Promise((resolve, reject) => {
        checkToken(token, login)
            .then(() => getUserTags(db, login))
            .then((data) => {
                resolve(data)
            })
            .catch(err => {
                console.log(err)
                reject(err)
            })
    })
}

function addWallet(db, login, walletName) {
    return new Promise((resolve, reject) => {
        if (typeof(walletName) !== 'string' || walletName.length == 0) {
            reject('invalid wallet name')
        } else {
            db.collection('wallets').insertOne({ owner: login, tagName: walletName }, (err, data) => {
                if (err) {
                    console.log(err)
                    reject('Error happened, please try later')
                } else {
                    if (data.result.n === data.result.ok) {
                        resolve('Your tag was successfully created')
                    } else {
                        reject('Something went wrong, please try later')
                    }
                }
            })
        }
    })
}

exports.addWallet = (token, login, walletName) => {
    return new Promise((resolve, reject) => {
        checkToken(token, login)
            .then(() => {
                return addWallet(db, login, walletName)
            })
            .then(data => {
                resolve(data)
            })
            .catch(err => {
                reject(err)
            })
    })    
}

function getUserWallets(db, login) {
    return new Promise((resolve, reject) => {
        db.collection('wallets')
            .find({ owner: login })
            .toArray((err, data) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(data.map(elem => elem.walletName))
                }
            })
    })
}

exports.wallets = (token, login) => {
    return new Promise((resolve, reject) => {
        checkToken(token, login)
            .then(() => getUserWallets(db, login))
            .then(data => {
                resolve(data)
            })
            .catch(err => {
                console.log(err)
                reject()
            })
    })
}

function addTag(db, login, tagName) {
    return new Promise((resolve, reject) => {
        if (typeof(tagName) !== 'string' || tagName.length == 0) {
            reject('invalid tag name')
        } else {
            db.collection('tags').insertOne({ owner: login, tagName: tagName }, (err, data) => {
                if (err) {
                    console.log(err)
                    reject('Error happened, please try later')
                } else {
                    if (data.result.n === data.result.ok) {
                        resolve('Your tag was successfully created')
                    } else {
                        reject('Something went wrong, please try later')
                    }
                }
            })
        }
    })
}

exports.addTag = (token, login, tagName) => {
    return new Promise((resolve, reject) => {
        checkToken(token, login)
            .then(() => {
                return addTag(db, login, tagName)
            })
            .then(data => {
                resolve(data)
            })
            .catch(err => {
                reject(err)
            })
    })    
}

function addTemplate(db, login, template) {
    return new Promise((resolve, reject) => {
        db.collection('templates').insertOne({ owner: login, content: template })
            .then(info => {
                if (info.result.ok === 1)
                    resolve()
                else
                    reject('Error occurred, please try later')
            })
            .catch(err => {
                reject(err + '')
            })
    })
}

exports.createTemplate = (token, login, template) => {
    return new Promise((resolve, reject) => {
        checkToken(token, login)
            .then(() => {
                return addTemplate(db, login, template)
            })
            .then(() => resolve())
            .catch(err => reject(err))
    })
}

function getUserTemplates(db, login) {
    return new Promise((resolve, reject) => {
        db.collection('templates').find({ owner: login }).toArray((err, data) => {
            if (err != null) {
                reject(err)
            } else {
                resolve(data.map(el => { return { ...el.content, id: el._id } }))
            }
        })
    })
}

exports.templates = (token, login) => {
    return new Promise((resolve, reject) => {
        checkToken(token, login)
            .then(() => getUserTemplates(db, login))
            .then((data) => {
                resolve(data)
            })
            .catch(err => {
                reject(err)
            })
    })
}

const loadTemplate = (templateId) => {
    return new Promise((resolve, reject) => {
        if (templateId === undefined) reject('template id cannot be empty')
        else {
            let id
            try {
                id = new ObjectID(templateId)
            } catch (err) {
                reject('template id is invalid')
                return
            }
            db.collection('templates').findOne({ _id: id })
                .then(data => {
                    if (!data) {
                        reject('template not found')
                    } else {
                        resolve(data)
                    }
                })
        }
    })
}

const generateTimeStamp = (date) => date.minute + date.hour * 60 + date.day * 24 * 60 + date.month * 31 * 24 * 60 + date.year * 12 * 31 * 24 * 60

exports.useTemplate = (token, login, templateId, date) => {
    return new Promise((resolve, reject) => {
        checkToken(token, login)
            .then(() => loadTemplate(templateId))
            .then(template => {
                if (template.owner !== login) {
                    reject('Template not found')
                } else {
                    let record = Object.assign(template.content,
                        { date: date, timestamp: generateTimeStamp(date) },
                        { login: login, daily: true })
                    record.value = -record.value
                    const validation = utils.validateRecord(record)
                    if (validation !== null) {
                        reject(validation)
                    } else {
                        return db.collection('data').insertOne(record)
                    }
                }
            })
            .then(data => {
                if (data.result.ok == 1) {
                    resolve('Template was successfully used')
                } else {
                    reject('Erorr occured, please try later')
                }
            })
            .catch(err => reject(err))
    })
}

exports.removeTemplate = (token, login, templateId) => {
    return new Promise((resolve, reject) => {
        if (templateId === undefined) {
            reject('Template id cannot be empty')
            return
        }
        let id
        try {
            id = new ObjectID(templateId)            
        } catch (err) {
            reject('Template id is invalid')
            return
        }
        checkToken(token, login)
            .then(() => {
                return db.collection('templates').deleteOne({ owner: login, _id: id })
            })
            .then(data => {
                if (data.result.n == 1)
                    resolve('Template was successfully removed')
                else
                    reject('We can\'t find this template, please contact us for more information')
            })
            .catch(err => reject(err))
    })
}

exports.edit = (token, login, id, date, name, wallet, value, tags, daily) => {
    date.minute = parseInt(date.minute)
    date.hour = parseInt(date.hour)
    date.day = parseInt(date.day)
    date.month = parseInt(date.month)
    date.year = parseInt(date.year)
    let timestamp = date.minute + date.hour * 60 + date.day * 24 * 60 + date.month * 31 * 24 * 60 + date.year * 12 * 31 * 24 * 60
    return new Promise((resolve, reject) => {
        db.collection('data').updateOne({_id: new ObjectID(id)}, { $set: {
            login: login, 
            date: date, 
            name: name, 
            wallet: wallet, 
            value: value, 
            timestamp: timestamp, 
            tags: tags,
            daily: daily
        }}).then(data => {
            resolve('edited')
        }).catch(err => {
            console.log(err)
            reject(err)
        })
    })
}

exports.login = ( login, password ) => {
    return new Promise((resolve, reject) => {
        db.collection('users').find({ login: login }).toArray((err, response) => {
            if (err) {
                console.log(err)
                reject('Sever error')
            } else {
                if (response.length >= 2) {
                    console.log('Corrupted database'.red)
                    reject('Error occured please connect us')
                } else {
                    if (response.length == 0) {
                        reject('User not found')
                    } else {
                        if (response[0].password === password) {
                            let token = jwt.sign({ login: login, first_name: response[0].first_name, last_name: response[0].last_name }, process.env.jwt_secret)
                            resolve({ token: token, login: login, first_name: response[0].first_name, last_name: response[0].last_name })
                        } else {
                            reject('Wrong login or password')
                        }
                    }
                }
            }
        })
    })
}

clearAll = () => {
    console.log('Droping table')
    return new Promise((resolve, reject) => {
        db.collection('data').deleteMany({}).then(data => {
            console.log(data.result.n + ' rows was deleted')
            resolve()
        })
    })
}
