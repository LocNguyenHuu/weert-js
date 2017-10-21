/*
 * Copyright (c) 2015-2017 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

/** @classdesc Class that manages the data connection back to the server.
 *  @property {Number[]} x Array of timestamps in milliseconds.
 *  @property {Object} y An object holding the y-values. When keyed with an observation type, it
 *  returns an Array of y-values.
 */
class DataManager {

    /**
     * Create a DataManager object. This will merely create the object. To load it with data,
     * use the function {@link DataManager#setMaxAge DataManager.setMaxAge}.
     * @constructor
     * @param {String} measurement The InfluxDB measurement to use
     * @param {Object} options A hash of options:
     * @param {String[]} options.obs_types An array specifying the observation types to be managed.
     * @param {String} [options.platform=default_platform] The platform.
     * @param {String} [options.stream=default_stream] The stream.
     * @param {String} [options.faye_endpoint="/api/v1/faye"] The endpoint where the Faye pub-sub facility can be
     *     found.
     */
    constructor(measurement, options) {
        this.measurement = measurement;
        this.obs_types   = options.obs_types;
        this.platform    = options.platform || "default_platform";
        this.stream      = options.stream || "default_stream";
        let fe           = options.faye_endpoint || '/api/v1/faye';

        this.max_age   = undefined;
        this.callbacks = [];
        this.x         = [];
        this.y         = {};
        for (let obs_type of this.obs_types)
            this.y[obs_type] = [];

        this.faye_client = new Faye.Client("http://" + window.location.host + fe);
        this.faye_client.subscribe("/" + measurement, packet => {

            // Just return if a packet arrives before setMaxAge() has been called.
            if (!this.max_age) return;

            // First, trim off any stale data points off the front of the
            // x and y arrays.
            if (this.x.length) {
                var lastTimestamp = this.x[this.x.length - 1];
                var trim_time     = lastTimestamp - this.max_age;
                var first_good    = this.x.findIndex(function (xval) {
                    return xval >= trim_time;
                });

                let Ntrim = first_good === -1 ? this.x.length : first_good;

                this.x.splice(first_good - 1, Ntrim);
                for (let obs_type of this.obs_types) {
                    this.y[obs_type].splice(first_good - 1, Ntrim);
                }
            }

            // Having trimmed old data points off the front, push the new data point onto the end
            this._pushPacket(packet);

            // Let my subscribers know I've changed.
            this._notify_subscribers('new_packet', packet);
        });
    }

    /**
     * Subscribe to changes in the data model.
     *
     * @param {Function} callback A function with two arguments. The first argument will be the event type,
     * the second the event data.
     */
    subscribe(callback) {
        this.callbacks.push(callback);
    }


    /**
     * Set how far back in time the data manager will manage. This will force a data reload.
     * @param {Number} [max_age=1200000] The max age in milliseconds that will be requested from the
     *     server and maintained by the DataManager. The default is <tt>1200000</tt> milliseconds,
     *     or 20 minutes.
     * @return {Promise} A promise to resolve to the number of packets returned from the server.
     */
    setMaxAge(max_age) {
        this.max_age = max_age || 1200000;
        // Convert to nanoseconds
        let since    = (Date.now() - this.max_age) * 1000000;
        return $.ajax({
                          url     : "http://" + window.location.host + "/api/v1/measurements/" +
                                    this.measurement + "/packets",
                          data    : {
                              start   : since,
                              platform: this.platform,
                              stream  : this.stream
                          },
                          method  : "GET",
                          dataType: "JSON"
                      })
                .then(packet_array => {
                    // Go through the array of packets, adding to my internal array of
                    // x- and y-values.
                    for (let packet of packet_array) {
                        this._pushPacket(packet);
                    }
                    // Let my subscribers know I've changed.
                    this._notify_subscribers('reload', {x: this.x, y: this.y});

                    return Promise.resolve(packet_array.length);
                });
    }

    _pushPacket(packet) {
        this.x.push(packet.timestamp / 1000000);
        for (let obs_type of this.obs_types) {
            let val = packet.fields[obs_type] === undefined ? null : packet.fields[obs_type];
            this.y[obs_type].push(val);
        }
    }

    _notify_subscribers(event, event_data) {
        for (let callback of this.callbacks) {
            callback(event, event_data);
        }
    }
}
