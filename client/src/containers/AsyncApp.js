/*
 * Copyright (c) 2017-2018 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 *
 */
import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';

import {
    selectSeries,
    fetchSeriesIfNeeded,
    invalidateSeries,
    subscribeSeries
} from '../actions';
import Picker from '../components/Picker';
import Packet from '../components/Packet';

class DisplaySeries extends React.Component {
    constructor(props) {
        super(props);
        this.handleChange       = this.handleChange.bind(this);
        this.handleRefreshClick = this.handleRefreshClick.bind(this);
        this.state              = {subscription: undefined};
    }

    componentDidMount() {
        const {dispatch, selectedSeries, seriesTags} = this.props;
        dispatch(fetchSeriesIfNeeded(selectedSeries));
        this.setState({subscription: dispatch(subscribeSeries(selectedSeries, seriesTags))});
    }

    componentWillUnmount() {
        const s = this.state.subscription;
        this.setState({subscription: undefined});
        s.cancel();
    }

    componentDidUpdate(prevProps) {
        if (this.props.selectedSeries !== prevProps.selectedSeries) {
            const {dispatch, selectedSeries} = this.props;
            dispatch(fetchSeriesIfNeeded(selectedSeries));
        }
    }

    handleChange(nextSeries) {
        this.props.dispatch(selectSeries(nextSeries));
        this.props.dispatch(fetchSeriesIfNeeded(nextSeries));
    }

    handleRefreshClick(e) {
        e.preventDefault();

        const {dispatch, selectedSeries} = this.props;
        dispatch(invalidateSeries(selectedSeries));
        dispatch(fetchSeriesIfNeeded(selectedSeries));
    }

    render() {
        const {selectedSeries, packets, isFetching, lastUpdated} = this.props;
        return (
            <div>
                <Picker
                    value={selectedSeries}
                    onChange={this.handleChange}
                    options={['recent', 'last27']}
                />
                <p>
                    {lastUpdated &&
                     <span>
              Last updated at {new Date(lastUpdated).toLocaleTimeString()}.
                         {' '}
            </span>}
                    {!isFetching &&
                     <a href='#' onClick={this.handleRefreshClick}>
                         Refresh
                     </a>}
                </p>
                {isFetching && packets.length === 0 && <h2>Loading...</h2>}
                {!isFetching && packets.length === 0 && <h2>Empty.</h2>}
                {packets.length > 0 &&
                 <div style={{opacity: isFetching ? 0.5 : 1}}>
                     <Packet obsTypes={["timestamp", "sealevel_pressure", "out_temperature", "in_temperature"]}
                             packet={packets[packets.length - 1]}/>
                 </div>}
            </div>
        );
    }
}

DisplaySeries.propTypes = {
    selectedSeries: PropTypes.string.isRequired,
    packets       : PropTypes.array.isRequired,
    isFetching    : PropTypes.bool.isRequired,
    lastUpdated   : PropTypes.number,
    dispatch      : PropTypes.func.isRequired
};


class AsyncApp extends React.Component {

    render() {
        const {selectedSeries, seriesBySeriesName, ...props} = this.props;

        // Pass on only the state associated with the selected series to DisplaySeries
        const series = seriesBySeriesName[selectedSeries];
        return (<DisplaySeries selectedSeries={selectedSeries} {...series} {...props}/>);
    }
}

function mapStateToProps(state) {
    return state;
}

export default connect(mapStateToProps)(AsyncApp);