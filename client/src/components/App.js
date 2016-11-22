'use strict'

import _ from 'lodash'
import React from 'react'
import { render } from 'react-dom'
import { Router, Route, hashHistory } from 'react-router'
import Logger from 'logplease'

import Orbit from '../../../src/Orbit'

import fs from 'fs'

import AppActions from 'actions/AppActions'
import UIActions from "actions/UIActions"
import SocketActions from 'actions/SocketActions'
import NetworkActions from 'actions/NetworkActions'
import NotificationActions from 'actions/NotificationActions'
import ChannelActions from 'actions/ChannelActions'
import SkynetActions from 'actions/SkynetActions'

import AppStateStore from 'stores/AppStateStore'
import UserStore from 'stores/UserStore'
import UserActions from 'actions/UserActions'
import NetworkStore from 'stores/NetworkStore'
import ChannelStore from 'stores/ChannelStore'
import MessageStore from 'stores/MessageStore'
import UsersStore from 'stores/UsersStore'
import SettingsStore from 'stores/SettingsStore'
import SwarmStore from 'stores/SwarmStore'

import ChannelsPanel from 'components/ChannelsPanel'
import ChannelView from 'components/ChannelView'
import SettingsView from 'components/SettingsView'
import SwarmView from 'components/SwarmView'
import CollectionView from 'components/CollectionView'
import LoginView from 'components/LoginView'
import Header from 'components/Header'
import Themes from 'app/Themes'

import 'normalize.css'
import '../styles/main.css'
import 'styles/App.scss'
import 'styles/Scrollbars.scss'
import 'highlight.js/styles/atom-one-dark.css'
// Agate, Atom One Dark, Github, Monokai, Monokai Sublime, Vs, Xcode

Logger.setLogLevel(window.DEV ? 'DEBUG' : 'NONE')

const logger = Logger.create('App', { color: Logger.Colors.Red })

const views = {
  "Index": "/",
  "Settings": "/settings",
  "Swarm": "/swarm",
  "Connect": "/connect",
  "Channel": "/channel/",
  "Collection" :"/collection/"
}

const hasIPFS = !!window.ipfsInstance
console.log("hasIPFS:", hasIPFS)
let orbit// = hasIPFS ? window.orbit : null

// fs.init(1 * 1024 * 1024, (err) => {
//   if(err) {
//     logger.error("Couldn't initialize file system:", err)
//   } else {
//     logger.debug("FileSystem initialized")
//   }
// })

var App = React.createClass({
  getInitialState: function() {
    return {
      panelOpen: false,
      leftSidePanel: false,
      user: null,
      location: null,
      joiningToChannel: null,
      requirePassword: false,
      theme: null,
      networkName: "Unknown Network"
    }
  },
  componentDidMount: function() {
    const signalServerAddress = this.props.location.query.local ? '0.0.0.0' : '178.62.241.75'
    const ipfsApi = hasIPFS ? window.ipfsInstance : null // spawn js-ipfs here if needed
    const ipcRenderer = hasIPFS ? window.ipcRenderer : null
    // const dataPath = '/tmp/orbit-demo-2-'
    // const orbit = window.orbit

    orbit = new Orbit(ipfsApi)
    // return ipfsApiInstance.id()
    //   .then((id) => {
    //     logger.log(id);
    //     return { orbit: orbit, peerId: id };
    //   });

    // Main.start(ipfsApi, dataPath, signalServerAddress).then((res) => {
      logger.info("Orbit acquired")
      // logger.debug("PeerId:", res.peerId.ID)

      // orbit = res.orbit

      if(hasIPFS && ipcRenderer) {
        orbit.events.on('connected', (network, user) => ipcRenderer.send('connected', network, user))
        orbit.events.on('disconnected', () => ipcRenderer.send('disconnected'))
      }

      AppActions.initialize(orbit)
      NetworkActions.updateNetwork(null) // start the App
    // })
    // .catch((e) => {
    //   logger.error(e.message)
    //   logger.error("Stack trace:\n", e.stack)
    // })

    document.title = 'Orbit'

    UIActions.joinChannel.listen(this.joinChannel)
    NetworkActions.joinedChannel.listen(this.onJoinedChannel)
    NetworkActions.joinChannelError.listen(this.onJoinChannelError)
    NetworkActions.leaveChannel.listen(this.onLeaveChannel)
    SocketActions.socketDisconnected.listen(this.onDaemonDisconnected)

    this.unsubscribeFromNetworkStore = NetworkStore.listen(this.onNetworkUpdated)
    this.unsubscribeFromUserStore = UserStore.listen(this.onUserUpdated)
    this.stopListeningAppState = AppStateStore.listen(this._handleAppStateChange)
    this.unsubscribeFromSettingsStore = SettingsStore.listen((settings) => {
      this.setState({ theme: Themes[settings.theme] || null, leftSidePanel: settings.leftSidePanel })
    })

    window.onblur = () => {
      // AppActions.windowLostFocus()
      // logger.debug("Lost focus!")
    }

    window.onfocus = () => {
      // AppActions.windowOnFocus()
      // logger.debug("Got focus!")
    }
  },
  _handleAppStateChange: function(state) {
    let prefix = '', suffix = ''

    if(!AppStateStore.state.hasFocus && AppStateStore.state.unreadMessages[AppStateStore.state.currentChannel] > 0)
      suffix = `(${AppStateStore.state.unreadMessages[AppStateStore.state.currentChannel]})`

    if(Object.keys(state.unreadMessages).length > 1 || (Object.keys(state.unreadMessages).length === 1 && !Object.keys(state.unreadMessages).includes(AppStateStore.state.currentChannel)))
      prefix = '*'

    if(Object.keys(state.mentions).length > 0)
      prefix = '!'

    if(state.currentChannel) {
      document.title = prefix + ' ' + AppStateStore.state.location + ' ' + suffix
      this.goToLocation(state.currentChannel, views.Channel + encodeURIComponent(state.currentChannel))
    } else {
      document.title = prefix + ' Orbit'
      this.goToLocation(state.location, state.params ? views[state.location] + encodeURIComponent(state.params) : views[state.location])
    }
  },
  _reset: function() {
    if(hasIPFS) ipcRenderer.send('disconnected')
    this.setState(this.getInitialState())
  },
  onNetworkUpdated: function(network) {
    logger.debug("Network updated")
    console.log(network)
    if (!network) {
      this._reset()
      AppActions.setLocation("Connect")
    } else {
      this.setState({ networkName: network.name })
      const channels = this._getSavedChannels(this.state.networkName, this.state.user.name)
      channels.forEach((channel) => NetworkActions.joinChannel(channel.name, ''))
    }
  },
  _makeChannelsKey: function(username, networkName) {
    return "orbit.app." + username + "." + networkName + ".channels"
  },
  _getSavedChannels: function(networkName, username) {
    const channelsKey = this._makeChannelsKey(username, networkName)
    return JSON.parse(localStorage.getItem(channelsKey)) || []
  },
  _saveChannels: function(networkName, username, channels) {
    const channelsKey = this._makeChannelsKey(username, networkName)
    localStorage.setItem(channelsKey, JSON.stringify(channels))
  },
  _showConnectView: function() {
    this.setState({ user: null })
    AppActions.setLocation("Connect")
  },
  onUserUpdated: function(user) {
    logger.debug("User updated")
    console.log(user)

    if (!user) {
      AppActions.setLocation("Connect")
      return
    }

    if (user === this.state.user)
      return

    this.setState({ user: user })

    if (!this.state.panelOpen) this.openPanel()
    AppActions.setLocation(null)
  },
  joinChannel: function(channelName, password) {
    if (channelName === AppStateStore.state.currentChannel) {
      this.closePanel()
      return
    }
    logger.debug("Join channel #" + channelName)
    NetworkActions.joinChannel(channelName, password)
  },
  onJoinChannelError: function(channel, err) {
    if(!this.state.panelOpen) this.setState({ panelOpen: true })
    this.setState({ joiningToChannel: channel, requirePassword: true} )
  },
  onJoinedChannel: function(channel) {
    logger.debug("Joined channel #" + channel)
    // this.showChannel(channel)
    this.closePanel()
    document.title = `#${channel}`
    logger.debug("Set title: " + document.title)
    AppActions.setCurrentChannel(channel)
    let channels = this._getSavedChannels(this.state.networkName, this.state.user.name)
    if (!_.some(channels, { name: channel })) {
      channels.push({ name: channel })
      this._saveChannels(this.state.networkName, this.state.user.name, channels)
    }
  },
  onLeaveChannel: function(channel) {
    const { user, networkName } = this.state
    const channelsKey = this._makeChannelsKey(user.name, networkName)
    const channels = this._getSavedChannels(networkName, user.name).filter((c) => c.name !== channel)
    if (channels.length === 0)
      localStorage.removeItem(channelsKey)
    else
      this._saveChannels(this.state.networkName, this.state.user.name, channels)
  },
  openCollection: function(collectionName) {
    this.closePanel()
    AppActions.setLocation("Collection", collectionName)
  },
  openSettings: function() {
    this.closePanel()
    AppActions.setLocation("Settings")
  },
  openSwarmView: function() {
    this.closePanel()
    AppActions.setLocation("Swarm")
  },
  closePanel: function() {
    this.setState({ panelOpen: false })
    UIActions.onPanelClosed()
  },
  openPanel: function() {
    this.setState({ panelOpen: true })
  },
  disconnect: function() {
    orbit.disconnect()
    this.closePanel()
    NetworkActions.disconnect()
    this.setState({ user: null })
    AppActions.setLocation("Connect")
  },
  onDaemonDisconnected: function() {
    AppActions.setLocation("Connect")
  },
  goToLocation: function(name, url) {
    hashHistory.push(url ? url : '/')
  },
  render: function() {
    const header = AppStateStore.state.location && AppStateStore.state.location !== "Connect" ? (
      <Header
        onClick={this.openPanel}
        title={AppStateStore.state.location}
        channels={ChannelStore.channels}
        theme={this.state.theme}>
      </Header>
    ) : null

    const panel = this.state.panelOpen ? (
      <ChannelsPanel
        onClose={this.closePanel}
        onOpenSwarmView={this.openSwarmView}
        onOpenSettings={this.openSettings}
        onOpenCollection={this.openCollection}
        onDisconnect={this.disconnect}
        channels={ChannelStore.channels}
        currentChannel={AppStateStore.state.location}
        username={this.state.user ? this.state.user.name : ""}
        requirePassword={this.state.requirePassword}
        theme={this.state.theme}
        left={this.state.leftSidePanel}
        networkName={this.state.networkName}
        joiningToChannel={this.state.joiningToChannel}
      />
    ) : ""

    return (
      <div className="App view">
        {panel}
        {header}
        {this.props.children}
      </div>
    )
  }
})

/* MAIN */
render(
  <Router history={hashHistory}>
    <Route path="/" component={App}>
      <Route path="channel/:channel" component={ChannelView}/>
      <Route path="settings" component={SettingsView}/>
      <Route path="collection/:collection" component={CollectionView}/>
      <Route path="swarm" component={SwarmView}/>
      <Route path="connect" component={LoginView}/>
    </Route>
  </Router>
  , document.getElementById('content')
)

export default ChannelView
