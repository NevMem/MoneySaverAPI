const express = require('express'), 
    mongodb = require('mongodb'), 
    bParser = require('body-parser'), 
    jwt = require('jsonwebtoken'), 
    db = require('./db')

require('colors')
require('dotenv').config()

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