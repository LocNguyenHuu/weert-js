# WeeRT
A real-time logging and display server, using Node, Express, and InfluxDB

## General architecture
- Uses a [Node](https://nodejs.org/) server with the [Express framework](http://expressjs.com/)
- The server offers a RESTful API for storing, retrieving, deleting, and editing streams and data.
- Data are stored in a [InfluxDB](https://www.influxdata.com/) server

For experimental purposes.

The WeeRT uploader requires WeeWX version 3.8 or later. Earlier versions will not work.

Tested on Node V6.9.5, although later versions should work fine.

Tested on InfluxDB V1.3.5.


# Data model

## Background
It is strongly recommended that you read the ["key concepts" section](https://docs.influxdata.com/influxdb/v1.2/concepts/key_concepts/)
of the InfluxDB documentation. In particular, be sure to understand the concepts of measurements,
tags, and fields. These terms are used throughout WeeRT.

## Packets
There are several different ways of representing packet data in the WeeRT / Influx ecosystem. It's useful
to be aware of the differences.

- A __weewx-style packet__. This is a simple data structure, similar to the packets that weewx uses, except that
  it contains observation type `time` instead of `dateTime`, and the time is in nanoseconds,
  not seconds.   It holds time and field data, but no information about platforms or streams.
  It is used when broadcasting from WeeWX to the MQTT broker. 
  It looks like:
  
   ```json
   {
     "time" : 1492891404989186223,
     "temperature" : 108.3, 
     "rpm" : 1850, 
     "unit_system" : 16
    }
    ```

- What we are calling a __deep packet__. This is a structured packet that the Node
  client library [node-influx](https://node-influx.github.io/) expects 
  (as do the client libraries for most other languages). It is useful
  because the InfluxDB "measurement" and "tags" are explicitly represented. It looks something like this:
 
   ```json
   {
     "time" : 1492891404989186223,
     "measurement" : "highway_data"
     "tags" : {"platform" : "Red chevy", "stream" : "engine_parameters"}
     "fields" : {"temperature" : 108.3, "rpm" : 1850, "unit_system" : 16}
    }
  ```
    
- What we are calling a __flattened packet__. This is what is returned from
  the [`query`](https://node-influx.github.io/class/src/index.js~InfluxDB.html#instance-method-query)
  function of node-influx. Unfortunately, it is slightly different from a deep packet. The tag
  members have been flattened in with the field data:
  
   ```json
   {
     "time" : 1492891404989186223,
     "platform" : "Red chevy",
     "stream" : "engine_parameters",
     "temperature" : 108.3, 
     "rpm" : 1850, 
     "unit_system" : 16
    }
   ```
    
- The InfluxDB [__line protocol__](https://docs.influxdata.com/influxdb/v1.2/write_protocols/line_protocol_reference/).
  This protocol is designed for on-the-wire efficiency. It is not explicitly used within WeeRT. It looks something like this:
 
   ~~~
   highway_data, platform="Red chevy",stream="engine_parameters" temperature=108.3,rpm=1850 1492891404989186223
   ~~~

WeeRT tries to consistently traffic in "deep packets." Data going in and out of the WeeRT server
are in this format. There are utility functions in module `weert.database` for building a deep packet,
as well as for converting to and from flattened packets.
 
# API

 

## Get packets

Return all packets from a series that satisfy a search query.

```
GET /api/v1/measurements/:measurement/packets
```

**Parameters**

| *Name*          | *Type*  | *Description*                                                                                                                    |
|:----------------|:--------|:---------------------------------------------------------------------------------------------------------------------------------|
| `platform`      | string  | Include only packets from platform `platform`.                                                                                   |
| `stream`        | string  | Include only packets from stream `stream`.                                                                                       |
| `start`         | integer | All packets greater than this timestamp will be included in the results. Default: first available packet.                        |
| `stop`          | integer | All packets less than or equal to this timestamp will be included in the results. Default: last available packet.                |
| `limit`         | integer | Limit the number of returned packets to this value. Default: no limit.                                                           |
| `direction`     | string  | The direction of the sort. Can be either `asc` or `desc`. Default: `asc`.                                                        |


**Response code**

| *Status* | *Meaning*             |
|:---------|:----------------------|
| 200      | Success               |
| 400      | Malformed query       |

**Example**

Ask for all the packets in the measurement `examples`. This is the entire example database.

```shell
$ curl -i --silent -X GET 'http://localhost:3000/api/v1/measurements/examples/packets'

HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 993
ETag: W/"3e1-cEFYgsoYoMKa+fkx+m5jqbYWzbA"
Date: Fri, 29 Sep 2017 23:11:51 GMT
Connection: keep-alive

[
    {
        "fields": {
            "pressure": 27.9,
            "temperature": 177
        },
        "tags": {
            "platform": "chevy",
            "stream": "oil"
        },
        "timestamp": "1506713140000000000"
    },
    {
        "fields": {
            "pressure": 27.9,
            "temperature": 177
        },
        "tags": {
            "platform": "truck",
            "stream": "oil"
        },
        "timestamp": "1506713140000000000"
    },
    {
        "fields": {
            "pressure": 27.8,
            "temperature": 181
        },
        "tags": {
            "platform": "chevy",
            "stream": "oil"
        },
        "timestamp": "1506713200000000000"
    },
    {
        "fields": {
            "pressure": 27.8,
            "temperature": 181
        },
        "tags": {
            "platform": "truck",
            "stream": "oil"
        },
        "timestamp": "1506713200000000000"
    },
    {
        "fields": {
            "pressure": 27.6,
            "temperature": 182
        },
        "tags": {
            "platform": "chevy",
            "stream": "oil"
        },
        "timestamp": "1506713260000000000"
    },
    {
        "fields": {
            "pressure": 27.6,
            "temperature": 182
        },
        "tags": {
            "platform": "truck",
            "stream": "oil"
        },
        "timestamp": "1506713260000000000"
    },
    {
        "fields": {
            "pressure": 27.1,
            "temperature": 184
        },
        "tags": {
            "platform": "chevy",
            "stream": "oil"
        },
        "timestamp": "1506713320000000000"
    },
    {
        "fields": {
            "pressure": 27.1,
            "temperature": 184
        },
        "tags": {
            "platform": "truck",
            "stream": "oil"
        },
        "timestamp": "1506713320000000000"
    }
]

```

Query again, but this time ask for only those packets on platform `truck`, and limit it
to 2 packets:

```shell
$ curl -i --silent -X GET 'http://localhost:3000/api/v1/measurements/examples/packets?platform=truck&limit=2'

HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 497
ETag: W/"1f1-o8ohvg7wrsFnHHncG5Q4qZWDaxA"
Date: Fri, 29 Sep 2017 23:11:51 GMT
Connection: keep-alive

[
    {
        "fields": {
            "pressure": 27.9,
            "temperature": 177
        },
        "tags": {
            "platform": "truck",
            "stream": "oil"
        },
        "timestamp": "1506713140000000000"
    },
    {
        "fields": {
            "pressure": 27.8,
            "temperature": 181
        },
        "tags": {
            "platform": "truck",
            "stream": "oil"
        },
        "timestamp": "1506713200000000000"
    },
    {
        "fields": {
            "pressure": 27.6,
            "temperature": 182
        },
        "tags": {
            "platform": "truck",
            "stream": "oil"
        },
        "timestamp": "1506713260000000000"
    },
    {
        "fields": {
            "pressure": 27.1,
            "temperature": 184
        },
        "tags": {
            "platform": "truck",
            "stream": "oil"
        },
        "timestamp": "1506713320000000000"
    }
]

```

Query, constraining by time and platform name, returning results in reverse order:


```shell
$ curl -i -X GET 'http://localhost:3000/api/v1/measurements/examples/packets?start=1506713140000000000&stop=1506713260000000000&platform=chevy&direction=desc'

HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 249
ETag: W/"f9-24gaPxQBiCT4du1TnHz0Z12Z9ME"
Date: Fri, 29 Sep 2017 23:11:51 GMT
Connection: keep-alive

[
    {
        "fields": {
            "pressure": 27.6,
            "temperature": 182
        },
        "tags": {
            "platform": "chevy",
            "stream": "oil"
        },
        "timestamp": "1506713260000000000"
    },
    {
        "fields": {
            "pressure": 27.8,
            "temperature": 181
        },
        "tags": {
            "platform": "chevy",
            "stream": "oil"
        },
        "timestamp": "1506713200000000000"
    }
]

```

## Get a specific timestamp

Return packets with a specific timestamp.


```
GET /api/v1/measurements/:measurement/packets/:timestamp
```

**Parameters**

| *Name*          | *Type*  | *Description*                                                                                                            |
|:----------------|:--------|:-------------------------------------------------------------------------------------------------------------------------|
| `platform` | string  | Include only packets on the platform `platform`.                                                                              |
| `stream`   | string  | Include only packets on the stream `stream`.                                                                                  |

**Response code**

| *Status* | *Meaning*             |
|:---------|:----------------------|
| 200      | Success               |
| 400      | Malformed query       |
| 404      | Stream does not exist |

**Example**

```shell
$ curl -i -X GET 'http://localhost:3000/api/v1/measurements/examples/packets/1506713200000000000?platform=truck'

HTTP/1.1 200 OK
X-Powered-By: Express
Location: http://localhost:3000/api/v1/measurements/examples/packets/undefined
Content-Type: application/json; charset=utf-8
Content-Length: 123
ETag: W/"7b-A2xQJGDxzKCul2tKEX0f8WOgfpE"
Date: Fri, 29 Sep 2017 23:11:51 GMT
Connection: keep-alive

{
    "fields": {
        "pressure": 27.8,
        "temperature": 181
    },
    "tags": {
        "platform": "truck",
        "stream": "oil"
    },
    "timestamp": "1506713200000000000"
}

```


## Post a new packet

Post a new packet.

```
POST /api/v1/measurements/:measurement/packets
```

**JSON input**

A deep packet must be included in the body of the request.

The packet need not include a value for `measurement`, but, if included,
it must match the value given in the URL.

The packet must include a value for `timestamp`.

Any fields with a `null` value will be ignored and not inserted into the
database.

**Response code**

| *Status* | *Meaning*                         |
|:---------|:----------------------------------|
| 201      | Created                           |
| 400      | Malformed post                    |
| 415      | Invalid or missing `Content-type` |

If successful, the server will return a response code of 201, with the
response `Location` field set to the URL of the newly created resource (packet).

**Example**

```shell
$ curl -i --silent -X POST -H Content-type:application/json \


```

Note how the URL of the new resource is returned in the header `Location`.


## Delete a specific timestamp

Delete packets with a specific timestamp.


```
DELETE /api/v1/measurements/:measurement/packets/:timestamp
```

**Parameters**

| *Name*     | *Type*  | *Description*                                                                                 |
|:-----------|:--------|:----------------------------------------------------------------------------------------------|
| `platform` | string  | Delete only packets on the platform `platform`.                                               |
| `stream`   | string  | Delete only packets on the stream `stream`.                                                   |

**Response code**

| *Status* | *Meaning*             |
|:---------|:----------------------|
| 204      | Success               |

The same response code (204) is returned irregardless of whether or not any packet fitting the criteria
actually existed in the database.

**Example**

```shell

```


## Get information about a measurement.

Query the database for information about an InfluxDB measurement.

```
GET /api/v1/measurements/:measurement
```


**Return status**

| *Status* | *Meaning*             |
|:---------|:----------------------|
| 200      | Success               |
| 404      | Measurement not found |

If successful, the server will return an array containing the series contained in the measurement `measurement`.

**Example**

```Shell
#$ curl -i --silent -X GET 'http://localhost:3000/api/v1/measurements/wxpackets'
HTTP/1.0 200 OK
Content-Type: application/json
Content-Length: 78
Server: Werkzeug/0.12.1 Python/2.7.12
Date: Wed, 26 Apr 2017 22:03:02 GMT

[
    "wxpackets,platform=default_platform,stream=default_stream"
]
```

**Do the example again, but using a bogus measurement name**

```shell
$ curl -i --silent -X GET http://localhost:3000/api/v1/measurements/foo

HTTP/1.1 404 Not Found
X-Powered-By: Express
Content-Type: text/html; charset=utf-8
Content-Length: 1138
ETag: W/"472-XKm1PvTZ44bDFVPd6ihOe1k/lw8"
Date: Fri, 29 Sep 2017 23:11:51 GMT
Connection: keep-alive

<h1>WeeRT server</h1><h2>Page not found: /api/v1/measurements/foo</h2><h3>Status: 404</h3><pre>Error: Page not found: /api/v1/measurements/foo    at /home/tkeffer/git/tkeffer/weert-js/server/server.js:75:25    at Layer.handle [as handle_request] (/home/tkeffer/git/tkeffer/weert-js/node_modules/express/lib/router/layer.js:95:5)    at trim_prefix (/home/tkeffer/git/tkeffer/weert-js/node_modules/express/lib/router/index.js:317:13)    at /home/tkeffer/git/tkeffer/weert-js/node_modules/express/lib/router/index.js:284:7    at Function.process_params (/home/tkeffer/git/tkeffer/weert-js/node_modules/express/lib/router/index.js:335:12)    at next (/home/tkeffer/git/tkeffer/weert-js/node_modules/express/lib/router/index.js:275:10)    at /home/tkeffer/git/tkeffer/weert-js/node_modules/express/lib/router/index.js:635:15    at next (/home/tkeffer/git/tkeffer/weert-js/node_modules/express/lib/router/index.js:260:14)    at Function.handle (/home/tkeffer/git/tkeffer/weert-js/node_modules/express/lib/router/index.js:174:3)    at router (/home/tkeffer/git/tkeffer/weert-js/node_modules/express/lib/router/index.js:47:12)</pre>
```

## Delete a measurement

Delete a measurement from the InfluxDB database.

```
DELETE ap/v1/measurements/:measurement
```

**Return status**

| *Status* | *Meaning*             |
|:---------|:----------------------|
| 204      | Success / NO CONTENT  |
| 404      | Measurement not found |


```
#$curl -i --silent -X DELETE 'http://localhost:3000/api/v1/measurements/examples'
HTTP/1.0 204 NO CONTENT
Content-Type: application/json
Content-Length: 0
Server: Werkzeug/0.12.1 Python/2.7.12
Date: Wed, 26 Apr 2017 22:10:24 GMT
```


**Do it again, but using a bogus measurement name***


```
#$ curl -i --silent -X DELETE 'http://localhost:3000/api/v1/measurements/foo'
HTTP/1.0 404 NOT FOUND
Content-Type: application/json
Content-Length: 112
Server: Werkzeug/0.12.1 Python/2.7.12
Date: Wed, 26 Apr 2017 22:08:12 GMT

{
  "code": 404,
  "description": "measurement not found: foo",
  "message": "Non-existent measurement foo"
}
```




# License & Copyright

Copyright (c) 2015-2016 Tom Keffer <tkeffer@gmail.com>

  See the file LICENSE for your full rights.


