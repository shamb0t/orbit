'use strict'

import _ from 'lodash'
import React from 'react'
import CollectionActions from 'actions/CollectionActions'
import 'styles/Channel.scss'
import Logger from 'logplease'
const logger = Logger.create('Channel', { color: Logger.Colors.Cyan })

class Collection extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      collectionName: null,
      pinnedContent: [],
      theme: props.theme,
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    return this.state.pinnedContent.length !== nextState.pinnedContent.length
      || this.state.collectionName != nextState.collectionName
  }

  componentWillReceiveProps(nextProps) {
    if(nextProps.collectionName !== this.state.collectionName) {
      this.setState({
        collectionName: nextProps.collectionName,
        pinnedContent: CollectionStore.collections[nextProps.collectionName]
      })
    }

    this.setState({
      theme: nextProps.theme
    })
  }

  componentDidMount() {
  }

  componentWillUnmount() {
    this.setState({ pinnedContent: [] })
  }

  renderMessages() {
    return this.state.pinnedContent.map((message) => {
      return <div>message</div>
    })
  }

  render() {
    return (
      <div className="Collection">
        <div className="Messages">
          {this.renderMessages()}
        </div>
      </div>
    )
  }
}

export default Collection
