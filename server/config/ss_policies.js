/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

/*
 * Set of subsampling policies.
 * Right now, there is only one, subsampling by 5 minutes, but others,
 * such as daily, could be added.
 */

const aggregate_policies = require('./aggregate_policies');

module.exports = [
    {
        interval   : 300000,    // = 5 minutes in milliseconds
        source     : 'wxpackets',
        destination: 'wxrecords',
        aggregates : aggregate_policies,
    },
];

