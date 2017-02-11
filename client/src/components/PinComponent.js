'use strict'

import React from 'react'
import CollectionMenu from 'components/CollectionMenu'
import CollectionActions from 'actions/CollectionActions'
import CollectionStore from 'stores/CollectionStore'
import "styles/Message.scss"


class PinComponent extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      showPin: props.showPin,
      isPinned: false,
      longPress: false
    }
    this.mouseDownTimer = null
    this.onPinClick = this.onPinClick.bind(this)
    this.onMouseDown = this.onMouseDown.bind(this)
    this.onMouseUp = this.onMouseUp.bind(this)
  }

  shouldComponentUpdate(nextProps, nextState) {
    return this.props.showPin !== nextProps.showPin
    || this.state.isPinned !== nextState.isPinned
    || this.state.longPress !== nextState.longPress
  }

  componentDidMount() {
    //check if pinned locally
    const selfHash = this.props.hash
    const collections = CollectionStore.collections
    Object.keys(collections).map((collection) => {
      if (collections[collection].indexOf(selfHash) > -1) {
        this.setState({isPinned : true})
      }
    })

    this.unsubscribeFromCollectionStore = CollectionStore.listen(({hash}) => {
      if (hash === selfHash) {
        this.setState({isPinned : !this.state.isPinned})
      }
    })
  }
  componentWillUnmount() {
    this.unsubscribeFromCollectionStore()
  }

  onPinClick() {
    if (!this.state.longPress) {
      const { hash } = this.props
      if (!this.state.isPinned)
        CollectionActions.addPin("default", hash)
      else
        CollectionActions.removePin("default", hash)
    }
  }

  onMouseUp(){
    if(this.mouseDownTimer)
      clearTimeout(this.mouseDownTimer)
  }

  onMouseDown(){
    if(this.mouseDownTimer)
      clearTimeout(this.mouseDownTimer)

    this.setState({longPress: false})
    this.mouseDownTimer = setTimeout(() => {
      console.log("mouse down forever")
      this.setState({longPress: true})
    }, 1000)
  }

  render() {
    const { isPinned } = this.state
    const { showPin } = this.props

    const styles = {
      display: 'inline-block',
      lineHeight: '40px',
      height: '40px',
      width: '80px',
      textAlign: 'center',
      background: '#f6f6f6',
      marginRight: '1em',
      marginBottom: '1em',
      borderRadius: '6px',
    }

    return (
      <div className="PinComponent" key={"pinComponent" + Math.random()}>
        {this.state.longPress ?
          <CollectionMenu style={styles}></CollectionMenu> :
          <button className={showPin || isPinned ? "pinButton" : "pinButton hidden"}
            onMouseDown={this.onMouseDown}
            onMouseUp={this.onMouseUp}
            onClick={this.onPinClick}> { isPinned ? "pinned" : "pin" }
          </button> }
    </div>
    )
  }
}

export default PinComponent
