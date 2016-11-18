'use strict';

import React from 'react';
import TransitionGroup from "react-addons-css-transition-group"; //eslint-disable-line
import MessageStore from 'stores/MessageStore';
// import 'styles/Collections.scss';
import 'styles/ChannelsPanel.scss';
const collectionsToArray = (collections) => {
  return Object.keys(collections).map((f) => collections[f]);
};

class Collections extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      pinnedCollections: props.pinnedCollections
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      pinnedCollections: nextProps.pinnedCollections
    });
  }

  componentDidMount() {
    this.unsubscribeFromMessageStore = MessageStore.listen((collections) => {
      this.setState({ pinnedCollections: collections });
    });
  }

  componentWillUnmount() {
    this.unsubscribeFromMessageStore();
  }

  onClose() {
    if(this.state.currentChannel !== null)
      this.props.onClose();
  }

  handleClickCollection(collectionName) {
  }

  _renderCollection(name) {
    return (
      <div className="row link" key={Math.random()}>
        <span className='channelName' key={Math.random()}>#{name}</span>
      </div>
    )
  }

  render() {
    const collectionsHeaderClass = Object.keys(this.state.pinnedCollections).length > 0 ? "panelHeader" : "hidden"
    const pinnedCollections = Object.keys(this.state.pinnedCollections)
      .map((key) => this._renderCollection(key))

      const transitionProps = {
        component: 'div',
        transitionAppear: true,
        transitionAppearTimeout: 5000,
        transitionEnterTimeout: 5000,
        transitionLeaveTimeout: 5000,
      }

    return (
        <div className="Collections">
            <div className={collectionsHeaderClass}>Collections</div>
              <div className="RecentCollections">
                <div className="RecentChannels">{pinnedCollections}</div>
            </div>
        </div>
    );
  }
}

export default Collections;
