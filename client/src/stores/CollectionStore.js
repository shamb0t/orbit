'use strict'

import Reflux from 'reflux'
import UserStore from 'stores/UserStore'
import CollectionActions from 'actions/CollectionActions'
import Themes from 'app/Themes'

const appName = 'anonet.app'

const defaultCollections = {
  'default' : []
}

const CollectionStore = Reflux.createStore({
  listenables: [CollectionActions],
  init: function() {
    this.collections = []
    this.username = 'default'
    UserStore.listen((user) => {
      if(user) {
        this.username = user.name
        this.loadCollections()
      }
    })
  },
  onInitialize: function(orbit) {
    this.orbit = orbit
  }
  loadCollections: function() {
    // Load from local storage
    this.collections = Object.assign({}, defaultCollections)
    const collections = JSON.parse(localStorage.getItem(this._getCollectionsKey())) || {}
    Object.assign(this.collections, collections)
    this._save() // Save the defaults for a new user
    this.trigger(this.collections)
  },
  onGet: function(callback) {
    callback(this.collections)
  },
  onAdd: function(collectionName, hash) {
    const collection = this.collections[collectionName] || []
    if (collection.indexOf(hash) < 0) {
      this.collections[collectionName] = collection.concat(hash)
      this._save()
      this.trigger(this.collections)
    }
  },
  onDel: function(collection, hash) {
    const storeCollection = this.collections[collection]
    const filtered = storeCollection.filter((e) => e !== hash)
    this.collections[collection] = filtered
    Object.assign(this.collections, collections)
    this.collections[collection] = filtered
    this._save()
  },
  _getCollectionsKey: function() {
    return `${appName}.${this.username}.collections`
  },
  _save: function() {
    localStorage.setItem(this._getCollectionsKey(), JSON.stringify(this.collections))
  }
})

export default CollectionStore
