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
            ],
            'meta': 'class'
          }
        }
      ]).toArray((err, docs) => {
        debug('CLASS entry found')
        res.send(docs)
    })
})

server.get('/backgrounds', (req, res) => {
    let q = req.query.q
    debug(`BACKGROUND ${q}`)

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
            ],
            'meta': 'background'
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
  let query = req.query.query || undefined
  debug(`FIND RESOURCE ${q} IN META ${meta}`)

  let agg = [
    {
      '$facet': {
        'slugs': [
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
          }
        ]
      }
    }, {
      '$unwind': {
        'path': '$slugs', 
        'includeArrayIndex': 'slugs.index'
      }
    }, {
      '$replaceRoot': {
        'newRoot': '$slugs'
      }
    }, {
      '$group': {
        '_id': '$_id', 
        'path': {
          '$push': '$path'
        }, 
        'index': {
          '$push': '$index'
        }
      }
    }, {
      '$project': {
        '_id': 1, 
        'path': 1, 
        'index': {
          '$arrayElemAt': [
            '$index', 0
          ]
        }
      }
    }, {
      '$sort': {
        'index': 1
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
  ]

  if(query){
    console.log(query)
    agg.push({
      '$match': JSON.parse(query.replace(/\'+/gm, '\"'))
    })
    console.log(agg)
  }

  global.database.collection(`slugs`).aggregate(agg).toArray((err, docs) => {
    debug(`META RESOURCE (${meta}) found`)
    res.send(docs.splice(0, max))
  })
})

server.get('/', (req, res) => {
  let q = req.query.q
  let max = req.query.max || 1000
  let query = req.query.query
  debug(`FIND RESOURCE ${q}`)

  let agg = [
    {
      '$facet': {
        'slugs': [
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
          }
        ]
      }
    }, {
      '$unwind': {
        'path': '$slugs', 
        'includeArrayIndex': 'slugs.index'
      }
    }, {
      '$replaceRoot': {
        'newRoot': '$slugs'
      }
    }, {
      '$group': {
        '_id': '$_id', 
        'path': {
          '$push': '$path'
        }, 
        'index': {
          '$push': '$index'
        }
      }
    }, {
      '$project': {
        '_id': 1, 
        'path': 1, 
        'index': {
          '$arrayElemAt': [
            '$index', 0
          ]
        }
      }
    }, {
      '$sort': {
        'index': 1
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
  ]

  if(query){
    console.log(query)
    agg.push({
      '$match': JSON.parse(query.replace(/\'+/gm, '\"'))
    })
    console.log(agg)
  }

  global.database.collection(`slugs`).aggregate(agg).toArray((err, docs) => {
    debug(`RESOURCE found`)
    res.send(docs.splice(0, max))
  })
})