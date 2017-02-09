import React from 'react'
import TransitionGroup from "react-addons-css-transition-group"; //eslint-disable-line
import MessageStore from 'stores/MessageStore'
import Message from 'components/Message'
import CollectionStore from 'stores/CollectionStore'
import SettingsStore from 'stores/SettingsStore'
import CollectionActions from 'actions/CollectionActions'
import UIActions from 'actions/UIActions'
import { Draggable, Droppable } from 'react-drag-and-drop'
import 'styles/RecentChannels.scss'
import 'styles/ChannelsPanel.scss'
import 'styles/Collections.scss'

const collectionsToArray = (collections) => {
  return Object.keys(collections).map((f) => collections[f])
}

class Collections extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      posts: {},
      collections: {}
    }
    this.handleClickCollection = this.handleClickCollection.bind(this)
  }

  // componentWillReceiveProps(nextProps) {
  //   this.setState({
  //     pinnedCollections: nextProps.pinnedCollections
  //   })
  // }
  //
  componentDidMount() {
    this.unsubscribeFromCollectionStore = CollectionStore.listen(({collections, posts}) => {
      if (collections && posts)
        this.setState({ collections, posts })
    })
    CollectionActions.loadPinnedPosts();

  }

  componentWillUnmount() {
    this.unsubscribeFromCollectionStore()
  }

  onClose() {
    // if(this.state.currentChannel !== null)
    this.props.onClose()
  }

  handleClickCollection(collectionName) {
    // expand/collapse
  }
  onDrop(data) {
        console.log("data:", data)
        // => banana
  }
  onDragEnter() {
        console.log("enter:")
        // => banana
  }
  onDragLeave() {
        console.log("leave:")
        // => banana
  }

  _renderCollection(collection) {
    const renderedMessages = this.state.collections[collection].map((hash) => {
      const message = this.state.posts[hash]
      return (
        <Draggable type="pinned" data={hash}>
            <div className="pinnedPost" key={hash}>
              <div className="content">{message.content}</div>
              <div className="hash">{message.hash}</div>
            </div>
        </Draggable>
      )
    })

    return (
        <Droppable
          types={['pinned']}
          onDrop={this.onDrop.bind(this)}
          onDragEnter={this.onDragEnter.bind(this)}
          onDragLeave={this.onDragLeave.bind(this)}>
            <div className="row link" key={Math.random()}>
              <span className='collectionName' onClick={this.handleClickCollection(collection)} key={Math.random()}>{collection}</span>
                {renderedMessages}
            </div>
        </Droppable>
    )
  }

  render() {
    const collectionsHeaderClass = Object.keys(this.state.collections).length > 0 ? "panelHeader" : "hidden"
    const pinnedCollections = Object.keys(this.state.collections)
      .map((collection) => this._renderCollection(collection))
    const transitionProps = {
        component: 'div',
        transitionAppear: true,
        transitionAppearTimeout: 5000,
        transitionEnterTimeout: 5000,
        transitionLeaveTimeout: 5000,
      }

    return (
        <div className="Collections" key="PinnedCollections">
            {pinnedCollections}
        </div>
    )
  }
}

export default Collections
