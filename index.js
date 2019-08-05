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

    global.database.collection('resources').aggregate([
        {
          '$match': {
            '$or': [
              {
                'name': q
              }, {
                'name.en': q
              }, {
                'name.pt-BR': q
              }
            ]
          }
        }, {
          '$lookup': {
            'from': 'resources', 
            'localField': '_id', 
            'foreignField': 'parent', 
            'as': 'features'
          }
        }, {
          '$project': {
            'meta': 1, 
            'name': 1, 
            'subscriptions': 1, 
            'mechanics': 1, 
            'features': {
              '$filter': {
                'input': '$features', 
                'as': 'resource', 
                'cond': {
                  '$eq': [
                    '$$resource.meta', 'feature'
                  ]
                }
              }
            }
          }
        }
      ]).toArray((err, docs) => {
        debug('CLASS entry found')
        res.send(docs)
    })
})


server.get('/:meta', (req, res) => {
  let meta = req.params.meta
  let q = req.query.q
  let max = req.query.max || 1000
  debug(`FIND RESOURCE ${q} IN META ${meta}`)

  global.database.collection(`slugs`).aggregate([
    {
      '$unwind': {
        'path': '$path'
      }
    }, {
      '$match': {
        'path': {
          '$regex': q
        }
      }
    }, {
      '$group': {
        '_id': '$_id', 
        'path': {
          '$push': '$path'
        }
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
          '$mergeObjects': [
            {
              '$arrayElemAt': [
                '$resource', 0
              ]
            }, {
              'path': '$path'
            }
          ]
        }
      }
    }, {
      '$match': {
        'meta': meta
      }
    }
  ]).toArray((err, docs) => {
    debug(`META RESOURCE (${meta}) found`)
    res.send(docs.splice(0, max))
  })
})

server.get('/', (req, res) => {
  let q = req.query.q
  let max = req.query.max || 1000
  debug(`FIND RESOURCE ${q}`)

  global.database.collection(`slugs`).aggregate([
    {
      '$unwind': {
        'path': '$path'
      }
    }, {
      '$match': {
        'path': {
          '$regex': q
        }
      }
    }, {
      '$group': {
        '_id': '$_id', 
        'path': {
          '$push': '$path'
        }
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
          '$mergeObjects': [
            {
              '$arrayElemAt': [
                '$resource', 0
              ]
            }, {
              'path': '$path'
            }
          ]
        }
      }
    }
  ]).toArray((err, docs) => {
    debug(`RESOURCE found`)
    res.send(docs.splice(0, max))
  })
})