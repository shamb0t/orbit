'use strict'

import _ from 'lodash'
import React from 'react'
import CollectionActions from 'actions/CollectionActions'
import CollectionStore from 'stores/CollectionStore'
// import Collection from 'components/Collection'
import Themes from 'app/Themes'
import 'styles/ChannelView.scss'

class CollectionView extends React.Component {
  constructor(props) {
    super(props)
    console.log(props.params)

    console.log(props.params.collection)
    this.state = {
      collectionName: props.params.collection,
      pinnedContent: []
    }
  }

  componentDidMount() {
    this.unsubscribeFromCollectionStore = CollectionStore.listen(this.onCollectionLoaded.bind(this));
    CollectionActions.get(this.onCollectionLoaded.bind(this))
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      collectionName: nextProps.params.collection,
    })
  }
  componentWillUnmount() {
    this.unsubscribeFromCollectionStore();
  }

  onCollectionLoaded(collections) {
    this.setState({pinnedContent: collections[this.state.collectionName]})
  }
  renderMessages() {
    return this.state.pinnedContent.map((message) => {
      return <div>{message}</div>
    })
  }

  render() {
    const { collectionName } = this.state
    return (
      <div className="CollectionView">
        {this.renderMessages()}
      </div>
    )
  }
}

export default CollectionView
