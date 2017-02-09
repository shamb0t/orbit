'use strict'
import Promise from 'bluebird'
import Reflux from 'reflux'
import AppActions from 'actions/AppActions'
import CollectionActions from 'actions/CollectionActions'
import UserStore from 'stores/UserStore'
import Logger from 'logplease'

const logger = Logger.create('CollectionStore', { color: Logger.Colors.Blue })

const defaultCollections = {
  default: []
}

const CollectionStore = Reflux.createStore({
  listenables: [AppActions, CollectionActions],
  init: function() {
    this.collections = {}
    this.posts = {}
    this.orbit = null
    UserStore.listen((user) => {
      if(user) {
        this.username = user.name
        this.loadCollections()
      }
    })
  },
  onInitialize: function(orbit) {
    this.orbit = orbit
  },
  loadCollections: function() {
    console.log("loading collections")
    this.collections = Object.assign({}, defaultCollections)
    const collections = JSON.parse(localStorage.getItem(this._getCollectionsKey())) || {}
    Object.assign(this.collections, collections)
    this._save()
  },
  onAddPin: function(collectionName, hash) {
    this._pinToIpfs(hash)
    const collection = this.collections[collectionName] || []
    if (collection.indexOf(hash) < 0) {
      let collections = Object.assign({}, this.collections)
      collections[collectionName] = collection.concat(hash)
      Object.assign(this.collections, collections)
      this._save()
    }
    this.trigger({hash:hash})
  },
  onRemovePin: function(collectionName, hash) {
    const collection = this.collections[collectionName]
    if (collection) {
      const filtered = collection.filter((e) => e !== hash)
      Object.assign(this.collections, { [collectionName] : filtered })
      this._unPinFromIpfs(hash)
      delete this.posts[hash]

      this._save()
      // this.trigger({collections: this.collections, posts: this.posts})
      this.trigger({hash:hash})
    }
  },
  onLoadPinnedPosts: function() {
    let posts = {}
    Object.keys(this.collections).map((collection) => {
      Promise.map(this.collections[collection], (hash) => {
        if (!this.posts[hash]) {
          return this.orbit.getPost(hash, true)
          .then((post) => {
            posts[hash] = post
          })
        }
      }, { concurrency: 1 })
      .then(() => {
        Object.assign(this.posts, posts)
        this.trigger({collections: this.collections, posts: this.posts})
      })
    })
  },
  _unPinFromIpfs: function (hash) {
    logger.debug("--> Unpin message: ", hash)
    this.orbit.removePin(hash)
      .then((pins) => {
        console.log(pins)
      })
      .then(()=> this.orbit.listPins())
      .then((pins) => console.log(pins))
      .catch((e) => console.error(e))
  },
  _pinToIpfs: function (hash) {
    logger.debug("--> Pin message: ", hash)
    this.orbit.pin(hash)
      .then((pins) => {
        console.log(pins)
      })
      .then(()=> this.orbit.listPins())
      .then((pins) => console.log(pins))
      .catch((e) => console.error(e))
  },
  _getCollectionsKey: function() {
    return `${this.username}.collections`
  },
  _save: function() {
    localStorage.setItem(this._getCollectionsKey(), JSON.stringify(this.collections))
  }
})

export default CollectionStore
