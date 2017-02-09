'use strict'

import React from 'react'
import CollectionActions from 'actions/CollectionActions'
import CollectionStore from 'stores/CollectionStore'
import "styles/Message.scss"

class PinComponent extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      message: props.message,
      showPin: props.showPin,
      isPinned: false
    }
    this.onPinClick = this.onPinClick.bind(this)
  }

  shouldComponentUpdate(nextProps, nextState) {
    return this.props.showPin !== nextProps.showPin
    || this.state.isPinned !== nextState.isPinned
  }

  componentDidMount() {
    //check if pinned locally
    const collections = CollectionStore.collections
    Object.keys(collections).map((collection) => {
      if (collections[collection].indexOf(this.state.message.hash) > -1) {
        this.setState({isPinned : true})
      }
    })

    this.unsubscribeFromCollectionStore = CollectionStore.listen(({hash}) => {
      if (hash === this.state.message.hash) {
        this.setState({isPinned : !this.state.isPinned})
      }
    })
  }
  componentWillUnmount() {
    this.unsubscribeFromCollectionStore()
  }

  onPinClick() {
    const hash = this.state.message.hash
    console.log("pin clicked", hash);
    if (!this.state.isPinned)
      CollectionActions.addPin("default", hash)
    else
      CollectionActions.removePin("default", hash)
  }

  render() {
    const { isPinned } = this.state
    const { showPin } = this.props

    return (
      <button className={showPin || isPinned ? "pinButton" : "pinButton hidden"}
        onClick={this.onPinClick}> { isPinned ? "pinned" : "pin" }
      </button>
    )
  }
}

export default PinComponent
