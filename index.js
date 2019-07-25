require('dotenv').config()

const debug = require('debug')('server')
const express = require('express')
const body_parser = require('body-parser')
const cors = require('cors')
const database = require('./database')

const server = express()

database.connect().then((db) => {
    global.database = db
    server.listen(process.env.PORT, function () {
        debug(`Server is up at http://localhost:${process.env.PORT}`)
    })
})

server.use(body_parser.urlencoded({ extended: true }))

server.use(cors());


server.use((req, res, next) => {
    debug(`${req.method} ${req.url}`)
    next()
})

server.get('/resources', (req, res) => {
    let q = req.query.q
    debug(`RESOURCES ${q}`)

    global.database.collection('slugs').aggregate([
        {
            '$match': {
                'path': q
            }
        }, {
            '$lookup': {
                'from': 'resources',
                'localField': '_id',
                'foreignField': '_id',
                'as': 'resource'
            }
        }, {
            '$addFields': {
                'resource.path': {
                    '$arrayElemAt': [
                        '$path', 1
                    ]
                }
            }
        }, {
            '$replaceRoot': {
                'newRoot': {
                    '$arrayElemAt': [
                        '$resource', 0
                    ]
                }
            }
        }
    ]).toArray((err, docs) => {
        debug('RESOURCES entry found')
        res.send(docs)
    })
})

server.get('/classes', (req, res) => {
    let q = req.query.q
    debug(`CLASSES ${q}`)

    global.database.collection('resources').find({
        '$or': [
            {
                name: q
            },
            {
                'name.en': q
            },
            {
                'name.pt-BR': q
            }
        ]
    }).toArray((err, docs) => {
        debug('CLASS entry found')
        res.send(docs)
    })
})