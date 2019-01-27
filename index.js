const express = require('express'), 
    mongodb = require('mongodb'), 
    bParser = require('body-parser'), 
    jwt = require('jsonwebtoken'), 
    db = require('./db'),
    utils = require('./utils')

require('colors')
require('dotenv').config()

const defaultTags = [ 'Еда', 'Транспорт', 'Медиа', 'Проживание', 'Электроника', 'Одежда', 'Линзы', 'Посуда', 'Химия', 'Связь', 'Разное' ]
const defaultWallets = [ 'Наличные', 'Сбербанк', 'ВТБ', 'АкБарс' ]

db.connect().then(() => {
    let app = express()

    app.use(bParser.json())
    app.use(bParser.urlencoded({ extended: true }))

    app.use((req, res, next) => {
        console.log((`[${Date()}] ${req.method} ${req.url}`).cyan)

        next()
    })

    app.use(express.static(__dirname + '/public'))

    app.post('/api/login', (req, res) => {
        let login = req.body.login, password = req.body.password
        console.log(('Try to log in with login: ' + login + ' password: ' + '---//---').cyan)
        
        db.login(login, password)
        .then(response => {
            res.send(response)
        })
        .catch(err => {
            console.log(err)
            res.send({ err: err })
        })
    })

    app.post('/api/edit', (req, res) => {
        let token = req.body.token, 
            date = req.body.date, 
            name = req.body.name, 
            value = req.body.value, 
            wallet = req.body.wallet, 
            login = req.body.login, 
            tags = req.body.tags, 
            id = req.body.id
        db.edit(token, login, id, date, name, wallet, value, tags)
        .then(data => {
            if (data.err) {
                res.send({ err: data.err })
            } else {
                res.send({ msg: data })
            }
        }).catch(err => {
            console.log(err)
            res.send({ err: err })
        })
    })

    const getTags = (req, res) => {
        let { token, login } = req.body
        res.send(defaultTags)
    }

    app.post('/api/tags', (req, res) => getTags(req, res))
    app.get('/api/tags', (req, res) => getTags(req, res))

    const getWallets = (req, res) => {
        res.send(defaultWallets)
    }

    app.post('/api/wallets', (req, res) => getWallets(req, res))
    app.get('/api/wallets', (req, res) => getWallets(req, res))

    app.post('/api/add', (req, res) => {
        let token = req.body.token, 
            date = req.body.date, 
            name = req.body.name, 
            value = req.body.value, 
            wallet = req.body.wallet, 
            login = req.body.login, 
            tags = req.body.tags

        if (token) {
            jwt.verify(token, process.env.jwt_secret, (err, decoded) => {
                if (err) {
                    res.send({ err: 'Token is ivalid or empty. Please relogin' })
                } else {
                    console.log(decoded)
                    db.add(token, login, date, name, wallet, value, tags)
                    .then(data => {
                        res.send({ data })
                    })
                    .catch(err => {
                        res.send({ err: err })
                    })
                }
            })
        } else {
            res.send({ err: 'Token is ivalid or empty. Please relogin' })
        }
    })

    const analyze = (data) => {
        let info = {
            sum: 0,
            amountOfDays: 0,
            average: 0,
        }

        for (let i = 0; i != data.length; ++i) {
            info.sum += Math.abs(data[i].value)
        }

        let differentDays = new Set

        let min_date = Object.assign({}, data[0].date)
        let max_date = Object.assign({}, data[0].date)
        for (let i = 0; i !== data.length; ++i) {
            if (utils.__is_before(data[i].date, min_date))
                min_date = Object.assign({}, data[i].date)
            if (utils.__is_before(max_date, data[i].date))
                max_date = Object.assign({}, data[i].date)
        }
        if (!utils.__is_to_day_equal(min_date, max_date)) {
            let this_day = max_date
            while (utils.__is_before(min_date, this_day)) {
                // let dayCode = codeDay(this_day)                    
                let encoded = this_day.year * 31 * 12 + this_day.month * 31 + this_day.day
                differentDays.add(encoded)    
                this_day = utils.__get_prev_day(this_day)
            }
            differentDays.add(min_date)
        }

        info.amountOfDays = differentDays.size
        info.average = ((info.sum / info.amountOfDays * 100) | 0) / 100.0

        return info
    }

    const average = (req, res) => {
        let { token, login } = req.body
        if (!token || !login) {
            token = req.query.token
            login = req.query.login
        }
        if (!token || !login) {
            res.send({ err: 'Login or token is empty' })
            return
        }

        jwt.verify(token, process.env.jwt_secret, (err, decoded) => {
            if (err) {
                res.send({ type: 'error', err: 'Token is invalid' })
            } else {
                db.get_data(token, login).then(data => {
                    const info = analyze(data)
                    
                    console.log(info)
                    res.send(info)
                }).catch(err => {
                    console.log(err)
                    res.send({ type: 'error', err: 'Some error occurred on server' })
                })
            }
        })
    }

    app.post('/api/info', (req, res) => average(req, res))
    app.get('/api/info', (req, res) => average(req, res))

    app.post('/api/data', (req, res) => {
        let token = req.body.token
        let login = req.body.login

        if (!token) {
            res.send({ err: 'Token is ivalid or empty. Please relogin' })
        } else {
            jwt.verify(token, process.env.jwt_secret, (err, decoded) => {
                if (err) {
                    res.send({ err: 'Token is ivalid or empty. Please relogin' })
                    return
                } else {
                    db.get_data(token, login).then(data => {
                        res.send(data)
                    })
                    .catch(err => {
                        console.log(err)
                        res.send({ err: err })
                    })
                }
            })
        }
    })

    app.post('/api/remove', (req, res) => {
        let token = req.body.token, login = req.body.login, record_id = req.body.record_id
        db.remove(token, login, record_id).then(data => {
            res.send(data)
        }).catch(err => {
            res.send({ err: err })
        })
    })

    app.listen(process.env.api_port, err => {
        if (err) {
            console.log(err)
        } else {
            console.log('Server is running'.green)
        }
    })
        
    // db.debug()
})
.catch(err => {
    console.log(err)
})