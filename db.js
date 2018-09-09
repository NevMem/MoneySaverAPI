const mongodb = require('mongodb'), 
    jwt = require('jsonwebtoken'), 
    fs = require('fs')
require('dotenv').config()

const MongoClient = mongodb.MongoClient
let ObjectID = mongodb.ObjectID
let db_url = process.env.db_url.replace('<dbuser>', process.env.db_user).replace('<dbpassword>', process.env.db_password)

let db = undefined

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
    return new Promise((resolve, reject) => {
        db.collection('data').aggregate([ { $match: { login: login } }, { $sort: { timestamp: -1 } } ]).toArray((err, data) => {
            if (err) {
                reject(err)
            } else {
                resolve(data)
            }
        })
    })
}

exports.add = (token, login, date, name, wallet, value, tags) => {
    let timestamp = date.minute + date.hour * 60 + date.day * 24 * 60 + date.month * 31 * 24 * 60 + date.year * 12 * 31 * 24 * 60
    return new Promise((resolve, reject) => {
        db.collection('data').insert({ login: login, date: date, name: name, wallet: wallet, value: value, timestamp: timestamp, tags: tags }).then(data => {
            console.log(data)
            resolve('ok')
        })
        .catch(err => {
            reject(err)
        })
    })
}

exports.remove = (token, login, record_id) => {
    return new Promise((resolve, reject) => {
        console.log(record_id)
        console.log(token, login)
        db.collection('data').deleteOne({ login: login, _id: new ObjectID(record_id) }).then(data => {
            if (data.result.n == 1) {
                resolve('ok')
            } else {
                reject('element was not found')    
            }
        }).catch(err => {
            reject(err)
        })
    })
}

exports.login = ( login, password ) => {
    return new Promise((resolve, reject) => {
        db.collection('users').find({ login: login }).toArray((err, response) => {
            if (err) {
                reject(err)
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

fillDefault = () => {
    return new Promise((resolve, reject) => {
        let data = JSON.parse(fs.readFileSync('start.json', 'utf-8'))
        console.log(data.length)
        db.collection('data').insertMany(data).then(res => {
            console.log(res.result.n + ' was inserted')
            resolve()
        })
    })
}

exports.debug = () => {
    clearAll().then(() => {
        return fillDefault()
    }).then(() => {
        console.log('here')
    })
}