const express = require('express'), 
    mongodb = require('mongodb'), 
    bParser = require('body-parser'), 
    jwt = require('jsonwebtoken'), 
    db = require('./db'),
    utils = require('./utils'),
    fs = require('fs'),
    compression = require('compression')

require('colors')
require('dotenv').config()

const defaultTags = [ 'Еда', 'Транспорт', 'Медиа', 'Проживание', 'Электроника', 'Одежда', 'Линзы', 'Посуда', 'Химия', 'Связь', 'Разное' ]
const defaultWallets = [ 'Наличные', 'Сбербанк', 'ВТБ', 'АкБарс' ]

db.connect().then(() => {
    let app = express()

    app.use(compression({ level: 7 }))
    app.use(bParser.json())
    app.use(bParser.urlencoded({ extended: true }))

    app.use((req, res, next) => {
        console.log((`[${Date()}] ${req.method} ${req.url}`).cyan)

        next()
    })

    app.use(express.static(__dirname + '/public'))
    
    const handleHomePage = (_, res) => {
        res.sendFile(__dirname + '/public/index.html')
    }

    app.get('/', handleHomePage)
    app.get('/home', handleHomePage)

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
            id = req.body.id,
            daily = req.body.daily
        const validation = utils.validateRecord({ name, date, value, wallet, login, tags, daily })
        if (validation !== null) {
            res.send({ type: 'error', error: validation })
        } else {
            if (value > 0)
                value = -value
            db.edit(token, login, id, date, name, wallet, value, tags, daily)
            .then(data => {
                if (data.err) {
                    res.send({ type: 'error', error: data.err })
                } else {
                    res.send({ type: 'ok' })
                }
            }).catch(err => {
                console.log(err)
                res.send({ type: 'error', error: err })
            })
        }
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
            tags = req.body.tags,
            daily = req.body.daily

        const validation = utils.validateRecord({ name, date, value, wallet, login, tags, daily })
        if (validation !== null) {
            res.send({ type: 'error', error: validation })
        } else {
            if (token) {
                jwt.verify(token, process.env.jwt_secret, (err, decoded) => {
                    if (err) {
                        res.send({ type: 'error', error: 'Token is ivalid or empty. Please relogin' })
                    } else {
                        db.add(token, login, date, name, wallet, value, tags, daily)
                        .then(data => {
                            res.send({ type: 'ok', data: data })
                        })
                        .catch(err => {
                            res.send({ type: 'error', error: err })
                        })
                    }
                })
            } else {
                res.send({ type: 'error', error: 'Token is ivalid or empty. Please relogin' })
            }
        }
    })

    /**
     * 
     * @param {float} value - float value, which will be beautified
     * floors float to 2 digits after comma
     */
    const beautifyFloat = value => (value * 100 | 0) / 100.

    /**
     * Function which provides analyzing functionality for the user
     * @param data - Full records list
     * @param {Object} options - options for request
     *      if options.daysDescription is set then in response will be daySum object,
     *      which provides access to spended sum per day due tracked period
     * 
     *      info.totalSpend - total spending through all time
     *      info.average - average in day spending through all time
     *      info.amountOfDays - total count ofDays
     * 
     *      only if options.info30 specified
     *          info.sum30Days - sum in last 30 days(or less if tracked less then 30 days)
     *          info.average30Days - average in day spending in last 30 days(or less if tracked less then 30 days)
     * 
     *      only if options.info7 specified
     *          info.sum7Days - sum in last 7 days(or less if tracked less then 30 days)
     *          info.average7Days - average in day spending in last 7 days(or less if tracked less then 30 days)
     */
    const analyze = (data, options) => {
        let info = {
            totalSpend: 0,
            amountOfDays: 0,
            average: 0,
        }

        if (options.info30) {
            info.sum30Days = 0
            info.average30Days = 0
        }

        if (options.info7) {
            info.sum7Days = 0
            info.average7Days = 0
        }

        if (options.daysDescription) {
            info.daySum = {}
        }

        for (let i = 0; i != data.length; ++i) {
            info.totalSpend += Math.abs(data[i].value)
        }

        let differentDays = new Set
        let daySum = {}

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
                let encoded = this_day.year * 31 * 12 + this_day.month * 31 + this_day.day
                differentDays.add(encoded)
                if (options.daysDescription || options.info7 || options.info30)
                    if (!daySum[utils.codeDay(this_day)])
                        daySum[utils.codeDay(this_day)] = 0  
                this_day = utils.__get_prev_day(this_day)
            }
            differentDays.add(min_date)
            if (options.daysDescription || options.info7 || options.info30)
                if (!daySum[utils.codeDay(min_date)])
                    daySum[utils.codeDay(min_date)] = 0  
        }

        if (options.daysDescription || options.info30 || options.info7) {
            for (let i = 0; i != data.length; ++i) {
                const codedDay = utils.codeDay(data[i].date)
                daySum[codedDay] += Math.abs(data[i].value)
            }
            let buffer = []
            for (const el in daySum)
                buffer.push([ el, daySum[el] ])
            buffer.sort((first, second) => {
                let first_buffer = first[0].split('-')
                let second_buffer = second[0].split('-')
                let first_date = { year: parseInt(first_buffer[0], 10), month: parseInt(first_buffer[1], 10), day: parseInt(first_buffer[2], 10) }
                let second_date = { year: parseInt(second_buffer[0], 10), month: parseInt(second_buffer[1], 10), day: parseInt(second_buffer[2], 10) }
                if (utils.__is_before(first_date, second_date))
                    return -1
                if (utils.__is_to_day_equal(first_date, second_date))
                    return 0
                return 1
            })
            if (options.daysDescription) {
                for (let i = 0; i !== buffer.length; ++i) {
                    info.daySum[buffer[i][0]] = buffer[i][1]
                }
            }
            if (options.info30) {
                let count = 0
                for (let i = Math.max(0, buffer.length - 30); i != buffer.length; ++i) {
                    info.sum30Days += buffer[i][1]
                    count += 1
                }
                if (count !== 0)
                    info.average30Days = beautifyFloat(info.sum30Days / count)
            }
            if (options.info7) {
                let count = 0
                for (let i = Math.max(0, buffer.length - 7); i != buffer.length; ++i) {
                    info.sum7Days += buffer[i][1]
                    count += 1
                }
                if (count !== 0)
                    info.average7Days = beautifyFloat(info.sum7Days / count)
            }
        }

        info.totalSpend = (info.totalSpend * 100 | 0) / 100.0
        info.amountOfDays = differentDays.size
        info.average = ((info.totalSpend / info.amountOfDays * 100) | 0) / 100.0

        return info
    }

    const info = (req, res) => {
        let { token, login } = req.body
        let options = {}
        if (req.body.daysDescription === 'true')
            options.daysDescription = true
        if (req.body.info7 === 'true')
            options.info7 = true
        if (req.body.info30 === 'true')
            options.info30 = true
        if (!token || !login) {
            token = req.query.token
            login = req.query.login
            if (req.query.daysDescription === 'true')
                options.daysDescription = true
            if (req.query.info7 === 'true')
                options.info7 = true
            if (req.query.info30 === 'true')
                options.info30 = true
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
                    const info = analyze(data, options)
                    res.send({ 
                        type: 'ok',
                        info: info,
                    })
                }).catch(err => {
                    console.log(err)
                    res.send({ type: 'error', err: 'Some error occurred on server' })
                })
            }
        })
    }

    app.post('/api/info', (req, res) => info(req, res))
    app.get('/api/info', (req, res) => info(req, res))

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