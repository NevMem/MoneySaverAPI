require('colors')
const envfile = require('envfile')
const mongodb = require('mongodb')
const mongoClient = mongodb.MongoClient
const ObjectID = mongodb.ObjectID

if (process.argv.length <= 3) {
    console.log('Not enough args'.red)
    process.exit(1)
}

const fromConfig = envfile.parseFileSync(process.argv[2])
const toConfig = envfile.parseFileSync(process.argv[3])

const buildDbURL = (config) => {
    return config.db_url.replace('<dbuser>', config.db_user).replace('<dbpassword>', config.db_password)
}

const connect = (config) => {
    return mongoClient.connect(buildDbURL(config), { useNewUrlParser: true })
}

const collectionsToMigrate = ['data', 'tags', 'templates', 'wallets']

const migrate = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const fromClient = await connect(fromConfig)
            const toClient = await connect(toConfig)

            const from = fromClient.db(fromConfig.db_name)
            const to = toClient.db(toConfig.db_name)
            
            let toProceed = collectionsToMigrate.length

            from.collection('users').find({}, {projection: {tags: 0, wallets: 0, templates: 0}}).toArray((err, activeUsers) => {
                const activeUsersLogins = {}
                activeUsers.forEach(user => activeUsersLogins[user.login] = true)
                console.log(`Amount of users is: ${activeUsers.length}`)
                to.collection('users').insertMany(activeUsers)
                    .then(result => {
                        if (result.result.n === activeUsers.length) {
                            collectionsToMigrate.forEach(collection => {
                                from.collection(collection).find({}).toArray((err, data) => {
                                    let field = 'owner'
                                    if (collection === 'data') {
                                        field = 'login'
                                    }
                                    let buffer = []
                                    data.forEach(elem => {
                                        if (elem[field] in activeUsersLogins) {
                                            buffer.push(elem)
                                        }
                                    })
                                    data = buffer
            
                                    to.collection(collection).insertMany(data)
                                        .then(result => {
                                            console.log(collection, data.length, result.result.n)
                                            toProceed -= 1
                                            if (toProceed == 0) {
                                                fromClient.close()
                                                toClient.close()
                                                resolve()
                                            }
                                        })
                                        .catch(err => {
                                            reject(err)
                                        })
                                })
                            })
                        } else {
                            reject("Someting went wrong")
                        }
                    }).catch(err => reject(err))
            })
        } catch (err) {
            reject(err)
        }
    })   
}

migrate().then(() => {
    console.log('end'.green)
})
.catch(err => {
    console.log((err + '').red)
})